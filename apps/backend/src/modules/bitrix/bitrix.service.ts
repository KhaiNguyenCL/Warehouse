import { FastifyInstance } from 'fastify'
import { BitrixRepository } from './bitrix.repository'
import { CompanyRepository } from '../company/company.repository'
import { CompanyType } from '../company/company.schema'
import { MappingInput } from './bitrix.schema'

// Knex throw "Undefined binding(s) detected" nếu 1 key trong object insert/update có giá
// trị undefined (field Bitrix không tồn tại, vd PHONE/EMAIL rỗng) — lọc bỏ trước khi gọi
// repository, để cột đó giữ nguyên giá trị cũ (update) hoặc dùng DEFAULT của cột (insert).
function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>
}

// Chỉ những field TEXT, tự do sửa ở Draft mới được phép ghi đè từ Bitrix — không cho map
// vào field tính toán (subtotal/grand_total...), trạng thái, hay company_id/contact_id
// (việc liên kết company/contact theo bitrix_company_id là 1 bài toán resolve riêng,
// chưa nằm trong phạm vi sync field đơn giản này).
const ALLOWED_QUOTATION_FIELDS = ['project_name', 'delivery_location', 'terms']

export class BitrixService {
  private repo: BitrixRepository
  private companyRepo: CompanyRepository

  // Nhận FastifyInstance (không chỉ Knex) vì cần app.bitrix để gọi Bitrix REST API —
  // giống cách AuthService nhận app để dùng app.jwt, TemplateService nhận app để dùng app.carbone.
  constructor(private app: FastifyInstance) {
    this.repo = new BitrixRepository(app.db)
    // Dùng lại CompanyRepository (không tự viết insert/update companies/contacts ở đây)
    // để không trùng lặp logic company_types/is_primary đã có ở company module.
    this.companyRepo = new CompanyRepository(app.db)
  }

  listMappings() {
    return this.repo.findMappings()
  }

  async replaceMappings(mappings: MappingInput[]) {
    for (const m of mappings) {
      if (!ALLOWED_QUOTATION_FIELDS.includes(m.quotation_field)) {
        throw {
          statusCode: 400,
          message: `quotation_field "${m.quotation_field}" không được phép map — chỉ chấp nhận: ${ALLOWED_QUOTATION_FIELDS.join(', ')}`,
        }
      }
    }
    return this.app.db.transaction((trx) => this.repo.replaceMappings(mappings, trx))
  }

  getDeal(dealId: string) {
    return this.app.bitrix.getDeal(dealId)
  }

  // CLAUDE.md mục 13: "Bấm Sync lại → ghi đè toàn bộ field được map (không hỏi lại)".
  // Chỉ cho sync khi quotation còn Draft — cùng quy tắc với update() thường (mục 6).
  async syncQuotation(quotationId: string, dealIdInput?: string) {
    const quotation = await this.repo.findQuotationById(quotationId)
    if (!quotation) throw { statusCode: 404, message: 'Quotation not found' }
    if (quotation.status !== 'draft') {
      throw { statusCode: 400, message: 'Chỉ có thể đồng bộ Bitrix khi báo giá ở Draft' }
    }

    const dealId = dealIdInput ?? quotation.bitrix_deal_id
    if (!dealId) throw { statusCode: 400, message: 'Thiếu Bitrix Deal ID' }

    const deal = await this.app.bitrix.getDeal(dealId)
    const mappings = await this.repo.findMappings()

    const needCompany = mappings.some((m) => m.bitrix_object === 'company')
    const needContact = mappings.some((m) => m.bitrix_object === 'contact')
    const company = needCompany && deal.COMPANY_ID ? await this.app.bitrix.getCompany(deal.COMPANY_ID) : null
    const contact = needContact && deal.CONTACT_ID ? await this.app.bitrix.getContact(deal.CONTACT_ID) : null

    const sourceByObject: Record<string, Record<string, unknown> | null> = { deal, company, contact }

    const payload: Record<string, unknown> = {}
    for (const m of mappings) {
      const source = sourceByObject[m.bitrix_object]
      if (!source) continue
      payload[m.quotation_field] = source[m.bitrix_field] ?? null
    }

    const [updated] = await this.repo.updateQuotation(quotationId, {
      ...payload,
      bitrix_deal_id: dealId,
      bitrix_deal_url: this.buildDealUrl(dealId),
      bitrix_synced_at: this.app.db.fn.now(),
    })
    return updated
  }

  // CLAUDE.md mục 12: import 1 company Bitrix vào bảng companies nội bộ.
  // Dedup theo thứ tự ưu tiên:
  //   1. bitrix_company_id — đã import trước, gọi lại chỉ update
  //   2. tax_code (MST) — tạo thủ công rồi, gắn bitrix_company_id vào
  //   3. Không tìm thấy → tạo mới
  // Sau khi upsert company → tự động upsert Người đại diện thành primary contact.
  async importCompany(bitrixCompanyId: string) {
    bitrixCompanyId = String(bitrixCompanyId)   // normalize — caller có thể truyền number
    const bx = await this.app.bitrix.getCompany(bitrixCompanyId)

    // ── Map fields ──────────────────────────────────────────────────────────
    const str = (f: string) => ((bx[f] as string | undefined) ?? '').trim() || undefined

    const name       = str('UF_CRM_1666348132682') ?? bx.TITLE?.trim() ?? `BX-${bitrixCompanyId}`
    const code       = str('UF_CRM_1666346470460')
    const taxCode    = str('UF_CRM_1665716572711')
    const address    = str('UF_CRM_1666348162912')
    const email      = str('UF_CRM_1666348221731')
    const bankAccount = str('UF_CRM_1665716907464')
    const bankName   = str('UF_CRM_1665716963770')
    const phone      = (bx.PHONE as any[] | undefined)?.[0]?.VALUE as string | undefined

    const bxType = String(bx.COMPANY_TYPE ?? '').toUpperCase()
    const types: CompanyType[] = bxType === 'SUPPLIER' ? ['supplier'] : ['customer']

    const repName     = str('UF_CRM_1666349520942')
    const repPosition = str('UF_CRM_1666349549274')

    // ── Dedup ───────────────────────────────────────────────────────────────
    let existing = await this.companyRepo.findByBitrixId(bitrixCompanyId)
    if (!existing && taxCode && taxCode !== '0') {
      const byTax = await this.companyRepo.findByTaxCode(taxCode)
      // Chỉ merge qua tax_code nếu company WMS đó CHƯA link tới Bitrix ID nào khác.
      // Nếu đã có bitrix_company_id khác → không override, tạo mới.
      if (byTax && (!byTax.bitrix_company_id || byTax.bitrix_company_id === bitrixCompanyId)) {
        existing = byTax
      }
    }

    // ── Upsert company ──────────────────────────────────────────────────────
    // Company đã bị khoá sync → không ghi đè, trả về nguyên bản
    if (existing?.sync_locked) return existing

    const payload = compact({ name, code, phone, email, address, bank_account: bankAccount, bank_name: bankName, tax_code: taxCode, types, bitrix_company_id: bitrixCompanyId })

    let company: any
    if (existing) {
      company = await this.app.db.transaction((trx) =>
        this.companyRepo.update(existing.id, payload, trx),
      )
      company = { ...existing, ...company }
    } else {
      try {
        company = await this.app.db.transaction((trx) =>
          this.companyRepo.create(payload as any, trx),
        )
      } catch (err: any) {
        // Trùng code (2 chi nhánh cùng mã khách hàng trong Bitrix) → dùng code-BxID để phân biệt
        if (err.constraint === 'companies_code_key' && code) {
          const fallback = { ...payload, code: `${code}-${bitrixCompanyId}` }
          company = await this.app.db.transaction((trx) =>
            this.companyRepo.create(fallback as any, trx),
          )
        } else {
          throw err
        }
      }
    }

    // ── Upsert người đại diện → primary contact ─────────────────────────────
    if (repName) await this.upsertRepresentative(company.id, repName, repPosition)

    return company
  }

  // Người đại diện lưu dưới dạng field trên company Bitrix (không phải Contact object riêng)
  // → không có bitrix_contact_id, dedup bằng cách tìm primary contact hiện tại của company.
  private async upsertRepresentative(companyId: string, fullName: string, position?: string) {
    const primary = await this.app.db('contacts').where({ company_id: companyId, is_primary: true }).first()
    await this.app.db.transaction(async (trx) => {
      if (primary) {
        await this.companyRepo.updateContact(primary.id, compact({ full_name: fullName, position }), trx)
      } else {
        await this.companyRepo.addContact(companyId, compact({ full_name: fullName, position, is_primary: true }) as any, trx)
      }
    })
  }

  // Cần company nội bộ để gắn contact vào (contacts.company_id NOT NULL) — ưu tiên
  // company_id truyền vào, nếu không có thì tự resolve qua deal.COMPANY_ID -> bitrix_company_id
  // (yêu cầu company đó đã được import trước bằng importCompany()).
  async importContact(bitrixContactId: string, companyIdOverride?: string) {
    const bxContact = await this.app.bitrix.getContact(bitrixContactId)

    let companyId = companyIdOverride
    if (!companyId && bxContact.COMPANY_ID) {
      const company = await this.companyRepo.findByBitrixId(String(bxContact.COMPANY_ID))
      companyId = company?.id
    }
    if (!companyId) {
      throw {
        statusCode: 400,
        message: 'Không xác định được company nội bộ cho contact này — import company trước hoặc truyền company_id',
      }
    }

    const full_name = [bxContact.NAME, bxContact.LAST_NAME].filter(Boolean).join(' ').trim() || `Bitrix Contact ${bitrixContactId}`
    const phone = (bxContact.PHONE as any[] | undefined)?.[0]?.VALUE
    const email = (bxContact.EMAIL as any[] | undefined)?.[0]?.VALUE
    const position = bxContact.POST as string | undefined

    const existing = await this.companyRepo.findContactByBitrixId(bitrixContactId)
    if (existing) {
      return this.app.db.transaction((trx) =>
        this.companyRepo.updateContact(existing.id, compact({ full_name, phone, email, position }), trx),
      )
    }

    return this.app.db.transaction((trx) =>
      this.companyRepo.addContact(
        companyId!,
        compact({ full_name, phone, email, position, bitrix_contact_id: bitrixContactId }) as any,
        trx,
      ),
    )
  }

  // ─── Sync companies from Bitrix ──────────────────────────────────────────

  // mapBxFields: tái sử dụng cùng logic field mapping với importCompany, để preview
  // và apply đều ra kết quả nhất quán.
  private mapBxCompany(bx: any) {
    const str = (f: string) => ((bx[f] as string | undefined) ?? '').trim() || undefined
    const name       = str('UF_CRM_1666348132682') ?? bx.TITLE?.trim() ?? `BX-${bx.ID}`
    const code       = str('UF_CRM_1666346470460')
    const tax_code   = str('UF_CRM_1665716572711')
    const address    = str('UF_CRM_1666348162912')
    const email      = str('UF_CRM_1666348221731')
    const bank_account = str('UF_CRM_1665716907464')
    const bank_name  = str('UF_CRM_1665716963770')
    const rep_name   = str('UF_CRM_1666349520942')
    const phone      = (bx.PHONE as any[] | undefined)?.[0]?.VALUE as string | undefined
    const bxType     = String(bx.COMPANY_TYPE ?? '').toUpperCase()
    const types      = bxType === 'SUPPLIER' ? ['supplier'] : ['customer']
    return { name, code, tax_code, address, email, bank_account, bank_name, phone, types, rep_name }
  }

  private diffBxVsWms(wms: any, bxMapped: any) {
    const FIELDS = ['name', 'phone', 'email', 'tax_code', 'address', 'bank_account', 'bank_name'] as const
    return FIELDS
      .filter((f) => {
        const bxVal = (bxMapped as any)[f] ?? null
        // Bitrix field trống → không coi là thay đổi, giữ nguyên giá trị WMS.
        // (compact() trong importCompany cũng bỏ qua undefined → DB sẽ không bị xóa)
        if (bxVal === null) return false
        return (wms[f] ?? null) !== bxVal
      })
      .map((f) => ({ field: f, old: wms[f] ?? null, new: (bxMapped as any)[f] ?? null }))
  }

  async syncCompaniesPreview() {
    const bxList = await this.app.bitrix.listAllCompanies()

    const [withBxId, withTaxNoLink] = await Promise.all([
      this.app.db('companies').whereNotNull('bitrix_company_id')
        .select('id', 'code', 'name', 'phone', 'email', 'tax_code', 'address', 'bank_account', 'bank_name', 'bitrix_company_id', 'sync_locked'),
      this.app.db('companies').whereNotNull('tax_code').whereNull('bitrix_company_id')
        .whereNot('tax_code', '0')
        .select('id', 'code', 'name', 'phone', 'email', 'tax_code', 'address', 'bank_account', 'bank_name', 'bitrix_company_id', 'sync_locked'),
    ])

    const byBxId  = new Map<string, any>(withBxId.map((c: any) => [c.bitrix_company_id, c]))
    const byTax   = new Map<string, any>(withTaxNoLink.map((c: any) => [c.tax_code, c]))

    const new_companies: any[] = []
    const changed_companies: any[] = []
    let unchanged_count = 0
    let locked_count = 0

    for (const bx of bxList) {
      const bxId = String(bx.ID)
      const mapped = this.mapBxCompany(bx)
      const existing = byBxId.get(bxId) ?? (mapped.tax_code ? byTax.get(mapped.tax_code) : undefined)

      if (!existing) {
        new_companies.push({ bitrix_id: bxId, ...mapped })
      } else if (existing.sync_locked) {
        locked_count++
      } else {
        const changes = this.diffBxVsWms(existing, mapped)
        if (changes.length > 0) {
          changed_companies.push({ bitrix_id: bxId, wms_id: existing.id, wms_code: existing.code, name: existing.name, changes })
        } else {
          unchanged_count++
        }
      }
    }

    return { new_companies, changed_companies, unchanged_count, locked_count, total_bitrix: bxList.length }
  }

  async syncCompaniesApply(bitrixIds: string[]) {
    let synced = 0
    const errors: Array<{ bitrix_id: string; error: string }> = []

    for (const id of bitrixIds) {
      const strId = String(id)   // phòng trường hợp frontend gửi về number
      try {
        await this.importCompany(strId)
        synced++
      } catch (err: any) {
        errors.push({ bitrix_id: strId, error: err.message ?? String(err) })
      }
    }

    return { synced, errors }
  }

  private buildDealUrl(dealId: string) {
    const webhookUrl = process.env.BITRIX_WEBHOOK_URL
    if (!webhookUrl) return null
    const portalBase = webhookUrl.replace(/\/rest\/.*$/, '')
    return `${portalBase}/crm/deal/details/${dealId}/`
  }
}
