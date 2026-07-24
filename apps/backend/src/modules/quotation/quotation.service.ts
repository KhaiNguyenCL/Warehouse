import { Knex } from 'knex'
import { QuotationRepository, ComputedSection, ComputedLineItem } from './quotation.repository'
import { CreateQuotationBody, UpdateQuotationBody, ListQuotationQuery, QuotationSectionInput } from './quotation.schema'

const PG_FOREIGN_KEY_VIOLATION = '23503'

function mapDbError(err: any): never {
  if (err.code === PG_FOREIGN_KEY_VIOLATION) {
    throw { statusCode: 400, message: 'Tham chiếu không hợp lệ (company/contact/variant/warehouse không tồn tại)' }
  }
  throw err
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

function computeExpiredAt(quoteDate: string | Date | null | undefined, validDays: number | null | undefined): string | null {
  if (!quoteDate || validDays == null) return null
  const base = typeof quoteDate === 'string' ? quoteDate : quoteDate.toISOString().slice(0, 10)
  const d = new Date(base + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + Number(validDays))
  return d.toISOString().slice(0, 10)
}

// CLAUDE.md mục 16: line_total = quantity*unit_price; vat_amount = line_total*vat_percent/100;
// section.subtotal = SUM(line_total + vat_amount). serviceVariantIds dùng để ép is_reserved=false
// cho dòng service (mục 7: "Service luôn false, disabled") bất kể client gửi gì lên.
function computeSections(sections: QuotationSectionInput[], serviceVariantIds: Set<string>): ComputedSection[] {
  return sections.map((section, sIdx) => {
    const line_items: ComputedLineItem[] = section.line_items.map((li, lIdx) => {
      const line_total = round2(li.quantity * li.unit_price)
      const vat_percent = li.vat_percent ?? 0
      const vat_amount = round2(line_total * (vat_percent / 100))

      let is_reserved: boolean
      if (li.variant_id && serviceVariantIds.has(li.variant_id)) {
        is_reserved = false
      } else if (!li.variant_id && !li.bundle_id) {
        // Dòng mô tả tự do (không gắn variant/bundle) — không có gì để giữ chỗ trong kho.
        is_reserved = false
      } else {
        is_reserved = li.is_reserved ?? true
      }

      return {
        variant_id: li.variant_id,
        bundle_id: li.bundle_id,
        description: li.description,
        unit: li.unit,
        quantity: li.quantity,
        unit_price: li.unit_price,
        warranty: li.warranty,
        vat_percent,
        vat_amount,
        line_total,
        total_amount: round2(line_total + vat_amount),
        is_reserved,
        line_order: li.line_order ?? lIdx + 1,
        note: li.note,
      }
    })

    const subtotal = round2(line_items.reduce((sum, li) => sum + li.line_total + li.vat_amount, 0))

    return {
      name: section.name,
      section_order: section.section_order ?? sIdx + 1,
      subtotal,
      line_items,
    }
  })
}

export class QuotationService {
  private repo: QuotationRepository

  constructor(private db: Knex) {
    this.repo = new QuotationRepository(db)
  }

  // Service products (CLAUDE.md mục 7) không bao giờ được reserved — query trước để
  // computeSections() biết variant nào cần ép is_reserved=false.
  private async getServiceVariantIds(sections: QuotationSectionInput[]): Promise<Set<string>> {
    const variantIds = [
      ...new Set(sections.flatMap((s) => s.line_items.map((li) => li.variant_id).filter(Boolean))),
    ] as string[]
    if (variantIds.length === 0) return new Set()

    const rows = await this.db('variants as v')
      .join('products as p', 'p.id', 'v.product_id')
      .whereIn('v.id', variantIds)
      .andWhere('p.product_type', 'service')
      .pluck('v.id')
    return new Set(rows)
  }

  private async releaseReserved(quotationId: string, trx: Knex.Transaction) {
    const reservedRows = await this.repo.findReservedByQuotation(quotationId, trx)
    for (const r of reservedRows) {
      await this.repo.decrementReserved(r.variant_id, r.warehouse_id, r.quantity, trx)
    }
    await this.repo.deleteReservedByQuotation(quotationId, trx)
  }

  // ─── CRUD ──────────────────────────────────────────────────────────────

  list(query: ListQuotationQuery) {
    return this.repo.findAll(query)
  }

  async getById(id: string) {
    const quotation = await this.repo.findById(id)
    if (!quotation) throw { statusCode: 404, message: 'Quotation not found' }
    return quotation
  }

  async create(data: CreateQuotationBody, userId: string) {
    const serviceVariantIds = await this.getServiceVariantIds(data.sections)
    const sections = computeSections(data.sections, serviceVariantIds)
    const allLines = sections.flatMap((s) => s.line_items)
    const subtotal = round2(allLines.reduce((sum, li) => sum + li.line_total, 0))
    const vat_total = round2(allLines.reduce((sum, li) => sum + li.vat_amount, 0))
    const discount = data.discount ?? 0
    const grand_total = round2(subtotal + vat_total - discount)

    const computed = {
      company_id: data.company_id,
      contact_id: data.contact_id,
      quote_number: data.quote_number,
      quote_date: data.quote_date,
      project_name: data.project_name,
      delivery_location: data.delivery_location,
      warehouse_id: data.warehouse_id,
      valid_days: data.valid_days,
      terms: data.terms,
      note: data.note,
      discount,
      subtotal,
      vat_total,
      grand_total,
      expired_at: computeExpiredAt(data.quote_date, data.valid_days),
      bitrix_deal_id: data.bitrix_deal_id,
      sections,
    }

    try {
      return await this.db.transaction((trx) => this.repo.create(computed, userId, trx))
    } catch (err) {
      mapDbError(err)
    }
  }

  // Chỉ sửa được khi còn Draft — muốn sửa báo giá đã Confirm phải /unconfirm trước
  // (giống cách receipt/delivery/transfer không có endpoint "sửa", chỉ có status transition).
  async update(id: string, data: UpdateQuotationBody) {
    const existing = await this.repo.findById(id)
    if (!existing) throw { statusCode: 404, message: 'Quotation not found' }
    if (existing.status !== 'draft') {
      throw { statusCode: 400, message: 'Chỉ có thể sửa báo giá ở trạng thái Draft — gọi /unconfirm trước' }
    }

    const { sections, discount, ...rest } = data
    const header: Record<string, unknown> = {
      ...rest,
      expired_at: computeExpiredAt(
        data.quote_date ?? existing.quote_date,
        data.valid_days ?? existing.valid_days,
      ),
    }
    let computedSections: ComputedSection[] | undefined

    if (sections) {
      const serviceVariantIds = await this.getServiceVariantIds(sections)
      computedSections = computeSections(sections, serviceVariantIds)
      const allLines = computedSections.flatMap((s) => s.line_items)
      const subtotal = round2(allLines.reduce((sum, li) => sum + li.line_total, 0))
      const vat_total = round2(allLines.reduce((sum, li) => sum + li.vat_amount, 0))
      const finalDiscount = discount ?? Number(existing.discount)
      header.subtotal = subtotal
      header.vat_total = vat_total
      header.discount = finalDiscount
      header.grand_total = round2(subtotal + vat_total - finalDiscount)
    } else if (discount !== undefined) {
      header.discount = discount
      header.grand_total = round2(Number(existing.subtotal) + Number(existing.vat_total) - discount)
    }

    try {
      return await this.db.transaction(async (trx) => {
        const updated = await this.repo.updateHeader(id, header, trx)
        if (computedSections) {
          const sectionsResult = await this.repo.replaceSections(id, computedSections, trx)
          return { ...updated, sections: sectionsResult }
        }
        return updated
      })
    } catch (err) {
      mapDbError(err)
    }
  }

  // ─── State machine ─────────────────────────────────────────────────────

  async confirm(id: string) {
    const quotation = await this.repo.findById(id)
    if (!quotation) throw { statusCode: 404, message: 'Quotation not found' }
    if (quotation.status !== 'draft') throw { statusCode: 400, message: 'Chỉ có thể xác nhận từ Draft' }

    const allLines = quotation.sections.flatMap((s: any) => s.line_items)
    const reservedLines = allLines.filter((l: any) => l.is_reserved)

    if (reservedLines.length > 0 && !quotation.warehouse_id) {
      throw { statusCode: 400, message: 'Báo giá có dòng giữ chỗ — phải chọn kho (warehouse_id) trước khi xác nhận' }
    }

    // Bundle → expand thành sản phẩm con để reserved (CLAUDE.md mục 4, 7).
    const needed: Array<{ variant_id: string; quantity: number; quotation_line_item_id: string }> = []
    for (const line of reservedLines) {
      if (line.bundle_id) {
        const bundleItems = await this.repo.findBundleItems(line.bundle_id)
        for (const bi of bundleItems) {
          needed.push({
            variant_id: bi.item_variant_id,
            quantity: bi.quantity * Number(line.quantity),
            quotation_line_item_id: line.id,
          })
        }
      } else if (line.variant_id) {
        needed.push({ variant_id: line.variant_id, quantity: Number(line.quantity), quotation_line_item_id: line.id })
      }
    }

    if (needed.length > 0) {
      const neededByVariant = new Map<string, number>()
      for (const n of needed) {
        neededByVariant.set(n.variant_id, (neededByVariant.get(n.variant_id) ?? 0) + n.quantity)
      }
      const variantIds = [...neededByVariant.keys()]
      const inventories = await this.repo.findInventoryByVariants(variantIds, quotation.warehouse_id)
      const invByVariant = new Map(inventories.map((i: any) => [i.variant_id, i]))

      const shortfalls: string[] = []
      for (const [variantId, qty] of neededByVariant) {
        const inv: any = invByVariant.get(variantId)
        const available = inv ? inv.qty_on_hand - inv.qty_reserved : 0
        if (available < qty) {
          shortfalls.push(`${inv?.variant_name ?? variantId}: cần ${qty}, còn ${available}`)
        }
      }
      if (shortfalls.length > 0) {
        throw { statusCode: 400, message: `Không đủ tồn kho để giữ chỗ: ${shortfalls.join('; ')}` }
      }
    }

    // Dùng expired_at đã tính từ quote_date+valid_days lúc create/update; fallback tính lại nếu null
    const expiredAt = quotation.expired_at
      ?? computeExpiredAt(quotation.quote_date, quotation.valid_days)

    return this.db.transaction(async (trx) => {
      const confirmed = await this.repo.updateStatus(id, 'draft', 'confirmed', { expired_at: expiredAt }, trx)
      if (!confirmed) {
        throw { statusCode: 400, message: 'Báo giá đã được xử lý bởi 1 yêu cầu khác — vui lòng tải lại' }
      }

      for (const n of needed) {
        // Guard THẬT chống race condition: tăng qty_reserved có điều kiện ngay trong WHERE,
        // không dựa vào số đã check trước transaction (có thể đã đổi do request khác).
        const affected = await this.repo.incrementReserved(n.variant_id, quotation.warehouse_id, n.quantity, trx)
        if (!affected) {
          throw { statusCode: 409, message: 'Tồn kho vừa thay đổi ngay lúc xác nhận — vui lòng tải lại và thử lại' }
        }
        await this.repo.createReservedItem(
          {
            variant_id: n.variant_id,
            warehouse_id: quotation.warehouse_id,
            quantity: n.quantity,
            source_type: 'quotation',
            source_id: id,
            quotation_line_item_id: n.quotation_line_item_id,
          },
          trx,
        )
      }

      return confirmed
    })
  }

  // Chỉ người tạo báo giá HOẶC người có quyền quotation.confirm (Manager/Admin) mới được huỷ.
  async cancel(id: string, userId: string, roleId: string) {
    const quotation = await this.repo.findById(id)
    if (!quotation) throw { statusCode: 404, message: 'Quotation not found' }
    if (['cancelled', 'expired'].includes(quotation.status)) {
      throw { statusCode: 400, message: 'Không thể huỷ báo giá đã huỷ hoặc đã hết hạn' }
    }

    if (quotation.created_by !== userId) {
      const canConfirm = await this.db('role_permissions as rp')
        .join('permissions as p', 'p.id', 'rp.permission_id')
        .where('rp.role_id', roleId)
        .where('p.key', 'quotation.confirm')
        .first()
      if (!canConfirm) {
        throw { statusCode: 403, message: 'Chỉ người tạo báo giá hoặc người có quyền xác nhận mới được huỷ' }
      }
    }

    return this.db.transaction(async (trx) => {
      // SELECT FOR UPDATE để đọc status THẬT trong transaction (không dùng snapshot đã đọc
      // trước đó) — cần biết đúng status cũ để quyết định có giải phóng reserved hay không.
      const current = await this.repo.lockForUpdate(id, trx)
      if (!current) throw { statusCode: 404, message: 'Quotation not found' }
      if (!['draft', 'confirmed'].includes(current.status)) {
        throw { statusCode: 400, message: 'Không thể huỷ báo giá đã huỷ hoặc đã hết hạn' }
      }

      const cancelled = await this.repo.updateStatus(id, current.status, 'cancelled', {}, trx)
      if (current.status === 'confirmed') {
        await this.releaseReserved(id, trx)
      }
      return cancelled
    })
  }

  // Đánh dấu hết hạn (manual trigger) — tự động hoá qua cron job theo expired_at là
  // việc của infra/scheduler, chưa nằm trong phạm vi module này.
  async expire(id: string) {
    return this.db.transaction(async (trx) => {
      const current = await this.repo.lockForUpdate(id, trx)
      if (!current) throw { statusCode: 404, message: 'Quotation not found' }
      if (current.status !== 'confirmed') {
        throw { statusCode: 400, message: 'Chỉ có thể đánh dấu hết hạn từ Confirmed' }
      }
      const expired = await this.repo.updateStatus(id, 'confirmed', 'expired', {}, trx)
      await this.releaseReserved(id, trx)
      return expired
    })
  }

  // Confirmed → Draft để sửa (CLAUDE.md mục 6: "sửa Confirmed → về Draft: reserved giải
  // phóng, không sửa SL đã xuất") — chặn hẳn nếu đã có DO liên quan (xuất rồi hoặc đang
  // chờ xử lý) để không phải xử lý việc sửa 1 phần dòng đã cam kết với DO khác.
  async unconfirm(id: string) {
    const quotation = await this.repo.findById(id)
    if (!quotation) throw { statusCode: 404, message: 'Quotation not found' }
    if (quotation.status !== 'confirmed') {
      throw { statusCode: 400, message: 'Chỉ có thể chuyển về Draft từ Confirmed' }
    }

    const hasActiveDO = quotation.sections.some((s: any) =>
      s.line_items.some((l: any) => l.exported_qty > 0 || l.pending_qty > 0),
    )
    if (hasActiveDO) {
      throw {
        statusCode: 400,
        message: 'Không thể chuyển về Draft khi đang có phiếu xuất liên quan (đã xuất hoặc đang chờ xử lý)',
      }
    }

    return this.db.transaction(async (trx) => {
      const current = await this.repo.lockForUpdate(id, trx)
      if (!current || current.status !== 'confirmed') {
        throw { statusCode: 400, message: 'Báo giá đã được xử lý bởi 1 yêu cầu khác — vui lòng tải lại' }
      }
      const updated = await this.repo.updateStatus(id, 'confirmed', 'draft', {}, trx)
      await this.releaseReserved(id, trx)
      return updated
    })
  }
}
