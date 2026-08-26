import { Knex } from 'knex'
import { CreateShipmentBody, ListShipmentQuery } from './shipment.schema'
import { generateDocumentCode } from '../../lib/generateDocumentCode'

export class ShipmentRepository {
  constructor(private db: Knex) {}

  async findAll(query: ListShipmentQuery) {
    const { status, po_id, supplier_id, warehouse_id, search, sort_by, sort_order, page = 1, limit = 20 } = query
    const offset = (page - 1) * limit

    const SORTABLE: Record<string, string> = {
      code: 's.code', status: 's.status', created_at: 's.created_at',
      expected_date: 's.expected_date', supplier_name: 'c.name',
    }
    const sortDir = sort_order === 'asc' ? 'asc' : 'desc'

    const base = this.db('shipments as s')
      .leftJoin('companies as c', 'c.id', 's.supplier_id')
      .leftJoin('warehouses as w', 'w.id', 's.warehouse_id')
      .leftJoin('purchase_orders as po', 'po.id', 's.po_id')
      .leftJoin('users as u', 'u.id', 's.created_by')
      .select(
        's.id', 's.code', 's.status', 's.expected_date', 's.received_date',
        's.created_at', 's.attachments',
        'c.name as supplier_name',
        'w.name as warehouse_name',
        'po.code as po_code',
        'u.full_name as created_by_name',
      )

    if (status)       base.where('s.status', status)
    if (po_id)        base.where('s.po_id', po_id)
    if (supplier_id)  base.where('s.supplier_id', supplier_id)
    if (warehouse_id) base.where('s.warehouse_id', warehouse_id)
    if (search)       base.where((qb) => qb.whereILike('s.code', `%${search}%`).orWhereILike('c.name', `%${search}%`))

    // Đếm tổng dòng hàng và lệch số lượng để hiển thị trên list
    base.leftJoin(
      this.db('shipment_lines')
        .select('shipment_id')
        .count('* as total_lines')
        .sum(this.db.raw('qty_received - qty_expected'))
        .as('sl_agg'),
      'sl_agg.shipment_id', 's.id',
    )

    const [rows, countResult] = await Promise.all([
      base.clone().orderBy(SORTABLE[sort_by ?? ''] ?? 's.created_at', sortDir).limit(limit).offset(offset),
      base.clone().clearSelect().count('s.id as count').first(),
    ])

    return {
      data: rows,
      total: Number(countResult?.count ?? 0),
      page,
      limit,
    }
  }

  async findById(id: string) {
    const shipment = await this.db('shipments as s')
      .leftJoin('companies as c', 'c.id', 's.supplier_id')
      .leftJoin('warehouses as w', 'w.id', 's.warehouse_id')
      .leftJoin('purchase_orders as po', 'po.id', 's.po_id')
      .leftJoin('users as u', 'u.id', 's.created_by')
      .leftJoin('users as ur', 'ur.id', 's.received_by')
      .where('s.id', id)
      .select(
        's.*',
        'c.name as supplier_name',
        'w.name as warehouse_name',
        'po.code as po_code',
        'u.full_name as created_by_name',
        'ur.full_name as received_by_name',
      )
      .first()

    if (!shipment) return null

    const lines = await this.db('shipment_lines as sl')
      .join('variants as v', 'v.id', 'sl.variant_id')
      .join('products as p', 'p.id', 'v.product_id')
      .leftJoin('purchase_order_lines as pol', 'pol.id', 'sl.po_line_id')
      .where('sl.shipment_id', id)
      .select(
        'sl.*',
        'v.item_code', 'v.name as variant_name',
        'p.name as product_name', 'p.product_type',
      )
      .orderBy('sl.line_order')

    // Phiếu nhập kho đã tạo từ shipment này
    const receipts = await this.db('receipts as r')
      .leftJoin('users as u', 'u.id', 'r.created_by')
      .where('r.shipment_id', id)
      .select('r.id', 'r.code', 'r.status', 'r.created_at', 'r.completed_at', 'u.full_name as created_by_name')
      .orderBy('r.created_at')

    return { ...shipment, lines, receipts }
  }

  async create(data: CreateShipmentBody, userId: string, trx: Knex.Transaction) {
    const { lines, ...header } = data
    const code = await generateDocumentCode(trx, 'shipment')

    const [shipment] = await trx('shipments')
      .insert({ ...header, code, status: 'draft', created_by: userId })
      .returning('*')

    const lineRows = lines.map((l, i) => ({
      ...l,
      shipment_id: shipment.id,
      line_order: l.line_order ?? i + 1,
    }))
    const insertedLines = await trx('shipment_lines').insert(lineRows).returning('*')

    return { ...shipment, lines: insertedLines }
  }

  async update(id: string, data: Record<string, unknown>) {
    const [row] = await this.db('shipments')
      .where({ id })
      .update({ ...data, updated_at: this.db.fn.now() })
      .returning('*')
    return row
  }

  async updateLine(lineId: string, data: Record<string, unknown>) {
    const [row] = await this.db('shipment_lines').where({ id: lineId }).update(data).returning('*')
    return row
  }

  async updateStatus(
    id: string,
    expectedStatus: string | string[],
    newStatus: string,
    extra: Record<string, unknown>,
    trx: Knex.Transaction,
  ) {
    const query = trx('shipments').where({ id })
    if (Array.isArray(expectedStatus)) query.whereIn('status', expectedStatus)
    else query.where('status', expectedStatus)

    const [updated] = await query
      .update({ status: newStatus, updated_at: trx.fn.now(), ...extra })
      .returning('*')
    return updated
  }
}
