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
    // Phiếu "chờ xử lý quá hạn" — chỉ tính pending_approval/approved (đang chặn người khác),
    // không tính draft (còn của người tạo, chưa ai đợi). Ngưỡng 2 ngày khớp overdueDocuments().
    const overdueWhere = (qb: Knex.QueryBuilder) =>
      qb.whereIn('status', ['pending_approval', 'approved'])
        .andWhere('created_at', '<', this.db.raw("now() - interval '2 days'"))

    const [
      pendingReceipts, pendingDeliveries, pendingTransfers,
      overdueReceipts, overdueDeliveries, overdueTransfers,
      activeStocktakes, expiringQuotations,
      lowStock, outOfStock, invValue, totalCompanies,
    ] = await Promise.all([
      this.db('receipts').whereIn('status', ['draft', 'pending_approval', 'approved']).count('id as count').first(),
      this.db('delivery_orders').whereIn('status', ['draft', 'pending_approval', 'approved']).count('id as count').first(),
      this.db('transfer_orders').whereIn('status', ['draft', 'pending_approval', 'approved']).count('id as count').first(),
      this.db('receipts').where(overdueWhere).count('id as count').first(),
      this.db('delivery_orders').where(overdueWhere).count('id as count').first(),
      this.db('transfer_orders').where(overdueWhere).count('id as count').first(),
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
      overdue_receipts:         Number(overdueReceipts?.count ?? 0),
      overdue_deliveries:       Number(overdueDeliveries?.count ?? 0),
      overdue_transfers:        Number(overdueTransfers?.count ?? 0),
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

  // Danh sách báo giá confirmed đang có backlog (chưa xuất hết) — cho hover ở card Pipeline
  async backlogQuotations(limit = 20) {
    const rows = await this.db('quotation_line_items as qli')
      .join('quotation_sections as qs', 'qs.id', 'qli.section_id')
      .join('quotations as q', 'q.id', 'qs.quotation_id')
      .leftJoin('companies as c', 'c.id', 'q.company_id')
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
      .groupBy('q.id', 'q.code', 'c.name')
      .havingRaw('COALESCE(SUM((qli.quantity - COALESCE(del.delivered_qty, 0)) * qli.unit_price), 0) > 0')
      .select(
        'q.id as quotation_id',
        'q.code as quotation_code',
        'c.name as customer_name',
        this.db.raw('COALESCE(SUM((qli.quantity - COALESCE(del.delivered_qty, 0)) * qli.unit_price), 0)::numeric as backlog_value'),
      )
      .orderByRaw('backlog_value desc')
      .limit(limit)

    return rows.map((r: any) => ({
      quotation_id:   r.quotation_id,
      quotation_code: r.quotation_code,
      customer_name:  r.customer_name ?? null,
      backlog_value:  Number(r.backlog_value),
    }))
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

  // Tồn kho theo từng kho — LEFT JOIN từ warehouses (không phải từ inventory) để kho chưa có
  // hàng nào (vd kho ảo chờ nhập SN) vẫn xuất hiện trong danh sách với giá trị 0, không bị ẩn.
  inventoryByWarehouse() {
    return this.db('warehouses as w')
      .leftJoin('inventory as i', 'i.warehouse_id', 'w.id')
      .where('w.is_active', true)
      .groupBy('w.id', 'w.name')
      .select(
        'w.id as warehouse_id',
        'w.name as warehouse_name',
        this.db.raw('COUNT(DISTINCT i.variant_id)::int as total_skus'),
        this.db.raw('COALESCE(SUM(i.qty_on_hand), 0)::int as total_qty'),
        this.db.raw('COALESCE(SUM(i.qty_reserved), 0)::int as total_qty_reserved'),
        this.db.raw('COALESCE(SUM(i.qty_on_hand * i.avg_cost), 0)::numeric as total_value'),
      )
      .orderBy('total_value', 'desc')
  }

  // SKU còn tồn (qty_on_hand > 0) nhưng không phát sinh stock_movement nào trong `days` ngày
  // gần nhất (hoặc CHƯA TỪNG phát sinh — MAX(sm.created_at) IS NULL) — ứng viên "chậm luân
  // chuyển", gợi ý khuyến mãi/điều chuyển kho. days_since_movement trả 999999 khi chưa từng
  // có movement (không suy đoán ngày ảo).
  slowMovingStock(days = 60, limit = 10) {
    return this.db('inventory as i')
      .join('variants as v', 'v.id', 'i.variant_id')
      .leftJoin('stock_movements as sm', function () {
        this.on('sm.variant_id', 'i.variant_id').andOn('sm.warehouse_id', 'i.warehouse_id')
      })
      .where('i.qty_on_hand', '>', 0)
      .groupBy('i.id', 'v.item_code', 'v.name', 'i.qty_on_hand', 'i.avg_cost')
      .havingRaw('MAX(sm.created_at) IS NULL OR MAX(sm.created_at) < now() - make_interval(days => ?)', [days])
      .select(
        'i.variant_id',
        'v.item_code',
        'v.name as variant_name',
        'i.qty_on_hand',
        this.db.raw('(i.qty_on_hand * i.avg_cost)::numeric as value'),
        this.db.raw('MAX(sm.created_at) as last_movement_at'),
        this.db.raw("COALESCE(EXTRACT(DAY FROM now() - MAX(sm.created_at))::int, 999999) as days_since_movement"),
      )
      .orderBy('days_since_movement', 'desc')
      .limit(limit)
  }

  // Chụp 1 "ảnh" giá trị tồn kho + pipeline TẠI THỜI ĐIỂM GỌI — dùng bởi cron job
  // (plugins/scheduler.ts) để dựng lịch sử cho sparkline/delta ở KPI band. Upsert theo
  // snapshot_date (unique) — gọi nhiều lần trong cùng 1 ngày (server restart, catch-up lúc
  // onReady) sẽ ghi đè, không tạo trùng, và luôn phản ánh số MỚI NHẤT trong ngày.
  async captureSnapshot() {
    const [inv, pipeline] = await Promise.all([this.inventorySummary(), this.salesPipeline()])
    const today = new Date().toISOString().slice(0, 10)
    const [row] = await this.db('report_snapshots')
      .insert({
        snapshot_date:             today,
        total_inventory_value:     Number((inv as any)?.total_value ?? 0),
        pipeline_total_value:      pipeline.total_value,
        pipeline_backlog_value:    pipeline.backlog_value,
        pipeline_delivered_value:  pipeline.delivered_value,
      })
      .onConflict('snapshot_date')
      .merge()
      .returning('*')
    return row
  }

  // Lịch sử `days` ngày gần nhất cho dải KPI ở đầu trang Báo cáo — ghép report_snapshots
  // (tồn kho/pipeline) với revenueTimeSeries (doanh thu, đã có sẵn thời gian thực, không cần
  // snapshot riêng). Nếu chưa đủ 2 điểm (tính năng mới bật, chưa qua đêm nào) → deltas/turnover
  // trả null thay vì suy đoán số ảo — frontend tự ẩn phần % thay đổi khi gặp null.
  async kpiTrend(days = 14) {
    const to = new Date()
    const from = new Date(to)
    from.setDate(from.getDate() - (days - 1))
    const fromStr = from.toISOString().slice(0, 10)
    const toStr = to.toISOString().slice(0, 10)

    // Lấy ngày dưới dạng chuỗi 'YYYY-MM-DD' NGAY TRONG SQL (to_char) thay vì để node-pg parse
    // thành JS Date rồi tự format — pg parse cột `date` thành Date ở LOCAL MIDNIGHT, còn
    // `completed_at` là timestamptz thật; gọi .toISOString() trên 2 loại đó lệch múi giờ khác
    // nhau, snapshot_date và ngày doanh thu có thể lệch nhau 1 ngày (server ở giờ VN, UTC+7)
    // và không khớp khi ghép — phải quy cả 2 về đúng 1 mốc "ngày theo UTC" ngay trong SQL.
    const [snapshots, revenueRows] = await Promise.all([
      this.db('report_snapshots')
        .where('snapshot_date', '>=', fromStr)
        .where('snapshot_date', '<=', toStr)
        .orderBy('snapshot_date', 'asc')
        .select('*', this.db.raw("to_char(snapshot_date, 'YYYY-MM-DD') as date_key")),
      this.revenueBase(fromStr, toStr)
        .select(this.db.raw("to_char(d.completed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') as date_key"))
        .sum({ revenue: this.db.raw('dl.quantity * qli.unit_price') })
        .groupBy('date_key'),
    ])

    const revenueByDate = new Map<string, number>()
    for (const r of revenueRows as any[]) {
      revenueByDate.set(r.date_key, Number(r.revenue ?? 0))
    }

    const points = (snapshots as any[]).map((s) => {
      const date = s.date_key as string
      const totalValue = Number(s.pipeline_total_value)
      const deliveredValue = Number(s.pipeline_delivered_value)
      return {
        date,
        inventory_value:  Number(s.total_inventory_value),
        backlog_value:     Number(s.pipeline_backlog_value),
        delivered_value:   deliveredValue,
        fulfillment_rate:  totalValue > 0 ? Math.round((deliveredValue / totalValue) * 100) : 0,
        revenue:           revenueByDate.get(date) ?? 0,
      }
    })

    const hasHistory = points.length >= 2
    const first = points[0]
    const last = points[points.length - 1]

    // % thay đổi — null nếu điểm đầu = 0 (chia 0 vô nghĩa) thay vì trả Infinity/số ảo.
    function pctDelta(a: number, b: number): number | null {
      if (!hasHistory) return null
      if (a === 0) return b === 0 ? 0 : null
      return Math.round(((b - a) / a) * 1000) / 10
    }
    function ptDelta(a: number, b: number): number | null {
      return hasHistory ? Math.round(b - a) : null
    }

    const revenueSum = points.reduce((sum, p) => sum + p.revenue, 0)
    const avgInventoryValue = points.length > 0
      ? points.reduce((sum, p) => sum + p.inventory_value, 0) / points.length
      : 0
    const turnover = hasHistory && avgInventoryValue > 0
      ? Math.round((revenueSum / avgInventoryValue) * 100) / 100
      : null

    return {
      points,
      deltas: {
        revenue_pct:          hasHistory ? pctDelta(first.revenue, last.revenue) : null,
        inventory_value_pct:  hasHistory ? pctDelta(first.inventory_value, last.inventory_value) : null,
        backlog_value_pct:    hasHistory ? pctDelta(first.backlog_value, last.backlog_value) : null,
        fulfillment_rate_pt:  ptDelta(first?.fulfillment_rate ?? 0, last?.fulfillment_rate ?? 0),
      },
      turnover,
    }
  }

  // Phiếu đang pending_approval/approved quá lâu (mặc định > 2 ngày) — nêu đích danh phiếu
  // nào bị "ngâm" thay vì chỉ đếm tổng số đang chờ (đối xứng overdue_* trong dashboard()).
  // draft không tính vì còn của người tạo, chưa ai khác bị chặn bởi nó.
  overdueDocuments(days = 2, limit = 20) {
    const daysPendingExpr = "EXTRACT(DAY FROM now() - created_at)::int as days_pending"
    const cols = (docType: string) => [
      this.db.raw('? as doc_type', [docType]),
      'id', 'code', 'status', 'created_at',
      this.db.raw(daysPendingExpr),
    ]
    const overdueWhere = (qb: Knex.QueryBuilder) =>
      qb.whereIn('status', ['pending_approval', 'approved'])
        .andWhere('created_at', '<', this.db.raw("now() - (? || ' days')::interval", [days]))

    const receipts   = this.db('receipts').where(overdueWhere).select(cols('receipt'))
    const deliveries = this.db('delivery_orders').where(overdueWhere).select(cols('delivery_order'))
    const transfers  = this.db('transfer_orders').where(overdueWhere).select(cols('transfer_order'))

    return receipts.unionAll([deliveries, transfers]).orderBy('days_pending', 'desc').limit(limit)
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
