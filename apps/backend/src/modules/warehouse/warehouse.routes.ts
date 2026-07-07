import { FastifyPluginAsync } from 'fastify'
import { WarehouseService } from './warehouse.service'
import {
  createWarehouseSchema,
  updateWarehouseSchema,
  listWarehouseSchema,
  CreateWarehouseBody,
  UpdateWarehouseBody,
  ListWarehouseQuery,
} from './warehouse.schema'
import { authenticate } from '../../middleware/auth'
import { requirePermission } from '../../middleware/permission'

const warehouseRoutes: FastifyPluginAsync = async (app) => {
  const service = new WarehouseService(app.db)

  app.get<{ Querystring: ListWarehouseQuery }>(
    '/',
    { schema: listWarehouseSchema, preHandler: authenticate },
    async (request) => service.list(request.query),
  )

  app.get<{ Params: { id: string } }>(
    '/:id',
    { preHandler: authenticate },
    async (request, reply) => {
      return await service.getById(request.params.id)
    },
  )

  app.post<{ Body: CreateWarehouseBody }>(
    '/',
    { schema: createWarehouseSchema, preHandler: requirePermission('settings.warehouse') },
    async (request, reply) => {
      const warehouse = await service.create(request.body)
      return reply.code(201).send(warehouse)
    },
  )

  app.patch<{ Params: { id: string }; Body: UpdateWarehouseBody }>(
    '/:id',
    { schema: updateWarehouseSchema, preHandler: requirePermission('settings.warehouse') },
    async (request, reply) => {
      return await service.update(request.params.id, request.body)
    },
  )

  app.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: requirePermission('settings.warehouse') },
    async (request, reply) => { await service.delete(request.params.id); return reply.code(204).send() },
  )
}

export default warehouseRoutes
