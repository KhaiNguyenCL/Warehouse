import type { FastifyPluginAsync } from 'fastify'
import { authenticate } from '../../middleware/auth'

const STATUS_VI: Record<string, string> = {
  draft:            'Nháp',
  confirmed:        'Đã xác nhận',
  cancelled:        'Đã huỷ',
  pending_approval: 'Chờ duyệt',
  approved:         'Đã duyệt',
  completed:        'Hoàn thành',
  received:         'Đã nhận',
  expired:          'Hết hạn',
  in_progress:      'Đang kiểm kê',
}

const TYPE_LABEL: Record<string, string> = {
  company:        'Đối tác',
  product:        'Sản phẩm',
  variant:        'SKU',
  purchase_order: 'Phiếu mua hàng',
  quotation:      'Báo giá',
  receipt:        'Phiếu nhập kho',
  delivery:       'Phiếu xuất kho',
  shipment:       'Phiếu nhận hàng',
  transfer:       'Chuyển kho',
  serial:         'Serial Number',
}

const searchRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: { q?: string } }>(
    '/',
    { preHandler: [authenticate] },
    async (request) => {
      const q = (request.query.q ?? '').trim()
      if (q.length < 2) return { results: [] }

      const db = app.db
      const pat = `%${q}%`
      const N = 5

      const [
        companies, products, variants,
        pos, quotations, receipts,
        deliveries, shipments, transfers, serials,
      ] = await Promise.all([
        db('companies')
          .where((b) => b.whereILike('name', pat).orWhereILike('code', pat))
          .limit(N).select('id', 'name', 'code'),

        db('products')
          .where((b) => b.whereILike('name', pat).orWhereILike('code', pat))
          .limit(N).select('id', 'name', 'code'),

        db('variants as v')
          .join('products as p', 'p.id', 'v.product_id')
          .where((b) => b.whereILike('v.sku', pat).orWhereILike('v.name', pat))
          .limit(N).select('v.id', 'v.sku', 'v.name', 'v.product_id'),

        db('purchase_orders').whereNull('deleted_at')
          .whereILike('code', pat)
          .limit(N).select('id', 'code', 'status'),

        db('quotations')
          .whereILike('code', pat)
          .limit(N).select('id', 'code', 'status'),

        db('receipts')
          .whereILike('code', pat)
          .limit(N).select('id', 'code', 'status'),

        db('delivery_orders')
          .whereILike('code', pat)
          .limit(N).select('id', 'code', 'status'),

        db('shipments')
          .whereILike('code', pat)
          .limit(N).select('id', 'code', 'status'),

        db('transfer_orders')
          .whereILike('code', pat)
          .limit(N).select('id', 'code', 'status'),

        db('serial_numbers')
          .whereILike('serial_no', pat)
          .limit(N).select('id', 'serial_no'),
      ])

      const results = [
        ...companies.map((r: any) => ({
          type: 'company', id: r.id,
          title: r.name, subtitle: r.code ?? '',
          link: `/companies/${r.id}`,
        })),
        ...products.map((r: any) => ({
          type: 'product', id: r.id,
          title: r.name, subtitle: r.code,
          link: `/products/${r.id}`,
        })),
        ...variants.map((r: any) => ({
          type: 'variant', id: r.id,
          title: r.sku, subtitle: r.name,
          link: `/products/${r.product_id}`,
        })),
        ...pos.map((r: any) => ({
          type: 'purchase_order', id: r.id,
          title: r.code, subtitle: STATUS_VI[r.status] ?? r.status,
          link: `/purchase-orders/${r.id}`,
        })),
        ...quotations.map((r: any) => ({
          type: 'quotation', id: r.id,
          title: r.code, subtitle: STATUS_VI[r.status] ?? r.status,
          link: `/quotations/${r.id}`,
        })),
        ...receipts.map((r: any) => ({
          type: 'receipt', id: r.id,
          title: r.code, subtitle: STATUS_VI[r.status] ?? r.status,
          link: `/receipts/${r.id}`,
        })),
        ...deliveries.map((r: any) => ({
          type: 'delivery', id: r.id,
          title: r.code, subtitle: STATUS_VI[r.status] ?? r.status,
          link: `/deliveries/${r.id}`,
        })),
        ...shipments.map((r: any) => ({
          type: 'shipment', id: r.id,
          title: r.code, subtitle: STATUS_VI[r.status] ?? r.status,
          link: `/shipments/${r.id}`,
        })),
        ...transfers.map((r: any) => ({
          type: 'transfer', id: r.id,
          title: r.code, subtitle: STATUS_VI[r.status] ?? r.status,
          link: `/transfers/${r.id}`,
        })),
        ...serials.map((r: any) => ({
          type: 'serial', id: r.id,
          title: r.serial_no, subtitle: 'Serial Number',
          link: `/inventory?sn=${encodeURIComponent(r.serial_no)}`,
        })),
      ]

      // group by type để frontend dùng nếu cần
      const grouped: Record<string, typeof results> = {}
      for (const item of results) {
        if (!grouped[item.type]) grouped[item.type] = []
        grouped[item.type].push(item)
      }

      return { results, grouped, typeLabels: TYPE_LABEL }
    },
  )
}

export default searchRoutes
