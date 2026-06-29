import { FastifyPluginAsync } from 'fastify'
import { InventoryService } from './inventory.service'
import {
  listInventorySchema,
  listLowStockSchema,
  listLotsSchema,
  listSerialsSchema,
  ListInventoryQuery,
  ListLowStockQuery,
  ListLotsQuery,
  ListSerialsQuery,
} from './inventory.schema'
import { requirePermission } from '../../middleware/permission'

const inventoryRoutes: FastifyPluginAsync = async (app) => {
  const service = new InventoryService(app.db)

  // GET /inventory — đặt trước /low-stock trong cùng module không quan trọng vì
  // path khác nhau hẳn, không bị Fastify route /:id nào ăn nhầm.
  app.get<{ Querystring: ListInventoryQuery }>(
    '/',
    { schema: listInventorySchema, preHandler: requirePermission('report.inventory') },
    async (request) => service.list(request.query),
  )

  // GET /inventory/lots — breakdown từng lô (receipt_line) của 1 SKU, giá/bảo hành/
  // qty_remaining riêng từng lần nhập — inventory chỉ có số tổng hợp, không thấy được điều này.
  app.get<{ Querystring: ListLotsQuery }>(
    '/lots',
    { schema: listLotsSchema, preHandler: requirePermission('report.inventory') },
    async (request) => service.lots(request.query),
  )

  // GET /inventory/serials — chi tiết từng SN vật lý của 1 lô (drill-down từ /lots).
  app.get<{ Querystring: ListSerialsQuery }>(
    '/serials',
    { schema: listSerialsSchema, preHandler: requirePermission('report.inventory') },
    async (request) => service.serials(request.query),
  )

  // PATCH /inventory/serials/:id — sửa thông tin SN sau khi nhập kho (mac_address, note).
  // Chỉ cho sửa field thông tin bổ sung, không cho đổi status/warehouse qua đây.
  app.patch<{ Params: { id: string }; Body: { serial_no?: string; mac_address?: string | null; note?: string | null } }>(
    '/serials/:id',
    {
      schema: {
        params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } } },
        body: {
          type: 'object',
          properties: {
            serial_no:   { type: 'string', minLength: 1 },
            mac_address: { type: ['string', 'null'] },
            note:        { type: ['string', 'null'] },
          },
        },
      },
      preHandler: requirePermission('receipt.complete'),
    },
    async (request) => service.updateSerial(request.params.id, request.body),
  )

  // GET /inventory/serials/:id/movements — lịch sử di chuyển (nhập/xuất/chuyển kho) của
  // ĐÚNG 1 SN cụ thể, theo stock_movements.serial_id. Đặt SAU '/serials' (path tĩnh) nên
  // không bị nhầm — Fastify so khớp '/serials' trước khi thử pattern '/serials/:id/...'.
  app.get<{ Params: { id: string } }>(
    '/serials/:id/movements',
    { preHandler: requirePermission('report.inventory') },
    async (request) => service.serialMovements(request.params.id),
  )

  app.get<{ Querystring: ListLowStockQuery }>(
    '/low-stock',
    { schema: listLowStockSchema, preHandler: requirePermission('report.inventory') },
    async (request) => service.lowStock(request.query),
  )
}

export default inventoryRoutes
