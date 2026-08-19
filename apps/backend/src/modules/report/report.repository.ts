import { Knex } from 'knex'

export class ReportRepository {
  constructor(private db: Knex) {}

  // ─── report.inventory ───────────────────────────────────────────────────────

  inventorySummary(warehouseId?: string) {
    const base = this.db('inventory as i')
    if (warehouseId) base.where('i.warehouse_id', warehouseId)

    return base
      .select(
        this.db.raw('COUNT(DISTINCT i.variant_id)::int as total_skus'),
        this.db.raw('COALESCE(SUM(i.qty_on_hand), 0)::int as total_qty_on_hand'),
        this.db.raw('COALESCE(SUM(i.qty_reserved), 0)::int as total_qty_reserved'),
        this.db.raw('COALESCE(SUM(i.qty_on_hand * i.avg_cost), 0)::numeric as total_value'),
      )
      .first()
  }

  inventoryByCategory(warehouseId?: string) {
    const base = this.db('inventory as i')
      .join('variants as v', 'v.id', 'i.variant_id')
      .join('products as p', 'p.id', 'v.product_id')
      .leftJoin('categories as c', 'c.id', 'p.category_id')
    if (warehouseId) base.where('i.warehouse_id', warehouseId)

    return base
      .groupBy('c.id', 'c.name')
      .select(
        'c.id as category_id',
        'c.name as category_name',
        this.db.raw('COUNT(DISTINCT i.variant_id)::int as total_skus'),
        this.db.raw('COALESCE(SUM(i.qty_on_hand), 0)::int as total_qty_on_hand'),
        this.db.raw('COALESCE(SUM(i.qty_on_hand * i.avg_cost), 0)::numeric as total_value'),
      )
      .orderBy('total_value', 'desc')
  }

  // ─── report.revenue ─────────────────────────────────────────────────────────
  // Doanh thu = SUM(quantity đã xuất thực tế × unit_price của dòng báo giá gốc), chỉ tính
  // dòng DO completed có quotation_line_item_id (export_type='sale' từ Quotation). Đây là
  // số liệu VẬN HÀNH (hàng đã xuất trị giá bao nhiêu theo giá báo), CHƯA phân bổ
  // discount/VAT ở cấp Quotation xuống từng dòng — không dùng làm số liệu kế toán cuối cùng.
  private revenueBase(from?: string, to?: string) {
    const base = this.db('delivery_order_lines as dl')
      .join('delivery_orders as d', 'd.id', 'dl.delivery_order_id')
      .join('quotation_line_items as qli', 'qli.id', 'dl.quotation_line_item_id')
      .where('d.status', 'completed')
    if (from) base.where('d.completed_at', '>=', from)
    if (to) base.where('d.completed_at', '<=', to)
    return base
  }

  revenueSummary(from?: string, to?: string) {
    return this.revenueBase(from, to)
      .select(
        this.db.raw('COALESCE(SUM(dl.quantity * qli.unit_price), 0)::numeric as total_revenue'),
        this.db.raw('COUNT(DISTINCT d.id)::int as total_orders'),
        this.db.raw('COALESCE(SUM(dl.quantity), 0)::int as total_qty'),
      )
      .first()
  }

  revenueTimeSeries(from: string | undefined, to: string | undefined, groupBy: 'day' | 'month') {
    const trunc = groupBy === 'month' ? 'month' : 'day'
    return this.revenueBase(from, to)
      .select(this.db.raw(`DATE_TRUNC('${trunc}', d.completed_at) as period`))
      .sum({ revenue: this.db.raw('dl.quantity * qli.unit_price') })
      .count({ orders: this.db.raw('DISTINCT d.id') })
      .groupBy('period')
      .orderBy('period')
  }

  topProducts(from: string | undefined, to: string | undefined, limit: number) {
    return this.revenueBase(from, to)
      .join('variants as v', 'v.id', 'dl.variant_id')
      .groupBy('v.id', 'v.sku', 'v.item_code', 'v.name')
      .select(
        'v.id as variant_id',
        'v.sku',
        'v.item_code',
        'v.name as variant_name',
        this.db.raw('SUM(dl.quantity)::int as total_qty'),
        this.db.raw('SUM(dl.quantity * qli.unit_price)::numeric as total_revenue'),
      )
      .orderBy('total_revenue', 'desc')
      .limit(limit)
  }

  // ─── report.view (dashboard tổng hợp) ──────────────────────────────────────

  async dashboard() {
    const [
      pendingReceipts, pendingDeliveries, pendingTransfers,
      activeStocktakes, expiringQuotations,
      lowStock, outOfStock, invValue, totalCompanies,
    ] = await Promise.all([
      this.db('receipts').whereIn('status', ['draft', 'pending_approval', 'approved']).count('id as count').first(),
      this.db('delivery_orders').whereIn('status', ['draft', 'pending_approval', 'approved']).count('id as count').first(),
      this.db('transfer_orders').whereIn('status', ['draft', 'pending_approval', 'approved']).count('id as count').first(),
      this.db('stocktakes').where('status', 'in_progress').count('id as count').first(),
      this.db('quotations')
        .where('status', 'confirmed')
        .where('expired_at', '<=', this.db.raw("now() + interval '7 days'"))
        .count('id as count')
        .first(),
      // SKU có tồn khả dụng > 0 nhưng <= reorder_point (sắp hết)
      this.db('inventory as i')
        .join('variants as v', 'v.id', 'i.variant_id')
        .groupBy('i.variant_id', 'v.reorder_point')
        .havingRaw('SUM(i.qty_on_hand - i.qty_reserved) > 0')
        .havingRaw('v.reorder_point IS NOT NULL AND SUM(i.qty_on_hand - i.qty_reserved) <= v.reorder_point')
        .count('* as count')
        .first(),
      // SKU hết hàng (qty_available <= 0)
      this.db('inventory as i')
        .groupBy('i.variant_id')
        .havingRaw('SUM(i.qty_on_hand - i.qty_reserved) <= 0')
        .count('* as count')
        .first(),
      // Tổng giá trị tồn kho
      this.db('inventory as i')
        .select(this.db.raw('COALESCE(SUM(i.qty_on_hand * i.avg_cost), 0)::numeric as value'))
        .first(),
      // Tổng số công ty
      this.db('companies').count('id as count').first(),
    ])

    return {
      pending_receipts:         Number(pendingReceipts?.count ?? 0),
      pending_deliveries:       Number(pendingDeliveries?.count ?? 0),
      pending_transfers:        Number(pendingTransfers?.count ?? 0),
      active_stocktakes:        Number(activeStocktakes?.count ?? 0),
      quotations_expiring_soon: Number(expiringQuotations?.count ?? 0),
      low_stock_count:          Number(lowStock?.count ?? 0),
      out_of_stock_count:       Number(outOfStock?.count ?? 0),
      inventory_value:          Number((invValue as any)?.value ?? 0),
      total_companies:          Number(totalCompanies?.count ?? 0),
    }
  }

  // Pipeline báo giá: backlog (confirmed chưa xuất hết) + fulfillment rate tháng này
  async salesPipeline() {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const [pipeline, thisMonthDelivered] = await Promise.all([
      // Tổng giá trị confirmed quotations + backlog còn lại
      // backlog = total - đã xuất (DO completed có quotation_line_item_id)
      this.db('quotation_line_items as qli')
        .join('quotation_sections as qs', 'qs.id', 'qli.section_id')
        .join('quotations as q', 'q.id', 'qs.quotation_id')
        .leftJoin(
          this.db('delivery_order_lines as dl2')
            .join('delivery_orders as d2', 'd2.id', 'dl2.delivery_order_id')
            .where('d2.status', 'completed')
            .whereNotNull('dl2.quotation_line_item_id')
            .select('dl2.quotation_line_item_id')
            .sum({ delivered_qty: 'dl2.quantity' })
            .groupBy('dl2.quotation_line_item_id')
            .as('del'),
          'del.quotation_line_item_id', 'qli.id',
        )
        .where('q.status', 'confirmed')
        .whereNotNull('qli.variant_id')
        .select(
          this.db.raw('COUNT(DISTINCT q.id)::int as confirmed_count'),
          this.db.raw('COALESCE(SUM(qli.quantity * qli.unit_price), 0)::numeric as total_value'),
          this.db.raw('COALESCE(SUM((qli.quantity - COALESCE(del.delivered_qty, 0)) * qli.unit_price), 0)::numeric as backlog_value'),
        )
        .first(),

      // Giá trị đã xuất (DO completed) trong tháng này — chỉ từ sale quotation
      this.db('delivery_order_lines as dl')
        .join('delivery_orders as d', 'd.id', 'dl.delivery_order_id')
        .join('quotation_line_items as qli', 'qli.id', 'dl.quotation_line_item_id')
        .where('d.status', 'completed')
        .where('d.completed_at', '>=', monthStart)
        .select(this.db.raw('COALESCE(SUM(dl.quantity * qli.unit_price), 0)::numeric as value'))
        .first(),
    ])

    const totalValue   = Number((pipeline as any)?.total_value ?? 0)
    const backlogValue = Number((pipeline as any)?.backlog_value ?? 0)
    const deliveredValue = totalValue - backlogValue
    const fulfillmentRate = totalValue > 0 ? Math.round((deliveredValue / totalValue) * 100) : 0

    return {
      confirmed_count:       Number((pipeline as any)?.confirmed_count ?? 0),
      total_value:           totalValue,
      backlog_value:         backlogValue,
      delivered_value:       deliveredValue,
      fulfillment_rate:      fulfillmentRate,
      this_month_delivered:  Number((thisMonthDelivered as any)?.value ?? 0),
    }
  }

  // Dòng chảy hàng hoá: nhập kho vs xuất kho theo giá trị tiền, group by ngày/tháng
  stockFlow(from: string | undefined, to: string | undefined, groupBy: 'day' | 'month') {
    const trunc = groupBy === 'month' ? 'month' : 'day'

    const receiptsQ = this.db('receipt_lines as rl')
      .join('receipts as r', 'r.id', 'rl.receipt_id')
      .where('r.status', 'completed')
      .modify((q) => { if (from) q.where('r.completed_at', '>=', from); if (to) q.where('r.completed_at', '<=', to) })
      .select(this.db.raw(`DATE_TRUNC('${trunc}', r.completed_at) as period`))
      .sum({ value: this.db.raw('rl.quantity * rl.cost_price') })
      .groupBy('period')

    const deliveriesQ = this.db('delivery_order_lines as dl')
      .join('delivery_orders as d', 'd.id', 'dl.delivery_order_id')
      .join('quotation_line_items as qli', 'qli.id', 'dl.quotation_line_item_id')
      .where('d.status', 'completed')
      .modify((q) => { if (from) q.where('d.completed_at', '>=', from); if (to) q.where('d.completed_at', '<=', to) })
      .select(this.db.raw(`DATE_TRUNC('${trunc}', d.completed_at) as period`))
      .sum({ value: this.db.raw('dl.quantity * qli.unit_price') })
      .groupBy('period')

    return Promise.all([receiptsQ, deliveriesQ]).then(([receipts, deliveries]) => {
      const map = new Map<string, { receipts: number; deliveries: number }>()
      for (const r of receipts) {
        const k = String(r.period)
        map.set(k, { receipts: Number(r.value ?? 0), deliveries: 0 })
      }
      for (const d of deliveries) {
        const k = String(d.period)
        const existing = map.get(k) ?? { receipts: 0, deliveries: 0 }
        map.set(k, { ...existing, deliveries: Number(d.value ?? 0) })
      }
      return Array.from(map.entries())
        .map(([period, v]) => ({ period, ...v }))
        .sort((a, b) => a.period.localeCompare(b.period))
    })
  }

  // Top SKU sắp hết hàng (dưới reorder_point hoặc qty_available = 0)
  lowStockItems(limit = 20) {
    return this.db('inventory as i')
      .join('variants as v', 'v.id', 'i.variant_id')
      .join('products as p', 'p.id', 'v.product_id')
      .leftJoin('categories as c', 'c.id', 'p.category_id')
      .groupBy('i.variant_id', 'v.item_code', 'v.name', 'v.unit', 'v.reorder_point', 'c.name')
      .select(
        'i.variant_id',
        'v.item_code',
        'v.name as variant_name',
        'v.unit',
        'v.reorder_point',
        'c.name as category_name',
        this.db.raw('SUM(i.qty_on_hand - i.qty_reserved)::int as qty_available'),
      )
      .havingRaw('SUM(i.qty_on_hand - i.qty_reserved) <= COALESCE(v.reorder_point, 0)')
      .orderBy('qty_available', 'asc')
      .limit(limit)
  }
}
