import { Knex } from 'knex'
import { ListInventoryQuery, ListLowStockQuery } from './inventory.schema'

export class InventoryRepository {
  constructor(private db: Knex) {}

  async findAll(query: ListInventoryQuery) {
    const { variant_id, warehouse_id, search, page = 1, limit = 20 } = query
    const offset = (page - 1) * limit

    const base = this.db('inventory as i')
      .join('variants as v', 'v.id', 'i.variant_id')
      .join('warehouses as w', 'w.id', 'i.warehouse_id')
      .select(
        'i.variant_id',
        'i.warehouse_id',
        'v.sku',
        'v.name as variant_name',
        'w.code as warehouse_code',
        'w.name as warehouse_name',
        'i.qty_on_hand',
        'i.qty_reserved',
        // qty_available = qty_on_hand - qty_reserved — tính ngay trong SQL, không cần
        // app tính lại (tránh lệch nếu sau này có nơi khác quên trừ đúng công thức)
        this.db.raw('(i.qty_on_hand - i.qty_reserved) as qty_available'),
        'i.avg_cost',
        'i.last_updated',
      )

    if (variant_id) base.where('i.variant_id', variant_id)
    if (warehouse_id) base.where('i.warehouse_id', warehouse_id)
    if (search) {
      base.where((qb) => {
        qb.whereILike('v.name', `%${search}%`).orWhereILike('v.sku', `%${search}%`)
      })
    }

    const [rows, countResult] = await Promise.all([
      base.clone().orderBy('v.name').limit(limit).offset(offset),
      base.clone().clearSelect().count('i.variant_id as count').first(),
    ])

    return { data: rows, total: Number(countResult?.count ?? 0), page, limit }
  }

  // Tồn tổng (cộng tất cả kho) của 1 variant thấp hơn reorder_point — cảnh báo cần nhập thêm.
  // reorder_point là field của variants (ngưỡng chung, không tách theo từng kho).
  async findLowStock(query: ListLowStockQuery = {}) {
    const { page = 1, limit = 20 } = query
    const offset = (page - 1) * limit

    const grouped = () =>
      this.db('variants as v')
        .leftJoin('inventory as i', 'i.variant_id', 'v.id')
        .where('v.reorder_point', '>', 0)
        .andWhere('v.is_active', true)
        .groupBy('v.id', 'v.sku', 'v.name', 'v.reorder_point')
        .havingRaw('COALESCE(SUM(i.qty_on_hand), 0) < v.reorder_point')

    const [rows, countResult] = await Promise.all([
      grouped()
        .select(
          'v.id as variant_id',
          'v.sku',
          'v.name as variant_name',
          'v.reorder_point',
          this.db.raw('COALESCE(SUM(i.qty_on_hand), 0)::int as total_qty_on_hand'),
        )
        .orderBy('v.name')
        .limit(limit)
        .offset(offset),
      // count() cộng thẳng vào query có GROUP BY sẽ trả số dòng MỖI NHÓM, không phải
      // tổng số nhóm thoả điều kiện — phải bọc subquery để đếm đúng tổng số variant.
      this.db.from(grouped().select('v.id').as('low_stock')).count('* as count').first(),
    ])

    return { data: rows, total: Number(countResult?.count ?? 0), page, limit }
  }
}
