import { Knex } from 'knex'
import { generateDocumentCode } from '../../lib/generateDocumentCode'
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
  total_amount: number
  is_reserved: boolean
  line_order: number
  note?: string
}

export interface ComputedSubSection {
  name: string
  product_id?: string
  sub_section_order: number
  line_items: ComputedLineItem[]
}

export interface ComputedSection {
  name: string
  section_order: number
  subtotal: number
  sub_sections: ComputedSubSection[]
  line_items: ComputedLineItem[]  // free lines (no sub-section)
}

export interface ComputedQuotation {
  company_id: string
  contact_id?: string
  quote_number?: string
  quote_date?: string
  project_name?: string
  delivery_location?: string
  warehouse_id?: string
  valid_days?: number
  terms?: string
  note?: string
  discount: number
  subtotal: number
  vat_total: number
  grand_total: number
  bitrix_deal_id?: string
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
      .select('q.*', 'c.name as company_name', 'ct.full_name as contact_name', 'ct.email as contact_email', 'ct.phone as contact_phone', 'w.name as warehouse_name')
      .first()

    if (!quotation) return null

    const sections = await this.db('quotation_sections').where({ quotation_id: id }).orderBy('section_order')

    const subSections = await this.db('quotation_sub_sections as ss')
      .leftJoin('products as p', 'p.id', 'ss.product_id')
      .where('ss.quotation_id', id)
      .select('ss.*', 'p.name as product_name')
      .orderBy(['ss.section_id', 'ss.sub_section_order'])

    const lineItems = await this.db('quotation_line_items as li')
      .leftJoin('variants as v', 'v.id', 'li.variant_id')
      .leftJoin('variants as bv', 'bv.id', 'li.bundle_id')
      .where('li.quotation_id', id)
      .select(
        'li.*',
        'v.sku as variant_sku', 'v.item_code as variant_item_code', 'v.name as variant_name', 'v.unit as variant_unit',
        'bv.sku as bundle_sku', 'bv.item_code as bundle_item_code', 'bv.name as bundle_name', 'bv.unit as bundle_unit',
      )
      .orderBy('li.line_order')

    const lineIds = lineItems.map((l: any) => l.id)
    const progress = lineIds.length ? await this.findLineProgress(lineIds) : new Map()

    function attachProgress(l: any) {
      const p = progress.get(l.id) ?? { exported_qty: 0, pending_qty: 0 }
      return {
        ...l,
        exported_qty: p.exported_qty,
        pending_qty: p.pending_qty,
        remaining_qty: Number(l.quantity) - p.exported_qty - p.pending_qty,
      }
    }

    const sectionsWithLines = sections.map((s: any) => ({
      ...s,
      sub_sections: subSections
        .filter((ss: any) => ss.section_id === s.id)
        .map((ss: any) => ({
          ...ss,
          line_items: lineItems
            .filter((l: any) => l.sub_section_id === ss.id)
            .map(attachProgress),
        })),
      line_items: lineItems
        .filter((l: any) => l.section_id === s.id && !l.sub_section_id)
        .map(attachProgress),
    }))

    return { ...quotation, sections: sectionsWithLines }
  }

  // exported_qty (DO completed) + pending_qty (DO draft) cho từng
  // quotation_line_item — dùng tính remaining_qty (CLAUDE.md mục 6, 16), khoá khi = 0.
  // Bundle lines: nhiều component lines của cùng bundle trong cùng DO → đếm 1 lần dùng
  // bundle_unit_qty (xem delivery.service.ts validateQuotationLines cho cùng pattern).
  async findLineProgress(lineIds: string[]) {
    type ProgressRow = { quotation_line_item_id: string; exported_qty: number; pending_qty: number }
    const result = await this.db.raw<{ rows: ProgressRow[] }>(
      `SELECT sub.quotation_line_item_id,
              COALESCE(SUM(sub.effective_qty) FILTER (WHERE sub.do_status = 'completed'), 0)::int AS exported_qty,
              COALESCE(SUM(sub.effective_qty) FILTER (WHERE sub.do_status = 'draft'), 0)::int AS pending_qty
       FROM (
         SELECT
           dl.quotation_line_item_id,
           d.status AS do_status,
           MAX(COALESCE(dl.bundle_unit_qty, dl.quantity))::int AS effective_qty
         FROM delivery_order_lines dl
         JOIN delivery_orders d ON d.id = dl.delivery_order_id
         WHERE dl.quotation_line_item_id = ANY(:lineIds)
           AND d.status IN ('draft', 'completed')
         GROUP BY
           dl.quotation_line_item_id,
           d.status,
           COALESCE(dl.bundle_id::text || ':' || dl.delivery_order_id::text, dl.id::text)
       ) sub
       GROUP BY sub.quotation_line_item_id`,
      { lineIds },
    )

    const map = new Map<string, { exported_qty: number; pending_qty: number }>()
    for (const r of result.rows) {
      map.set(r.quotation_line_item_id, { exported_qty: r.exported_qty, pending_qty: r.pending_qty })
    }
    return map
  }

  async create(data: ComputedQuotation, userId: string, trx: Knex.Transaction) {
    const { sections, ...header } = data
    const code = await generateDocumentCode(trx, 'quotation')
    const [quotation] = await trx('quotations')
      .insert({ ...header, code, status: 'draft', created_by: userId })
      .returning('*')

    const insertedSections = []
    for (const section of sections) {
      const { line_items, sub_sections, ...sectionHeader } = section
      const [insertedSection] = await trx('quotation_sections')
        .insert({ ...sectionHeader, quotation_id: quotation.id })
        .returning('*')

      const insertedSubSections = []
      for (const ss of sub_sections) {
        const { line_items: ssLines, ...ssHeader } = ss
        const [insertedSS] = await trx('quotation_sub_sections')
          .insert({ ...ssHeader, quotation_id: quotation.id, section_id: insertedSection.id })
          .returning('*')
        const ssInsertedLines = ssLines.length
          ? await trx('quotation_line_items')
              .insert(ssLines.map((li) => ({
                ...li,
                quotation_id: quotation.id,
                section_id: insertedSection.id,
                sub_section_id: insertedSS.id,
              }))).returning('*')
          : []
        insertedSubSections.push({ ...insertedSS, line_items: ssInsertedLines })
      }

      const insertedLines = line_items.length
        ? await trx('quotation_line_items')
            .insert(line_items.map((li) => ({
              ...li,
              quotation_id: quotation.id,
              section_id: insertedSection.id,
              sub_section_id: null,
            }))).returning('*')
        : []

      insertedSections.push({ ...insertedSection, sub_sections: insertedSubSections, line_items: insertedLines })
    }

    return { ...quotation, sections: insertedSections }
  }

  // Draft-only full replace: xoá sạch sections/line_items cũ rồi insert lại theo dữ liệu mới
  // (chỉ an toàn khi chưa Confirm — chưa có reserved_items/DO nào tham chiếu line cũ).
  async replaceSections(quotationId: string, sections: ComputedSection[], trx: Knex.Transaction) {
    await trx('quotation_line_items').where({ quotation_id: quotationId }).del()
    await trx('quotation_sub_sections').where({ quotation_id: quotationId }).del()
    await trx('quotation_sections').where({ quotation_id: quotationId }).del()

    const insertedSections = []
    for (const section of sections) {
      const { line_items, sub_sections, ...sectionHeader } = section
      const [insertedSection] = await trx('quotation_sections')
        .insert({ ...sectionHeader, quotation_id: quotationId })
        .returning('*')

      const insertedSubSections = []
      for (const ss of sub_sections) {
        const { line_items: ssLines, ...ssHeader } = ss
        const [insertedSS] = await trx('quotation_sub_sections')
          .insert({ ...ssHeader, quotation_id: quotationId, section_id: insertedSection.id })
          .returning('*')
        const ssInsertedLines = ssLines.length
          ? await trx('quotation_line_items')
              .insert(ssLines.map((li) => ({
                ...li,
                quotation_id: quotationId,
                section_id: insertedSection.id,
                sub_section_id: insertedSS.id,
              }))).returning('*')
          : []
        insertedSubSections.push({ ...insertedSS, line_items: ssInsertedLines })
      }

      const insertedLines = line_items.length
        ? await trx('quotation_line_items')
            .insert(line_items.map((li) => ({
              ...li,
              quotation_id: quotationId,
              section_id: insertedSection.id,
              sub_section_id: null,
            }))).returning('*')
        : []

      insertedSections.push({ ...insertedSection, sub_sections: insertedSubSections, line_items: insertedLines })
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
