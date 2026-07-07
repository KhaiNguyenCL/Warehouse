import { Knex } from 'knex'
import { CreateTransferBody, ListTransferQuery } from './transfer.schema'
import { generateDocumentCode } from '../../lib/generateDocumentCode'

export class TransferRepository {
  constructor(private db: Knex) {}

  async findAll(query: ListTransferQuery) {
    const { status, transfer_type, page = 1, limit = 20 } = query
    const offset = (page - 1) * limit

    const base = this.db('transfer_orders as t')
      .leftJoin('warehouses as wf', 'wf.id', 't.from_warehouse_id')
      .leftJoin('warehouses as wt', 'wt.id', 't.to_warehouse_id')
      .leftJoin('users as u', 'u.id', 't.created_by')
      .select(
        't.id', 't.code', 't.transfer_type', 't.status',
        't.created_at', 't.completed_at',
        'wf.name as from_warehouse_name',
        'wt.name as to_warehouse_name',
        'u.full_name as created_by_name',
      )

    if (status) base.where('t.status', status)
    if (transfer_type) base.where('t.transfer_type', transfer_type)

    const [rows, countResult] = await Promise.all([
      base.clone().orderBy('t.created_at', 'desc').limit(limit).offset(offset),
      base.clone().clearSelect().count('t.id as count').first(),
    ])

    return { data: rows, total: Number(countResult?.count ?? 0), page, limit }
  }

  async findById(id: string) {
    const transfer = await this.db('transfer_orders as t')
      .leftJoin('warehouses as wf', 'wf.id', 't.from_warehouse_id')
      .leftJoin('warehouses as wt', 'wt.id', 't.to_warehouse_id')
      .where('t.id', id)
      .select('t.*', 'wf.name as from_warehouse_name', 'wt.name as to_warehouse_name')
      .first()

    if (!transfer) return null

    const lines = await this.db('transfer_order_lines as tl')
      .join('variants as v', 'v.id', 'tl.variant_id')
      .join('products as p', 'p.id', 'v.product_id')
      .where('tl.transfer_order_id', id)
      .select('tl.*', 'v.sku', 'v.name as variant_name', 'p.product_type')
      .orderBy('tl.line_order')

    return { ...transfer, lines }
  }

  findWarehouseByCode(code: string, trx: Knex.Transaction) {
    return trx('warehouses').where({ code }).first()
  }

  async create(data: CreateTransferBody, userId: string, trx: Knex.Transaction) {
    const { lines, ...header } = data
    const code = await generateDocumentCode(trx, 'transfer_order')
    const [transfer] = await trx('transfer_orders')
      .insert({ ...header, code, status: 'draft', created_by: userId })
      .returning('*')

    const lineRows = lines.map((l, i) => ({
      ...l,
      transfer_order_id: transfer.id,
      line_order: l.line_order ?? i + 1,
    }))
    const insertedLines = await trx('transfer_order_lines').insert(lineRows).returning('*')

    return { ...transfer, lines: insertedLines }
  }

  async update(id: string, data: Record<string, unknown>) {
    const [row] = await this.db('transfer_orders').where({ id }).update({ ...data, updated_at: this.db.fn.now() }).returning('*')
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
    const query = trx('transfer_orders').where({ id })
    if (Array.isArray(expectedStatus)) query.whereIn('status', expectedStatus)
    else query.where('status', expectedStatus)

    const [updated] = await query
      .update({ status: newStatus, updated_at: trx.fn.now(), ...extra })
      .returning('*')
    return updated
  }
}
