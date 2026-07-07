import { FastifyPluginAsync } from 'fastify'
import { TransferService } from './transfer.service'
import {
  createTransferSchema,
  listTransferSchema,
  completeTransferSchema,
  CreateTransferBody,
  ListTransferQuery,
  CompleteTransferBody,
} from './transfer.schema'
import { authenticate } from '../../middleware/auth'
import { requirePermission } from '../../middleware/permission'

const transferRoutes: FastifyPluginAsync = async (app) => {
  const service = new TransferService(app.db)

  app.get<{ Querystring: ListTransferQuery }>(
    '/',
    { schema: listTransferSchema, preHandler: requirePermission('transfer.view') },
    async (request) => service.list(request.query),
  )

  app.get<{ Params: { id: string } }>(
    '/:id',
    { preHandler: requirePermission('transfer.view') },
    async (request, reply) => {
      return await service.getById(request.params.id)
    },
  )

  app.post<{ Body: CreateTransferBody }>(
    '/',
    { schema: createTransferSchema, preHandler: requirePermission('transfer.create') },
    async (request, reply) => {
      const transfer = await service.create(request.body, request.user.sub)
      return reply.code(201).send(transfer)
    },
  )

  // PATCH /transfers/:id — sửa header khi Draft
  app.patch<{ Params: { id: string }; Body: any }>(
    '/:id',
    {
      schema: { body: { type: 'object', properties: { note: { type: 'string' } } } },
      preHandler: requirePermission('transfer.create'),
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
    { preHandler: requirePermission('transfer.approve') },
    async (request, reply) => {
      return await service.approve(request.params.id, request.user.sub)
    },
  )

  app.patch<{ Params: { id: string }; Body: CompleteTransferBody }>(
    '/:id/complete',
    { schema: completeTransferSchema, preHandler: requirePermission('transfer.complete') },
    async (request, reply) => {
      return await service.complete(request.params.id, request.user.sub, request.body)
    },
  )

  // authorization thật nằm trong service.cancel() — xem giải thích ở delivery.routes.ts
  app.patch<{ Params: { id: string } }>(
    '/:id/cancel',
    { preHandler: authenticate },
    async (request, reply) => {
      return await service.cancel(request.params.id, request.user.sub, request.user.roleId)
    },
  )
}

export default transferRoutes
