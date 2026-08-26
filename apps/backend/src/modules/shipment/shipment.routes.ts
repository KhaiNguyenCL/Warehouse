import { FastifyPluginAsync } from 'fastify'
import { ShipmentService } from './shipment.service'
import {
  createShipmentSchema,
  updateShipmentSchema,
  receiveShipmentSchema,
  listShipmentSchema,
  CreateShipmentBody,
  UpdateShipmentBody,
  ReceiveShipmentBody,
  ListShipmentQuery,
} from './shipment.schema'
import { requirePermission } from '../../middleware/permission'

const shipmentRoutes: FastifyPluginAsync = async (app) => {
  const service = new ShipmentService(app.db)

  app.get<{ Querystring: ListShipmentQuery }>(
    '/',
    { schema: listShipmentSchema, preHandler: requirePermission('receipt.view') },
    async (request) => service.list(request.query),
  )

  app.get<{ Params: { id: string } }>(
    '/:id',
    { preHandler: requirePermission('receipt.view') },
    async (request) => service.getById(request.params.id),
  )

  app.post<{ Body: CreateShipmentBody }>(
    '/',
    { schema: createShipmentSchema, preHandler: requirePermission('receipt.create') },
    async (request, reply) => reply.code(201).send(await service.create(request.body, request.user.sub)),
  )

  app.patch<{ Params: { id: string }; Body: UpdateShipmentBody }>(
    '/:id',
    { schema: updateShipmentSchema, preHandler: requirePermission('receipt.create') },
    async (request) => service.update(request.params.id, request.body),
  )

  // PATCH /shipments/:id/receive — xác nhận đã nhận hàng vật lý
  app.patch<{ Params: { id: string }; Body: ReceiveShipmentBody }>(
    '/:id/receive',
    { schema: receiveShipmentSchema, preHandler: requirePermission('receipt.create') },
    async (request) => service.receive(request.params.id, request.user.sub, request.body),
  )

  // PATCH /shipments/:id/cancel
  app.patch<{ Params: { id: string } }>(
    '/:id/cancel',
    { preHandler: requirePermission('receipt.create') },
    async (request) => service.cancel(request.params.id),
  )
}

export default shipmentRoutes
