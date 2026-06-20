import { FastifyPluginAsync } from 'fastify'
import { ReportService } from './report.service'
import {
  inventoryReportSchema,
  revenueReportSchema,
  topProductsSchema,
  InventoryReportQuery,
  RevenueReportQuery,
  TopProductsQuery,
} from './report.schema'
import { requirePermission } from '../../middleware/permission'

const reportRoutes: FastifyPluginAsync = async (app) => {
  const service = new ReportService(app.db)

  app.get<{ Querystring: InventoryReportQuery }>(
    '/inventory/summary',
    { schema: inventoryReportSchema, preHandler: requirePermission('report.inventory') },
    (request) => service.inventorySummary(request.query.warehouse_id),
  )

  app.get<{ Querystring: InventoryReportQuery }>(
    '/inventory/by-category',
    { schema: inventoryReportSchema, preHandler: requirePermission('report.inventory') },
    (request) => service.inventoryByCategory(request.query.warehouse_id),
  )

  app.get<{ Querystring: RevenueReportQuery }>(
    '/revenue/summary',
    { schema: revenueReportSchema, preHandler: requirePermission('report.revenue') },
    (request) => service.revenueSummary(request.query.from, request.query.to),
  )

  app.get<{ Querystring: RevenueReportQuery }>(
    '/revenue/timeseries',
    { schema: revenueReportSchema, preHandler: requirePermission('report.revenue') },
    (request) => service.revenueTimeSeries(request.query.from, request.query.to, request.query.group_by),
  )

  app.get<{ Querystring: TopProductsQuery }>(
    '/revenue/top-products',
    { schema: topProductsSchema, preHandler: requirePermission('report.revenue') },
    (request) => service.topProducts(request.query.from, request.query.to, request.query.limit),
  )

  app.get('/dashboard', { preHandler: requirePermission('report.view') }, () => service.dashboard())
}

export default reportRoutes
