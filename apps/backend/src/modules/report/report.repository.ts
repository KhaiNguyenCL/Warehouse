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
    const [pendingReceipts, pendingDeliveries, pendingTransfers, activeStocktakes, expiringQuotations, totalProducts, totalCompanies] =
      await Promise.all([
        this.db('receipts').where('status', 'draft').count('id as count').first(),
        this.db('delivery_orders').where('status', 'draft').count('id as count').first(),
        this.db('transfer_orders').where('status', 'draft').count('id as count').first(),
        this.db('stocktakes').where('status', 'in_progress').count('id as count').first(),
        this.db('quotations')
          .where('status', 'confirmed')
          .where('expired_at', '<=', this.db.raw("now() + interval '7 days'"))
          .count('id as count')
          .first(),
        this.db('products').where('is_active', true).count('id as count').first(),
        this.db('companies').count('id as count').first(),
      ])

    return {
      pending_receipts: Number(pendingReceipts?.count ?? 0),
      pending_deliveries: Number(pendingDeliveries?.count ?? 0),
      pending_transfers: Number(pendingTransfers?.count ?? 0),
      active_stocktakes: Number(activeStocktakes?.count ?? 0),
      quotations_expiring_soon: Number(expiringQuotations?.count ?? 0),
      total_products: Number(totalProducts?.count ?? 0),
      total_companies: Number(totalCompanies?.count ?? 0),
    }
  }
}
