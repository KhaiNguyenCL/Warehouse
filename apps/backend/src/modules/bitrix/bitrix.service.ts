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

  // CLAUDE.md mục 12: "Fetch từ Bitrix API (Company và Contact)" — import 1 company Bitrix
  // vào bảng companies nội bộ. Idempotent theo bitrix_company_id: gọi lại nhiều lần chỉ
  // update lại field, không tạo trùng.
  async importCompany(bitrixCompanyId: string) {
    const bxCompany = await this.app.bitrix.getCompany(bitrixCompanyId)
    const existing = await this.companyRepo.findByBitrixId(bitrixCompanyId)

    const companyType = String(bxCompany.COMPANY_TYPE ?? '').toUpperCase()
    const types: CompanyType[] = companyType.includes('SUPPLIER') ? ['supplier'] : ['customer']
    const phone = (bxCompany.PHONE as any[] | undefined)?.[0]?.VALUE
    const email = (bxCompany.EMAIL as any[] | undefined)?.[0]?.VALUE

    if (existing) {
      // CompanyRepository.update() trả về 1 object (không phải array) — khác với
      // create() trả về tuple từ .returning('*'), không destructure [updated] ở đây.
      return this.app.db.transaction((trx) =>
        this.companyRepo.update(
          existing.id,
          compact({ name: bxCompany.TITLE ?? existing.name, phone, email, types }),
          trx,
        ),
      )
    }

    // Bitrix không có khái niệm "code" nội bộ — sinh code từ ID Bitrix, admin có thể
    // đổi lại sau qua PATCH /companies/:id như company thường.
    const code = `BX-${bitrixCompanyId}`
    return this.app.db.transaction((trx) =>
      this.companyRepo.create(
        compact({
          code,
          name: bxCompany.TITLE ?? code,
          phone,
          email,
          types,
          bitrix_company_id: bitrixCompanyId,
        }) as any,
        trx,
      ),
    )
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

  private buildDealUrl(dealId: string) {
    const webhookUrl = process.env.BITRIX_WEBHOOK_URL
    if (!webhookUrl) return null
    const portalBase = webhookUrl.replace(/\/rest\/.*$/, '')
    return `${portalBase}/crm/deal/details/${dealId}/`
  }
}
