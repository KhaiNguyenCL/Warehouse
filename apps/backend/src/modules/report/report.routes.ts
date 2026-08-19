import { FastifyPluginAsync } from 'fastify'
import { ReportService } from './report.service'
import {
  inventoryReportSchema,
  revenueReportSchema,
  topProductsSchema,
  stockFlowSchema,
  lowStockItemsSchema,
  InventoryReportQuery,
  RevenueReportQuery,
  TopProductsQuery,
  StockFlowQuery,
  LowStockItemsQuery,
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

  app.get('/pipeline', { preHandler: requirePermission('report.revenue') }, () => service.salesPipeline())

  app.get<{ Querystring: StockFlowQuery }>(
    '/stock-flow',
    { schema: stockFlowSchema, preHandler: requirePermission('report.inventory') },
    (request) => service.stockFlow(request.query.from, request.query.to, request.query.group_by),
  )

  app.get<{ Querystring: LowStockItemsQuery }>(
    '/low-stock-items',
    { schema: lowStockItemsSchema, preHandler: requirePermission('report.inventory') },
    (request) => service.lowStockItems(request.query.limit),
  )
}

export default reportRoutes
