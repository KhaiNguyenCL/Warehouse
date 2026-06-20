import { Knex } from 'knex'
import { ListStocktakeQuery, ScopeType } from './stocktake.schema'

// Sản phẩm có theo dõi tồn kho thật (CLAUDE.md mục 4) — service/bundle không có dòng
// trong kho nên không thể nằm trong phạm vi kiểm kê.
const TRACKED_PRODUCT_TYPES = ['storable', 'consumable']

export class StocktakeRepository {
  constructor(private db: Knex) {}

  async findAll(query: ListStocktakeQuery) {
    const { status, warehouse_id, page = 1, limit = 20 } = query
    const offset = (page - 1) * limit

    const base = this.db('stocktakes as s')
      .leftJoin('warehouses as w', 'w.id', 's.warehouse_id')
      .leftJoin('users as u', 'u.id', 's.created_by')

    if (status) base.where('s.status', status)
    if (warehouse_id) base.where('s.warehouse_id', warehouse_id)

    const [data, countResult] = await Promise.all([
      base
        .clone()
        .select('s.*', 'w.name as warehouse_name', 'u.full_name as created_by_name')
        .orderBy('s.started_at', 'desc')
        .limit(limit)
        .offset(offset),
      base.clone().clearSelect().count('s.id as count').first(),
    ])

    return { data, total: Number(countResult?.count ?? 0), page, limit }
  }

  async findById(id: string) {
    const stocktake = await this.db('stocktakes as s')
      .leftJoin('warehouses as w', 'w.id', 's.warehouse_id')
      .where('s.id', id)
      .select('s.*', 'w.name as warehouse_name')
      .first()
    if (!stocktake) return null

    const lines = await this.findLines(id)
    const result = await this.findResult(id)
    return { ...stocktake, lines, result: result ?? null }
  }

  findLines(stocktakeId: string, trx: Knex.Transaction | Knex = this.db) {
    return trx('stocktake_lines as sl')
      .join('variants as v', 'v.id', 'sl.variant_id')
      .join('products as p', 'p.id', 'v.product_id')
      .where('sl.stocktake_id', stocktakeId)
      .select('sl.*', 'v.sku', 'v.name as variant_name', 'p.product_type')
      .orderBy('v.sku')
  }

  // Snapshot qty_system theo phạm vi (CLAUDE.md mục 19) — lấy lúc TẠO stocktake, không
  // tính lại sau đó dù kho có biến động (mục 6: "Kho không bị khoá — dùng snapshot qty_system").
  //
  // scope_type='all'  : tất cả variant ĐANG CÓ dòng inventory tại kho này.
  // scope_type='by_sku'/'by_category': lấy đúng variant trong scope_ids dù CHƯA có dòng
  // inventory tại kho này (qty_system mặc định 0) — để phát hiện hàng thừa ngoài hệ thống.
  async resolveScopeVariants(warehouseId: string, scopeType: ScopeType, scopeIds: string[]) {
    if (scopeType === 'all') {
      return this.db('inventory as i')
        .join('variants as v', 'v.id', 'i.variant_id')
        .join('products as p', 'p.id', 'v.product_id')
        .where('i.warehouse_id', warehouseId)
        .whereIn('p.product_type', TRACKED_PRODUCT_TYPES)
        .select('v.id as variant_id', 'i.qty_on_hand as qty_system')
    }

    const variantsQuery = this.db('variants as v')
      .join('products as p', 'p.id', 'v.product_id')
      .whereIn('p.product_type', TRACKED_PRODUCT_TYPES)

    if (scopeType === 'by_sku') {
      variantsQuery.whereIn('v.id', scopeIds)
    } else {
      variantsQuery.whereIn('p.category_id', scopeIds)
    }
    const variants = await variantsQuery.select('v.id as variant_id')
    if (variants.length === 0) return []

    const inventories = await this.db('inventory')
      .where({ warehouse_id: warehouseId })
      .whereIn('variant_id', variants.map((v) => v.variant_id))
    const qtyByVariant = new Map(inventories.map((i) => [i.variant_id, i.qty_on_hand]))

    return variants.map((v) => ({ variant_id: v.variant_id, qty_system: qtyByVariant.get(v.variant_id) ?? 0 }))
  }

  async create(
    header: { code: string; warehouse_id: string; scope_type: ScopeType; scope_ids: string[] | null; note?: string },
    lines: Array<{ variant_id: string; qty_system: number }>,
    userId: string,
    trx: Knex.Transaction,
  ) {
    const [stocktake] = await trx('stocktakes')
      .insert({
        code: header.code,
        warehouse_id: header.warehouse_id,
        scope_type: header.scope_type,
        scope_ids: header.scope_ids ? JSON.stringify(header.scope_ids) : null,
        note: header.note,
        status: 'in_progress',
        created_by: userId,
      })
      .returning('*')

    const insertedLines = lines.length
      ? await trx('stocktake_lines')
          .insert(lines.map((l) => ({ ...l, stocktake_id: stocktake.id })))
          .returning('*')
      : []

    return { ...stocktake, lines: insertedLines }
  }

  lockForUpdate(id: string, trx: Knex.Transaction) {
    return trx('stocktakes').where({ id }).forUpdate().first()
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
    const query = trx('stocktakes').where({ id })
    if (Array.isArray(expectedStatus)) query.whereIn('status', expectedStatus)
    else query.where('status', expectedStatus)

    const [updated] = await query.update({ status: newStatus, ...extra }).returning('*')
    return updated
  }

  updateLineActual(lineId: string, qtyActual: number, trx: Knex.Transaction) {
    return trx('stocktake_lines').where({ id: lineId }).update({ qty_actual: qtyActual }).returning('*')
  }

  findActiveSerials(variantId: string, warehouseId: string, trx: Knex.Transaction) {
    return trx('serial_numbers').where({ variant_id: variantId, warehouse_id: warehouseId, status: 'active' })
  }

  findSerialsByNumbers(serialNos: string[], trx: Knex.Transaction) {
    return trx('serial_numbers').whereIn('serial_no', serialNos)
  }

  insertStocktakeSerials(rows: Array<{ stocktake_id: string; serial_id: string; status: string }>, trx: Knex.Transaction) {
    if (rows.length === 0) return Promise.resolve([])
    return trx('stocktake_serials').insert(rows).returning('*')
  }

  insertResult(
    stocktakeId: string,
    result: { total_sku: number; matched: number; shortage: number; surplus: number; note?: string },
    trx: Knex.Transaction,
  ) {
    return trx('stocktake_results').insert({ ...result, stocktake_id: stocktakeId }).returning('*')
  }

  findResult(stocktakeId: string) {
    return this.db('stocktake_results').where({ stocktake_id: stocktakeId }).first()
  }
}
