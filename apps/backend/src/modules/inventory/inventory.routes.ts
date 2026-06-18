import { FastifyPluginAsync } from 'fastify'
import { InventoryService } from './inventory.service'
import { listInventorySchema, listLowStockSchema, ListInventoryQuery, ListLowStockQuery } from './inventory.schema'
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

  app.get<{ Querystring: ListLowStockQuery }>(
    '/low-stock',
    { schema: listLowStockSchema, preHandler: requirePermission('report.inventory') },
    async (request) => service.lowStock(request.query),
  )
}

export default inventoryRoutes
