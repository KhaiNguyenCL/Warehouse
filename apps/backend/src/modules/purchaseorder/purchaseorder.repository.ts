import { Knex } from 'knex'
import { ListPurchaseOrderQuery, PurchaseOrderLineInput } from './purchaseorder.schema'

export interface PurchaseOrderHeaderInput {
  code: string
  company_id: string
  contact_id?: string
  bitrix_deal_id?: string
  note?: string
}

export class PurchaseOrderRepository {
  constructor(private db: Knex) {}

  async findAll(query: ListPurchaseOrderQuery) {
    const { status, company_id, search, page = 1, limit = 20 } = query
    const offset = (page - 1) * limit

    const base = this.db('purchase_orders as po')
      .leftJoin('companies as c', 'c.id', 'po.company_id')
      .leftJoin('users as u', 'u.id', 'po.created_by')

    if (status) base.where('po.status', status)
    if (company_id) base.where('po.company_id', company_id)
    if (search) base.whereILike('po.code', `%${search}%`)

    const [rows, countResult] = await Promise.all([
      base
        .clone()
        .select(
          'po.id', 'po.code', 'po.status', 'po.bitrix_deal_id', 'po.created_at',
          'c.name as company_name',
          'u.full_name as created_by_name',
        )
        .orderBy('po.created_at', 'desc')
        .limit(limit)
        .offset(offset),
      base.clone().clearSelect().count('po.id as count').first(),
    ])

    return { data: rows, total: Number(countResult?.count ?? 0), page, limit }
  }

  async findById(id: string) {
    const po = await this.db('purchase_orders as po')
      .leftJoin('companies as c', 'c.id', 'po.company_id')
      .leftJoin('contacts as ct', 'ct.id', 'po.contact_id')
      .where('po.id', id)
      .select('po.*', 'c.name as company_name', 'ct.full_name as contact_name')
      .first()

    if (!po) return null

    const lines = await this.db('purchase_order_lines as pol')
      .join('variants as v', 'v.id', 'pol.variant_id')
      .where('pol.purchase_order_id', id)
      .select('pol.*', 'v.sku as variant_sku', 'v.name as variant_name')
      .orderBy('pol.line_order')

    const lineIds = lines.map((l: any) => l.id)
    const progress = lineIds.length ? await this.findLineProgress(lineIds) : new Map()

    const linesWithProgress = lines.map((l: any) => {
      const p = progress.get(l.id) ?? { received_qty: 0, pending_qty: 0 }
      return {
        ...l,
        received_qty: p.received_qty,
        pending_qty: p.pending_qty,
        remaining_qty: Number(l.quantity) - p.received_qty - p.pending_qty,
      }
    })

    return { ...po, lines: linesWithProgress }
  }

  // received_qty (Receipt completed) + pending_qty (Receipt draft/pending_approval/approved)
  // cho từng purchase_order_line — dùng tính remaining_qty, đối xứng với
  // quotation.repository.ts::findLineProgress (exported_qty/pending_qty của DO).
  // Nhận trx tuỳ chọn: unconfirm()/cancel() gọi với trx SAU KHI đã forUpdate() khoá
  // purchase_orders, để đọc progress mới nhất trong cùng transaction — khoá này khớp
  // với forUpdate() bên receipt.service.ts::validatePurchaseOrder() nên 2 transaction
  // cùng đụng 1 PO sẽ serialize, không còn đọc progress cũ (stale) qua tay nhau.
  async findLineProgress(lineIds: string[], trx?: Knex.Transaction) {
    const runner = trx ?? this.db
    const rows = await runner('receipt_lines as rl')
      .join('receipts as r', 'r.id', 'rl.receipt_id')
      .whereIn('rl.po_line_id', lineIds)
      .groupBy('rl.po_line_id')
      .select(
        'rl.po_line_id',
        runner.raw(`COALESCE(SUM(rl.quantity) FILTER (WHERE r.status = 'completed'), 0)::int as received_qty`),
        runner.raw(
          `COALESCE(SUM(rl.quantity) FILTER (WHERE r.status IN ('draft','pending_approval','approved')), 0)::int as pending_qty`,
        ),
      )

    const map = new Map<string, { received_qty: number; pending_qty: number }>()
    for (const r of rows) {
      map.set(r.po_line_id, { received_qty: r.received_qty, pending_qty: r.pending_qty })
    }
    return map
  }

  // Dùng trong unconfirm()/cancel() — đọc lines + progress NGAY SAU forUpdate() lock,
  // trong cùng transaction, thay vì dựa vào findById() đọc trước khi mở transaction.
  async findLinesWithProgress(purchaseOrderId: string, trx: Knex.Transaction) {
    const lines = await trx('purchase_order_lines').where({ purchase_order_id: purchaseOrderId }).select('id')
    const lineIds = lines.map((l: any) => l.id)
    const progress = lineIds.length ? await this.findLineProgress(lineIds, trx) : new Map()
    return lines.map((l: any) => ({
      ...l,
      received_qty: progress.get(l.id)?.received_qty ?? 0,
      pending_qty: progress.get(l.id)?.pending_qty ?? 0,
    }))
  }

  async create(
    header: PurchaseOrderHeaderInput,
    lines: PurchaseOrderLineInput[],
    userId: string,
    trx: Knex.Transaction,
  ) {
    const [po] = await trx('purchase_orders')
      .insert({ ...header, status: 'draft', created_by: userId })
      .returning('*')

    const lineRows = lines.map((l, i) => ({
      ...l,
      purchase_order_id: po.id,
      line_order: l.line_order ?? i + 1,
    }))
    const insertedLines = await trx('purchase_order_lines').insert(lineRows).returning('*')

    return { ...po, lines: insertedLines }
  }

  // Draft-only full replace — chỉ an toàn khi chưa Confirm (chưa có receipt nào tham
  // chiếu po_line_id của các dòng cũ).
  async replaceLines(purchaseOrderId: string, lines: PurchaseOrderLineInput[], trx: Knex.Transaction) {
    await trx('purchase_order_lines').where({ purchase_order_id: purchaseOrderId }).del()

    const lineRows = lines.map((l, i) => ({
      ...l,
      purchase_order_id: purchaseOrderId,
      line_order: l.line_order ?? i + 1,
    }))
    return trx('purchase_order_lines').insert(lineRows).returning('*')
  }

  async updateHeader(id: string, header: Partial<PurchaseOrderHeaderInput>, trx: Knex.Transaction) {
    const [row] = await trx('purchase_orders')
      .where({ id })
      .update({ ...header, updated_at: trx.fn.now() })
      .returning('*')
    return row
  }

  // expectedStatus nằm ngay trong WHERE — update atomic, tránh race condition (cùng
  // pattern với quotation.repository.ts/receipt.repository.ts::updateStatus).
  async updateStatus(
    id: string,
    expectedStatus: string | string[],
    newStatus: string,
    extra: Record<string, unknown>,
    trx: Knex.Transaction,
  ) {
    const query = trx('purchase_orders').where({ id })
    if (Array.isArray(expectedStatus)) query.whereIn('status', expectedStatus)
    else query.where('status', expectedStatus)

    const [updated] = await query
      .update({ status: newStatus, updated_at: trx.fn.now(), ...extra })
      .returning('*')
    return updated
  }

  lockForUpdate(id: string, trx: Knex.Transaction) {
    return trx('purchase_orders').where({ id }).forUpdate().first()
  }
}
