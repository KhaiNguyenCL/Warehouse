import { Knex } from 'knex'
import { ListQuotationQuery } from './quotation.schema'

// Shape đã tính toán đầy đủ (line_total/vat_amount/subtotal/grand_total, is_reserved đã
// áp rule theo product_type) — service tính xong rồi mới truyền xuống đây, repository chỉ
// insert thô, không tính lại để tránh 2 nơi cùng giữ business logic.
export interface ComputedLineItem {
  variant_id?: string
  bundle_id?: string
  description?: string
  unit?: string
  quantity: number
  unit_price: number
  warranty?: string
  vat_percent: number
  vat_amount: number
  line_total: number
  is_reserved: boolean
  line_order: number
  note?: string
}

export interface ComputedSection {
  name: string
  section_order: number
  subtotal: number
  line_items: ComputedLineItem[]
}

export interface ComputedQuotation {
  company_id: string
  contact_id?: string
  project_name?: string
  delivery_location?: string
  warehouse_id?: string
  valid_days?: number
  terms?: string
  discount: number
  subtotal: number
  vat_total: number
  grand_total: number
  sections: ComputedSection[]
}

export class QuotationRepository {
  constructor(private db: Knex) {}

  // ─── Quotations ────────────────────────────────────────────────────────

  async findAll(query: ListQuotationQuery) {
    const { status, company_id, search, page = 1, limit = 20 } = query
    const offset = (page - 1) * limit

    const base = this.db('quotations as q')
      .leftJoin('companies as c', 'c.id', 'q.company_id')
      .leftJoin('users as u', 'u.id', 'q.created_by')

    if (status) base.where('q.status', status)
    if (company_id) base.where('q.company_id', company_id)
    if (search) {
      base.where((qb) => {
        qb.whereILike('q.code', `%${search}%`).orWhereILike('q.project_name', `%${search}%`)
      })
    }

    const [rows, countResult] = await Promise.all([
      base
        .clone()
        .select(
          'q.id', 'q.code', 'q.status', 'q.project_name',
          'q.subtotal', 'q.vat_total', 'q.discount', 'q.grand_total',
          'q.expired_at', 'q.created_at',
          'c.name as company_name',
          'u.full_name as created_by_name',
        )
        .orderBy('q.created_at', 'desc')
        .limit(limit)
        .offset(offset),
      base.clone().clearSelect().count('q.id as count').first(),
    ])

    return { data: rows, total: Number(countResult?.count ?? 0), page, limit }
  }

  async findById(id: string) {
    const quotation = await this.db('quotations as q')
      .leftJoin('companies as c', 'c.id', 'q.company_id')
      .leftJoin('contacts as ct', 'ct.id', 'q.contact_id')
      .leftJoin('warehouses as w', 'w.id', 'q.warehouse_id')
      .where('q.id', id)
      .select('q.*', 'c.name as company_name', 'ct.full_name as contact_name', 'w.name as warehouse_name')
      .first()

    if (!quotation) return null

    const sections = await this.db('quotation_sections').where({ quotation_id: id }).orderBy('section_order')

    const lineItems = await this.db('quotation_line_items as li')
      .leftJoin('variants as v', 'v.id', 'li.variant_id')
      .leftJoin('variants as bv', 'bv.id', 'li.bundle_id')
      .where('li.quotation_id', id)
      .select(
        'li.*',
        'v.sku as variant_sku', 'v.name as variant_name',
        'bv.sku as bundle_sku', 'bv.name as bundle_name',
      )
      .orderBy('li.line_order')

    const lineIds = lineItems.map((l: any) => l.id)
    const progress = lineIds.length ? await this.findLineProgress(lineIds) : new Map()

    const sectionsWithLines = sections.map((s: any) => ({
      ...s,
      line_items: lineItems
        .filter((l: any) => l.section_id === s.id)
        .map((l: any) => {
          const p = progress.get(l.id) ?? { exported_qty: 0, pending_qty: 0 }
          return {
            ...l,
            exported_qty: p.exported_qty,
            pending_qty: p.pending_qty,
            remaining_qty: Number(l.quantity) - p.exported_qty - p.pending_qty,
          }
        }),
    }))

    return { ...quotation, sections: sectionsWithLines }
  }

  // exported_qty (DO completed) + pending_qty (DO draft/pending_approval/approved) cho từng
  // quotation_line_item — dùng tính remaining_qty (CLAUDE.md mục 6, 16), khoá khi = 0.
  async findLineProgress(lineIds: string[]) {
    const rows = await this.db('delivery_order_lines as dl')
      .join('delivery_orders as d', 'd.id', 'dl.delivery_order_id')
      .whereIn('dl.quotation_line_item_id', lineIds)
      .groupBy('dl.quotation_line_item_id')
      .select(
        'dl.quotation_line_item_id',
        this.db.raw(
          `COALESCE(SUM(dl.quantity) FILTER (WHERE d.status = 'completed'), 0)::int as exported_qty`,
        ),
        this.db.raw(
          `COALESCE(SUM(dl.quantity) FILTER (WHERE d.status IN ('draft','pending_approval','approved')), 0)::int as pending_qty`,
        ),
      )

    const map = new Map<string, { exported_qty: number; pending_qty: number }>()
    for (const r of rows) {
      map.set(r.quotation_line_item_id, { exported_qty: r.exported_qty, pending_qty: r.pending_qty })
    }
    return map
  }

  async create(data: ComputedQuotation, userId: string, trx: Knex.Transaction) {
    const { sections, ...header } = data
    const [quotation] = await trx('quotations')
      .insert({ ...header, status: 'draft', created_by: userId })
      .returning('*')

    const insertedSections = []
    for (const section of sections) {
      const { line_items, ...sectionHeader } = section
      const [insertedSection] = await trx('quotation_sections')
        .insert({ ...sectionHeader, quotation_id: quotation.id })
        .returning('*')

      const insertedLines = line_items.length
        ? await trx('quotation_line_items')
            .insert(
              line_items.map((li) => ({
                ...li,
                quotation_id: quotation.id,
                section_id: insertedSection.id,
              })),
            )
            .returning('*')
        : []

      insertedSections.push({ ...insertedSection, line_items: insertedLines })
    }

    return { ...quotation, sections: insertedSections }
  }

  // Draft-only full replace: xoá sạch sections/line_items cũ rồi insert lại theo dữ liệu mới
  // (chỉ an toàn khi chưa Confirm — chưa có reserved_items/DO nào tham chiếu line cũ).
  async replaceSections(quotationId: string, sections: ComputedSection[], trx: Knex.Transaction) {
    await trx('quotation_line_items').where({ quotation_id: quotationId }).del()
    await trx('quotation_sections').where({ quotation_id: quotationId }).del()

    const insertedSections = []
    for (const section of sections) {
      const { line_items, ...sectionHeader } = section
      const [insertedSection] = await trx('quotation_sections')
        .insert({ ...sectionHeader, quotation_id: quotationId })
        .returning('*')

      const insertedLines = line_items.length
        ? await trx('quotation_line_items')
            .insert(
              line_items.map((li) => ({
                ...li,
                quotation_id: quotationId,
                section_id: insertedSection.id,
              })),
            )
            .returning('*')
        : []

      insertedSections.push({ ...insertedSection, line_items: insertedLines })
    }
    return insertedSections
  }

  async updateHeader(
    id: string,
    header: Partial<Omit<ComputedQuotation, 'sections'>>,
    trx: Knex.Transaction,
  ) {
    const [row] = await trx('quotations')
      .where({ id })
      .update({ ...header, updated_at: trx.fn.now() })
      .returning('*')
    return row
  }

  // expectedStatus nằm ngay trong WHERE — update atomic, tránh race condition khi 2 request
  // cùng lúc chuyển trạng thái (xem giải thích chi tiết ở receipt.repository.ts).
  async updateStatus(
    id: string,
    expectedStatus: string | string[],
    newStatus: string,
    extra: Record<string, unknown>,
    trx: Knex.Transaction,
  ) {
    const query = trx('quotations').where({ id })
    if (Array.isArray(expectedStatus)) query.whereIn('status', expectedStatus)
    else query.where('status', expectedStatus)

    const [updated] = await query
      .update({ status: newStatus, updated_at: trx.fn.now(), ...extra })
      .returning('*')
    return updated
  }

  lockForUpdate(id: string, trx: Knex.Transaction) {
    return trx('quotations').where({ id }).forUpdate().first()
  }

  // ─── Bundle expansion ─────────────────────────────────────────────────

  findBundleItems(bundleVariantId: string) {
    return this.db('bundle_items').where({ bundle_variant_id: bundleVariantId })
  }

  // ─── Inventory / reserved ──────────────────────────────────────────────

  findInventoryByVariants(variantIds: string[], warehouseId: string) {
    return this.db('inventory as i')
      .join('variants as v', 'v.id', 'i.variant_id')
      .whereIn('i.variant_id', variantIds)
      .andWhere('i.warehouse_id', warehouseId)
      .select('i.variant_id', 'i.qty_on_hand', 'i.qty_reserved', 'v.name as variant_name', 'v.sku')
  }

  // Tăng qty_reserved có điều kiện ngay trong WHERE (qty_on_hand đủ chỗ) — atomic, tránh
  // 2 quotation cùng confirm lúc cùng 1 sản phẩm vượt quá tồn kho thực tế.
  async incrementReserved(variantId: string, warehouseId: string, qty: number, trx: Knex.Transaction) {
    const affected = await trx('inventory')
      .where({ variant_id: variantId, warehouse_id: warehouseId })
      .andWhere('qty_on_hand', '>=', trx.raw('qty_reserved + ?::int', [qty]))
      .update({ qty_reserved: trx.raw('qty_reserved + ?::int', [qty]), last_updated: trx.fn.now() })
    return affected
  }

  async decrementReserved(variantId: string, warehouseId: string, qty: number, trx: Knex.Transaction) {
    await trx('inventory')
      .where({ variant_id: variantId, warehouse_id: warehouseId })
      .update({
        qty_reserved: trx.raw('GREATEST(qty_reserved - ?::int, 0)', [qty]),
        last_updated: trx.fn.now(),
      })
  }

  createReservedItem(
    row: {
      variant_id: string
      warehouse_id: string
      quantity: number
      source_type: string
      source_id: string
      quotation_line_item_id: string
    },
    trx: Knex.Transaction,
  ) {
    return trx('reserved_items').insert(row)
  }

  findReservedByQuotation(quotationId: string, trx: Knex.Transaction) {
    return trx('reserved_items').where({ source_type: 'quotation', source_id: quotationId })
  }

  deleteReservedByQuotation(quotationId: string, trx: Knex.Transaction) {
    return trx('reserved_items').where({ source_type: 'quotation', source_id: quotationId }).del()
  }
}
