import { Knex } from 'knex'
import { ListInventoryQuery, ListLowStockQuery, ListLotsQuery, ListSerialsQuery } from './inventory.schema'

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

  // Breakdown từng lô (receipt_line) của 1 SKU — chỉ lấy từ Receipt đã Completed (hàng
  // thật đã vào kho; Draft/Approved chưa phải lô thật). Sắp theo đúng thứ tự FIFO thật
  // của delivery.service.ts::consumeReceiptLinesFifo (completed_at ASC, line_order ASC)
  // để user thấy đúng lô nào sẽ bị trừ trước — chỉ completed_at không đủ làm tie-breaker
  // vì nhiều receipt_line của CÙNG 1 receipt share đúng 1 completed_at.
  findLots(query: ListLotsQuery) {
    const { variant_id, warehouse_id } = query
    const q = this.db('receipt_lines as rl')
      .join('receipts as r', 'r.id', 'rl.receipt_id')
      .leftJoin('companies as c', 'c.id', 'r.company_id')
      .where('rl.variant_id', variant_id)
      .andWhere('r.status', 'completed')
      .select(
        'rl.id as receipt_line_id',
        'r.code as receipt_code',
        'r.completed_at',
        'c.name as company_name',
        'rl.quantity',
        'rl.qty_remaining',
        'rl.cost_price',
        'rl.warranty_months',
      )
      .orderBy([
        { column: 'r.completed_at', order: 'asc' },
        { column: 'rl.line_order', order: 'asc' },
      ])

    if (warehouse_id) q.andWhere('r.warehouse_id', warehouse_id)
    return q
  }

  // Từng SN vật lý của 1 lô (receipt_line) — drill-down từ findLots() xuống chi tiết
  // cuối cùng: serial_no, trạng thái hiện tại (có thể đã sold/disposed sau khi xuất),
  // warranty_end đã tính lúc Complete, MAC nếu có.
  findSerials(query: ListSerialsQuery) {
    return this.db('serial_numbers as sn')
      .leftJoin('warehouses as w', 'w.id', 'sn.warehouse_id')
      .where('sn.receipt_line_id', query.receipt_line_id)
      .select(
        'sn.id',
        'sn.serial_no',
        'sn.status',
        'w.name as warehouse_name',
        'sn.mac_address',
        'sn.warranty_end',
        'sn.created_at',
      )
      .orderBy('sn.serial_no')
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
