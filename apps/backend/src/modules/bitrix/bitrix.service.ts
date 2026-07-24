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

// Chỉ những field được phép ghi đè từ Bitrix — không cho map vào field tính toán
// (subtotal/grand_total...) hay trạng thái.
// company_id / contact_id được resolve đặc biệt (Bitrix ID → WMS UUID) trong syncQuotation.
const ALLOWED_QUOTATION_FIELDS = [
  'company_id', 'contact_id', 'quote_number', 'quote_date',
  'project_name', 'delivery_location', 'warehouse_id',
  'valid_days', 'discount', 'terms', 'note', 'bitrix_deal_id',
]

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

  // Fetch deal rồi resolve COMPANY_ID/CONTACT_ID sang WMS company/contact.
  // Nếu contact chưa có bitrix_contact_id trong WMS → tự import luôn (idempotent).
  // Dùng cho form tạo PO: nhập Deal ID → auto-fill NCC + người liên hệ.
  async resolveDeal(dealId: string) {
    const deal = await this.app.bitrix.getDeal(dealId)

    const company = deal.COMPANY_ID
      ? await this.companyRepo.findByBitrixId(String(deal.COMPANY_ID))
      : null

    let contact = null
    if (deal.CONTACT_ID) {
      const bxContactId = String(deal.CONTACT_ID)
      contact = await this.companyRepo.findContactByBitrixId(bxContactId)
      if (!contact) {
        // Contact chưa import → import on-the-fly, gắn vào company nếu đã resolve được
        try {
          contact = await this.importContact(bxContactId, company?.id)
        } catch {
          // Import thất bại (VD: company chưa có trong WMS) — bỏ qua, không block
        }
      }
    }

    // Enum ID → label cho UF_CRM_1659681090 (Khu vực).
    // Nguồn: crm.deal.userfield.list, field UF_CRM_1659681090, LIST[].
    const REGION_MAP: Record<string, string> = {
      '85': 'Hồ Chí Minh', '86': 'Hà Nội', '164': 'Đồng Nai (Biên Hòa)',
      '113': 'Bình Dương', '174': 'Bình Định', '158': 'Phú Quốc',
      '166': 'Lâm Đồng (Đà Lạt)', '109': 'Khánh Hòa (Nha Trang)', '87': 'Đà Nẵng',
      '112': 'Hội An', '110': 'Hải Phòng', '169': 'Lào Cai (Sapa)',
      '168': 'Huế', '167': 'Quảng Ninh (Hạ Long)', '111': 'Hưng Yên',
      '160': 'VIETNAM', '161': 'CAMBODIA', '176': 'Tiền Giang',
      '177': 'An Giang', '180': 'Long An', '181': 'Ninh Bình',
      '234': 'Nghệ An', '182': 'Tây Ninh', '186': 'Đồng Nai', '188': 'Hà Tĩnh',
    }

    const regionId    = deal['UF_CRM_1659681090'] as string | undefined
    const contractRaw = deal['UF_CRM_1659680859'] as string | undefined
    const addressRaw  = deal['UF_CRM_1659680918'] as string | undefined

    // BEGINDATE/CLOSEDATE là ISO datetime — chỉ lấy phần date (YYYY-MM-DD)
    const toDate = (v: unknown) => typeof v === 'string' ? v.slice(0, 10) : null

    return {
      bitrix_company_id:  deal.COMPANY_ID ? String(deal.COMPANY_ID) : null,
      bitrix_contact_id:  deal.CONTACT_ID ? String(deal.CONTACT_ID) : null,
      company:            company ? { id: company.id, name: company.name } : null,
      contact:            contact ? { id: contact.id, full_name: contact.full_name } : null,
      deal_title:         (deal.TITLE as string | undefined) || null,
      deal_amount:        deal.OPPORTUNITY ? Number(deal.OPPORTUNITY) : null,
      deal_url:           this.buildDealUrl(dealId),
      contract_number:    contractRaw?.trim() || null,
      region:             (regionId && REGION_MAP[regionId]) || null,
      delivery_location:  addressRaw?.trim() || null,
      start_date:         toDate(deal.BEGINDATE),
      end_date:           toDate(deal.CLOSEDATE),
    }
  }

  // CLAUDE.md mục 13: "Bấm Sync lại → ghi đè toàn bộ field được map (không hỏi lại)".
  // Chỉ cho sync khi quotation còn Draft — cùng quy tắc với update() thường (mục 6).
  //
  // Preview những gì sync sẽ điền vào quotation (không update DB).
  // Trả về array { quotation_field, raw_value, resolved_value, skipped, reason }
  async previewSync(dealId: string) {
    const [deal, mappings, userFields] = await Promise.all([
      this.app.bitrix.getDeal(dealId),
      this.repo.findMappings(),
      this.app.bitrix.getDealUserFields(),
    ])

    const enumLookup = new Map<string, Map<string, string>>()
    for (const uf of userFields) {
      if (uf.USER_TYPE_ID === 'enumeration' && uf.LIST?.length) {
        enumLookup.set(uf.FIELD_NAME, new Map(uf.LIST.map((o) => [String(o.ID), String(o.VALUE)])))
      }
    }

    // form_value = giá trị thực sự dùng để set vào form (UUID cho company/contact)
    // resolved_value = human-readable để hiển thị trong bảng preview
    const rows: Array<{ quotation_field: string; bitrix_field: string; raw_value: unknown; resolved_value: unknown; form_value: unknown; skipped: boolean; reason?: string }> = []

    for (const m of mappings) {
      if (m.quotation_field === 'company_id') {
        const bxId = deal.COMPANY_ID ? String(deal.COMPANY_ID) : null
        if (!bxId) { rows.push({ quotation_field: 'company_id', bitrix_field: 'COMPANY_ID', raw_value: null, resolved_value: null, form_value: null, skipped: true, reason: 'Deal không có COMPANY_ID' }); continue }
        const wms = await this.companyRepo.findByBitrixId(bxId)
        rows.push({ quotation_field: 'company_id', bitrix_field: 'COMPANY_ID', raw_value: bxId, resolved_value: wms ? `${wms.name} (${wms.id})` : null, form_value: wms?.id ?? null, skipped: !wms, reason: wms ? undefined : 'Company chưa được import vào WMS' })
      } else if (m.quotation_field === 'contact_id') {
        const bxId = deal.CONTACT_ID ? String(deal.CONTACT_ID) : null
        if (!bxId) { rows.push({ quotation_field: 'contact_id', bitrix_field: 'CONTACT_ID', raw_value: null, resolved_value: null, form_value: null, skipped: true, reason: 'Deal không có CONTACT_ID' }); continue }
        const wms = await this.companyRepo.findContactByBitrixId(bxId)
        rows.push({ quotation_field: 'contact_id', bitrix_field: 'CONTACT_ID', raw_value: bxId, resolved_value: wms ? `${wms.full_name} (${wms.id})` : null, form_value: wms?.id ?? null, skipped: !wms, reason: wms ? undefined : 'Contact chưa được import vào WMS' })
      } else {
        const source: Record<string, unknown> = m.bitrix_object === 'deal' ? deal : {}
        let raw: unknown = source[m.bitrix_field]
        if (Array.isArray(raw)) raw = raw[0] ?? null
        if (raw !== null && typeof raw === 'object' && 'VALUE' in (raw as any)) raw = (raw as any).VALUE ?? null
        if (raw === null || raw === undefined || raw === '') {
          rows.push({ quotation_field: m.quotation_field, bitrix_field: m.bitrix_field, raw_value: raw ?? null, resolved_value: null, form_value: null, skipped: true, reason: 'Field trống trong Deal Bitrix' })
          continue
        }
        const strVal = String(raw)
        const resolved = enumLookup.has(m.bitrix_field) ? (enumLookup.get(m.bitrix_field)!.get(strVal) ?? raw) : raw
        rows.push({ quotation_field: m.quotation_field, bitrix_field: m.bitrix_field, raw_value: raw, resolved_value: resolved, form_value: resolved, skipped: false })
      }
    }

    return { deal_id: dealId, deal_title: deal.TITLE, rows }
  }

  // Xử lý đặc biệt:
  // - company_id: resolve Bitrix COMPANY_ID → WMS UUID qua bitrix_company_id
  // - contact_id: resolve Bitrix CONTACT_ID → WMS UUID (import on-the-fly nếu chưa có)
  // - Enum/list fields (UF_CRM_*): resolve numeric ID → label qua crm.deal.userfield.list
  async syncQuotation(quotationId: string, dealIdInput?: string) {
    const quotation = await this.repo.findQuotationById(quotationId)
    if (!quotation) throw { statusCode: 404, message: 'Quotation not found' }
    if (quotation.status !== 'draft') {
      throw { statusCode: 400, message: 'Chỉ có thể đồng bộ Bitrix khi báo giá ở Draft' }
    }

    const dealId = dealIdInput ?? quotation.bitrix_deal_id
    if (!dealId) throw { statusCode: 400, message: 'Thiếu Bitrix Deal ID' }

    const [deal, mappings, userFields] = await Promise.all([
      this.app.bitrix.getDeal(dealId),
      this.repo.findMappings(),
      this.app.bitrix.getDealUserFields(),
    ])

    // Build ID→label lookup for enumeration-type UF fields
    const enumLookup = new Map<string, Map<string, string>>()
    for (const uf of userFields) {
      if (uf.USER_TYPE_ID === 'enumeration' && uf.LIST?.length) {
        enumLookup.set(uf.FIELD_NAME, new Map(uf.LIST.map((o) => [String(o.ID), String(o.VALUE)])))
      }
    }

    // Fetch Bitrix company/contact objects only if mappings actually need them for
    // non-special fields (company_id/contact_id are handled separately below)
    const needBxCompany = mappings.some((m) => m.bitrix_object === 'company' && m.quotation_field !== 'company_id')
    const needBxContact = mappings.some((m) => m.bitrix_object === 'contact' && m.quotation_field !== 'contact_id')
    const [bxCompany, bxContact] = await Promise.all([
      needBxCompany && deal.COMPANY_ID ? this.app.bitrix.getCompany(String(deal.COMPANY_ID)) : Promise.resolve(null),
      needBxContact && deal.CONTACT_ID ? this.app.bitrix.getContact(String(deal.CONTACT_ID)) : Promise.resolve(null),
    ])
    const sourceByObject: Record<string, Record<string, unknown> | null> = { deal, company: bxCompany, contact: bxContact }

    const payload: Record<string, unknown> = {}

    for (const m of mappings) {
      if (m.quotation_field === 'company_id') {
        // Resolve Bitrix COMPANY_ID → WMS UUID; skip if not found (don't nullify existing link)
        const bxCompanyId = deal.COMPANY_ID ? String(deal.COMPANY_ID) : null
        if (bxCompanyId) {
          const wmsCompany = await this.companyRepo.findByBitrixId(bxCompanyId)
          if (wmsCompany) payload.company_id = wmsCompany.id
        }
      } else if (m.quotation_field === 'contact_id') {
        // Resolve Bitrix CONTACT_ID → WMS UUID; import on-the-fly if needed
        const bxContactId = deal.CONTACT_ID ? String(deal.CONTACT_ID) : null
        if (bxContactId) {
          let wmsContact = await this.companyRepo.findContactByBitrixId(bxContactId)
          if (!wmsContact) {
            try {
              const wmsCompany = deal.COMPANY_ID ? await this.companyRepo.findByBitrixId(String(deal.COMPANY_ID)) : null
              wmsContact = await this.importContact(bxContactId, wmsCompany?.id)
            } catch {
              // import failed (company not in WMS yet) — skip, don't nullify existing link
            }
          }
          if (wmsContact) payload.contact_id = wmsContact.id
        }
      } else {
        const source = sourceByObject[m.bitrix_object]
        if (!source) continue
        let raw: unknown = source[m.bitrix_field]
        // Bitrix đôi khi trả enum value dưới dạng array — lấy phần tử đầu
        if (Array.isArray(raw)) raw = raw[0] ?? null
        // Money/currency type trả về object { VALUE, CURRENCY } — lấy VALUE
        if (raw !== null && typeof raw === 'object' && 'VALUE' in (raw as any)) {
          raw = (raw as any).VALUE ?? null
        }
        // Bỏ qua nếu không có giá trị — không ghi null đè lên field hiện tại
        if (raw === null || raw === undefined || raw === '') continue
        let value: unknown = raw
        // Resolve enum ID → label
        const strVal = String(raw)
        if (enumLookup.has(m.bitrix_field)) {
          value = enumLookup.get(m.bitrix_field)!.get(strVal) ?? raw
        }
        payload[m.quotation_field] = value
      }
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
