import { Knex } from 'knex'
import { ListInventoryQuery, ListLowStockQuery, ListLotsQuery, ListSerialsQuery } from './inventory.schema'

export class InventoryRepository {
  constructor(private db: Knex) {}

  async findAll(query: ListInventoryQuery) {
    const { variant_id, warehouse_id, category_id, brand_id, search, page = 1, limit = 20 } = query
    const offset = (page - 1) * limit

    const base = this.db('inventory as i')
      .join('variants as v', 'v.id', 'i.variant_id')
      .join('products as p', 'p.id', 'v.product_id')
      .join('warehouses as w', 'w.id', 'i.warehouse_id')
      .select(
        'i.variant_id',
        'i.warehouse_id',
        'v.sku',
        'v.item_code',
        'v.name as variant_name',
        'v.unit',
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
    if (category_id) base.where('p.category_id', category_id)
    if (brand_id) base.where('p.brand_id', brand_id)
    if (search) {
      base.where((qb) => {
        qb.whereILike('v.name', `%${search}%`).orWhereILike('v.sku', `%${search}%`).orWhereILike('v.item_code', `%${search}%`)
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
      // po_line_id (cả receipts.po_id và receipt_lines.po_line_id) là liên kết TUỲ CHỌN
      // tới Purchase Order (mục 7/9 CLAUDE.md) — leftJoin để lô nhập không qua PO chính
      // thức vẫn hiển thị bình thường, chỉ po_code là null.
      .leftJoin('purchase_order_lines as pol', 'pol.id', 'rl.po_line_id')
      .leftJoin('purchase_orders as po', 'po.id', 'pol.purchase_order_id')
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
        'rl.manufacturer_warranty_months',
        'rl.customer_warranty_months',
        'po.code as po_code',
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
  //
  // Mode "search" (tra ngược theo serial_no, không biết trước SKU/kho/lô): JOIN thêm
  // variants/receipt_lines/receipts để trả đủ context — receipt_line_id có thể NULL (SN
  // tạo qua adjustment không gắn lô) nên dùng leftJoin, không inner join.
  // Tồn kho tổng hợp theo variant (gộp tất cả kho) — dùng cho tab Tồn kho SKU-level.
  // 1 dòng/SKU thay vì 1 dòng/SKU+kho như findAll() để user không phải xổ 2 tầng mới thấy SN.
  async findByVariant(query: ListInventoryQuery) {
    const { variant_id, warehouse_id, product_id, product_type, search, page = 1, limit = 20 } = query
    const offset = (page - 1) * limit

    const base = this.db('inventory as i')
      .join('variants as v', 'v.id', 'i.variant_id')
      .join('products as p', 'p.id', 'v.product_id')
      .groupBy('i.variant_id', 'v.sku', 'v.item_code', 'v.name', 'v.unit', 'v.model', 'v.part_number', 'p.product_type')
      .select(
        'i.variant_id',
        'v.sku',
        'v.item_code',
        'v.name as variant_name',
        'v.unit',
        'v.model',
        'v.part_number',
        'p.product_type',
        this.db.raw('SUM(i.qty_on_hand)::int as qty_on_hand'),
        this.db.raw('SUM(i.qty_reserved)::int as qty_reserved'),
        this.db.raw('(SUM(i.qty_on_hand) - SUM(i.qty_reserved))::int as qty_available'),
        this.db.raw('ROUND(AVG(i.avg_cost)::numeric, 0) as avg_cost'),
        // Danh sách kho có hàng dạng [{name, qty_on_hand}] — hiển thị trực tiếp trên dòng SKU
        this.db.raw(`
          (SELECT json_agg(json_build_object('name', w.name, 'qty', i2.qty_on_hand) ORDER BY w.name)
           FROM inventory i2
           JOIN warehouses w ON w.id = i2.warehouse_id
           WHERE i2.variant_id = i.variant_id AND i2.qty_on_hand > 0
          ) as warehouse_breakdown
        `),
      )

    if (variant_id) base.where('i.variant_id', variant_id)
    if (warehouse_id) base.where('i.warehouse_id', warehouse_id)
    if (product_id) base.where('v.product_id', product_id)
    if (product_type) base.where('p.product_type', product_type)
    if (search) {
      base.where((qb) => {
        qb.whereILike('v.name', `%${search}%`).orWhereILike('v.sku', `%${search}%`).orWhereILike('v.item_code', `%${search}%`)
      })
    }

    const [rows, countResult] = await Promise.all([
      base.clone().having(this.db.raw('SUM(i.qty_on_hand) > 0')).orderBy('v.item_code').limit(limit).offset(offset),
      base.clone().clearSelect().count(this.db.raw('DISTINCT i.variant_id') as any).first(),
    ])

    return { data: rows, total: Number(countResult?.count ?? 0), page, limit }
  }

  findSerials(query: ListSerialsQuery) {
    const base = this.db('serial_numbers as sn').leftJoin('warehouses as w', 'w.id', 'sn.warehouse_id')

    if (query.search) {
      return base
        .leftJoin('variants as v', 'v.id', 'sn.variant_id')
        .leftJoin('receipt_lines as rl', 'rl.id', 'sn.receipt_line_id')
        .leftJoin('receipts as r', 'r.id', 'rl.receipt_id')
        .whereILike('sn.serial_no', `%${query.search}%`)
        .select(
          'sn.id',
          'sn.serial_no',
          'sn.status',
          'v.sku',
          'v.name as variant_name',
          'w.name as warehouse_name',
          'r.code as receipt_code',
          'sn.mac_address',
          'sn.manufacturer_warranty_end',
          'sn.customer_warranty_end',
          'sn.created_at',
        )
        .orderBy('sn.serial_no')
        .limit(50)
    }

    // Mode tab Tồn kho: tất cả SN của 1 variant (không lọc kho), kèm kho + phiếu nhập.
    // Khác mode chọn SN khi xuất kho (cần cả warehouse_id) — đây chỉ cần variant_id.
    if (query.variant_id && !query.warehouse_id) {
      return base
        .leftJoin('receipt_lines as rl', 'rl.id', 'sn.receipt_line_id')
        .leftJoin('receipts as r', 'r.id', 'rl.receipt_id')
        .where('sn.variant_id', query.variant_id)
        .select(
          'sn.id',
          'sn.serial_no',
          'sn.status',
          'w.name as warehouse_name',
          'r.code as receipt_code',
          'r.completed_at',
          'sn.mac_address',
          'rl.manufacturer_warranty_months',
          'rl.customer_warranty_months',
          'sn.manufacturer_warranty_end',
          'sn.customer_warranty_end',
        )
        .orderBy([
          { column: 'r.completed_at', order: 'asc' },
          { column: 'sn.serial_no', order: 'asc' },
        ])
    }

    // Mode chọn SN cho Complete phiếu xuất — trả tất cả SN active của 1 SKU trong 1 kho,
    // kèm thông tin lô (receipt_code, cost_price, warranty_months, po_code) để user filter.
    // FIFO order (receipts.completed_at + line_order) nhất quán với CLAUDE.md mục 19.
    if (query.variant_id && query.warehouse_id) {
      return base
        .leftJoin('receipt_lines as rl', 'rl.id', 'sn.receipt_line_id')
        .leftJoin('receipts as r', 'r.id', 'rl.receipt_id')
        .leftJoin('purchase_order_lines as pol', 'pol.id', 'rl.po_line_id')
        .leftJoin('purchase_orders as po', 'po.id', 'pol.purchase_order_id')
        .where('sn.variant_id', query.variant_id)
        .andWhere('sn.warehouse_id', query.warehouse_id)
        .andWhere('sn.status', 'active')
        .select(
          'sn.id',
          'sn.serial_no',
          'sn.warehouse_id',
          'r.code as receipt_code',
          'r.completed_at as received_at',
          'rl.cost_price',
          'rl.manufacturer_warranty_months',
          'rl.customer_warranty_months',
          'sn.manufacturer_warranty_end',
          'sn.customer_warranty_end',
          'sn.mac_address',
          'po.code as po_code',
        )
        .orderBy([
          { column: 'r.completed_at', order: 'asc' },
          { column: 'rl.line_order', order: 'asc' },
          { column: 'sn.serial_no', order: 'asc' },
        ])
    }

    return base
      .where('sn.receipt_line_id', query.receipt_line_id)
      .select(
        'sn.id',
        'sn.serial_no',
        'sn.status',
        'sn.warehouse_id',
        'w.name as warehouse_name',
        'sn.mac_address',
        'sn.manufacturer_warranty_end',
        'sn.customer_warranty_end',
        'sn.created_at',
      )
      .orderBy('sn.serial_no')
  }

  findReservedByVariant(variantId: string) {
    return this.db('reserved_items as ri')
      .where('ri.variant_id', variantId)
      .leftJoin('quotations as q', (j) =>
        j.on('q.id', 'ri.source_id').andOnVal('ri.source_type', 'quotation'),
      )
      .leftJoin('delivery_orders as dord', (j) =>
        j.on('dord.id', 'ri.source_id').andOnVal('ri.source_type', 'delivery_order'),
      )
      .leftJoin('companies as cq', 'cq.id', 'q.company_id')
      .leftJoin('companies as cd', 'cd.id', 'dord.company_id')
      .groupBy('ri.source_type', 'ri.source_id', 'q.code', 'q.status', 'cq.name', 'dord.code', 'dord.status', 'cd.name')
      .select(
        'ri.source_type',
        'ri.source_id',
        this.db.raw('SUM(ri.quantity)::int as qty'),
        this.db.raw("COALESCE(q.code, dord.code) as doc_code"),
        this.db.raw("COALESCE(q.status, dord.status) as doc_status"),
        this.db.raw("COALESCE(cq.name, cd.name) as customer_name"),
      )
      .orderBy(this.db.raw("COALESCE(q.code, dord.code)"))
  }

  findSerialById(id: string) {
    return this.db('serial_numbers').where({ id }).first()
  }

  updateSerial(id: string, data: { serial_no?: string; mac_address?: string | null; note?: string | null }) {
    return this.db('serial_numbers')
      .where({ id })
      .update({ ...data, updated_at: this.db.fn.now() })
      .returning('*')
      .then((rows) => rows[0])
  }

  // Lịch sử di chuyển (nhập/xuất/chuyển kho) của ĐÚNG 1 SN — stock_movements.serial_id
  // chỉ được ghi cho dòng storable (receipt/delivery/transfer.service.ts), không có ở
  // dòng consumable (serial_id luôn null nên không match where này).
  findMovementsBySerial(serialId: string) {
    return this.db('stock_movements as sm')
      .leftJoin('warehouses as w', 'w.id', 'sm.warehouse_id')
      .where('sm.serial_id', serialId)
      .select(
        'sm.id',
        'sm.movement_type',
        'sm.quantity',
        'sm.unit_cost',
        'w.name as warehouse_name',
        'sm.ref_document_type',
        'sm.ref_document_id',
        'sm.created_at',
      )
      .orderBy('sm.created_at')
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
        .groupBy('v.id', 'v.sku', 'v.item_code', 'v.name', 'v.reorder_point')
        .havingRaw('COALESCE(SUM(i.qty_on_hand), 0) < v.reorder_point')

    const [rows, countResult] = await Promise.all([
      grouped()
        .select(
          'v.id as variant_id',
          'v.sku',
          'v.item_code',
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
