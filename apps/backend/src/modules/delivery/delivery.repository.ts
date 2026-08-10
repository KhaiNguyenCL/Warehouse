import { Knex } from 'knex'
import { CreateDeliveryBody, ListDeliveryQuery } from './delivery.schema'
import { generateDocumentCode } from '../../lib/generateDocumentCode'

export class DeliveryRepository {
  constructor(private db: Knex) {}

  async findAll(query: ListDeliveryQuery) {
    const { status, export_type, warehouse_id, search, sort_by, sort_order, page = 1, limit = 20 } = query
    const offset = (page - 1) * limit

    const SORTABLE: Record<string, string> = {
      code: 'd.code', status: 'd.status', created_at: 'd.created_at',
      export_type: 'd.export_type', company_name: 'c.name',
    }
    const sortDir = sort_order === 'asc' ? 'asc' : 'desc'

    const base = this.db('delivery_orders as d')
      .leftJoin('companies as c', 'c.id', 'd.company_id')
      .leftJoin('warehouses as w', 'w.id', 'd.warehouse_id')
      .leftJoin('users as u', 'u.id', 'd.created_by')
      .select(
        'd.id', 'd.code', 'd.export_type', 'd.status',
        'd.created_at', 'd.completed_at',
        'c.name as company_name',
        'w.name as warehouse_name',
        'u.full_name as created_by_name',
      )

    if (status) base.where('d.status', status)
    if (export_type) base.where('d.export_type', export_type)
    if (warehouse_id) base.where('d.warehouse_id', warehouse_id)
    if (search) base.where((qb) => qb.whereILike('d.code', `%${search}%`).orWhereILike('c.name', `%${search}%`))

    const [rows, countResult] = await Promise.all([
      base.clone().orderBy(SORTABLE[sort_by ?? ''] ?? 'd.created_at', sortDir).limit(limit).offset(offset),
      base.clone().clearSelect().count('d.id as count').first(),
    ])

    return { data: rows, total: Number(countResult?.count ?? 0), page, limit }
  }

  async findById(id: string) {
    const delivery = await this.db('delivery_orders as d')
      .leftJoin('companies as c', 'c.id', 'd.company_id')
      .leftJoin('warehouses as w', 'w.id', 'd.warehouse_id')
      .where('d.id', id)
      .select('d.*', 'c.name as company_name', 'w.name as warehouse_name')
      .first()

    if (!delivery) return null

    const lines = await this.db('delivery_order_lines as dl')
      .join('variants as v', 'v.id', 'dl.variant_id')
      .join('products as p', 'p.id', 'v.product_id')
      .where('dl.delivery_order_id', id)
      .select('dl.*', 'v.sku', 'v.item_code', 'v.name as variant_name', 'p.name as product_name', 'p.product_type')
      .orderBy('dl.line_order')

    return { ...delivery, lines }
  }

  async create(data: CreateDeliveryBody, userId: string, trx: Knex.Transaction) {
    const { lines, ...header } = data
    const code = await generateDocumentCode(trx, 'delivery_order')
    const [delivery] = await trx('delivery_orders')
      .insert({ ...header, code, status: 'draft', created_by: userId })
      .returning('*')

    const lineRows = lines.map((l, i) => ({
      ...l,
      delivery_order_id: delivery.id,
      line_order: l.line_order ?? i + 1,
    }))
    const insertedLines = await trx('delivery_order_lines').insert(lineRows).returning('*')

    return { ...delivery, lines: insertedLines }
  }

  async update(id: string, data: Record<string, unknown>) {
    const [row] = await this.db('delivery_orders').where({ id }).update({ ...data, updated_at: this.db.fn.now() }).returning('*')
    return row
  }

  // expectedStatus nằm ngay trong WHERE — update atomic, tránh race condition khi 2
  // request cùng lúc chuyển trạng thái (xem giải thích chi tiết ở receipt.repository.ts).
  async updateStatus(
    id: string,
    expectedStatus: string | string[],
    newStatus: string,
    extra: Record<string, unknown>,
    trx: Knex.Transaction,
  ) {
    const query = trx('delivery_orders').where({ id })
    if (Array.isArray(expectedStatus)) query.whereIn('status', expectedStatus)
    else query.where('status', expectedStatus)

    const [updated] = await query
      .update({ status: newStatus, updated_at: trx.fn.now(), ...extra })
      .returning('*')
    return updated
  }

  // Dùng để check tồn kho trước khi cho Complete — không cho xuất nhiều hơn đang có.
  findInventory(variantId: string, warehouseId: string, trx: Knex.Transaction) {
    return trx('inventory').where({ variant_id: variantId, warehouse_id: warehouseId }).first()
  }

  findWarehouseByCode(code: string, trx: Knex.Transaction) {
    return trx('warehouses').where({ code }).first()
  }
}
