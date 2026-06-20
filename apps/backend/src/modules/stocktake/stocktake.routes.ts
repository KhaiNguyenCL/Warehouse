import { FastifyPluginAsync } from 'fastify'
import { StocktakeService } from './stocktake.service'
import {
  createStocktakeSchema,
  listStocktakeSchema,
  completeStocktakeSchema,
  CreateStocktakeBody,
  ListStocktakeQuery,
  CompleteStocktakeBody,
} from './stocktake.schema'
import { authenticate } from '../../middleware/auth'
import { requirePermission } from '../../middleware/permission'

const stocktakeRoutes: FastifyPluginAsync = async (app) => {
  const service = new StocktakeService(app.db)

  app.get<{ Querystring: ListStocktakeQuery }>(
    '/',
    { schema: listStocktakeSchema, preHandler: requirePermission('stocktake.view') },
    async (request) => service.list(request.query),
  )

  app.get<{ Params: { id: string } }>(
    '/:id',
    { preHandler: requirePermission('stocktake.view') },
    async (request) => service.getById(request.params.id),
  )

  app.post<{ Body: CreateStocktakeBody }>(
    '/',
    { schema: createStocktakeSchema, preHandler: requirePermission('stocktake.create') },
    async (request, reply) => {
      const stocktake = await service.create(request.body, request.user.sub)
      return reply.code(201).send(stocktake)
    },
  )

  app.patch<{ Params: { id: string }; Body: CompleteStocktakeBody }>(
    '/:id/complete',
    { schema: completeStocktakeSchema, preHandler: requirePermission('stocktake.complete') },
    async (request) => service.complete(request.params.id, request.body),
  )

  // PATCH /:id/cancel — authorization thật (chủ kiểm kê hoặc người có quyền complete)
  // nằm trong service.cancel(), preHandler chỉ cần authenticate.
  app.patch<{ Params: { id: string } }>(
    '/:id/cancel',
    { preHandler: authenticate },
    async (request) => service.cancel(request.params.id, request.user.sub, request.user.roleId),
  )
}

export default stocktakeRoutes
