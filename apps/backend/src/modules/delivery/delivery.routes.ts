import { FastifyPluginAsync } from 'fastify'
import { DeliveryService } from './delivery.service'
import {
  createDeliverySchema,
  listDeliverySchema,
  completeDeliverySchema,
  CreateDeliveryBody,
  ListDeliveryQuery,
  CompleteDeliveryBody,
} from './delivery.schema'
import { authenticate } from '../../middleware/auth'
import { requirePermission } from '../../middleware/permission'

const deliveryRoutes: FastifyPluginAsync = async (app) => {
  const service = new DeliveryService(app.db)

  app.get<{ Querystring: ListDeliveryQuery }>(
    '/',
    { schema: listDeliverySchema, preHandler: requirePermission('delivery.view') },
    async (request) => service.list(request.query),
  )

  app.get<{ Params: { id: string } }>(
    '/:id',
    { preHandler: requirePermission('delivery.view') },
    async (request, reply) => {
      return await service.getById(request.params.id)
    },
  )

  app.post<{ Body: CreateDeliveryBody }>(
    '/',
    { schema: createDeliverySchema, preHandler: requirePermission('delivery.create') },
    async (request, reply) => {
      const delivery = await service.create(request.body, request.user.sub)
      return reply.code(201).send(delivery)
    },
  )

  // PATCH /deliveries/:id — sửa header khi Draft
  app.patch<{ Params: { id: string }; Body: any }>(
    '/:id',
    {
      schema: { body: { type: 'object', properties: { note: { type: 'string' }, company_id: { type: 'string', format: 'uuid' }, contact_id: { type: 'string', format: 'uuid' } } } },
      preHandler: requirePermission('delivery.create'),
    },
    async (request, reply) => reply.send(await service.update(request.params.id, request.body as Record<string, unknown>)),
  )

  app.patch<{ Params: { id: string } }>(
    '/:id/submit',
    { preHandler: authenticate },
    async (request, reply) => {
      return await service.submitForApproval(request.params.id)
    },
  )

  app.patch<{ Params: { id: string } }>(
    '/:id/approve',
    { preHandler: requirePermission('delivery.approve') },
    async (request, reply) => {
      return await service.approve(request.params.id, request.user.sub)
    },
  )

  app.patch<{ Params: { id: string }; Body: CompleteDeliveryBody }>(
    '/:id/complete',
    { schema: completeDeliverySchema, preHandler: requirePermission('delivery.complete') },
    async (request, reply) => {
      return await service.complete(request.params.id, request.user.sub, request.body)
    },
  )

  // preHandler chỉ cần authenticate — authorization thật (chủ phiếu hoặc người có quyền
  // approve) nằm trong service.cancel(), vì Manager có quyền approve nhưng KHÔNG có quyền
  // create vẫn cần huỷ được phiếu của người khác (nếu để requirePermission('delivery.create')
  // ở đây, Manager bị chặn ngay từ preHandler, không bao giờ tới được service để check approve).
  app.patch<{ Params: { id: string } }>(
    '/:id/cancel',
    { preHandler: authenticate },
    async (request, reply) => {
      return await service.cancel(request.params.id, request.user.sub, request.user.roleId)
    },
  )
}

export default deliveryRoutes
