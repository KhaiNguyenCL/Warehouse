// Routes — định nghĩa URL + permission cần có cho mỗi action. Đây là module ví dụ ĐẦY ĐỦ
// nhất, có 6 endpoint khớp với state machine trong receipt.service.ts.
import { FastifyPluginAsync } from 'fastify'
import { ReceiptService } from './receipt.service'
import { createReceiptSchema, listReceiptSchema, CreateReceiptBody, ListReceiptQuery } from './receipt.schema'
import { authenticate } from '../../middleware/auth'
import { requirePermission } from '../../middleware/permission'

const receiptRoutes: FastifyPluginAsync = async (app) => {
  const service = new ReceiptService(app.db)

  // GET /receipts — requirePermission('receipt.view') nghĩa là chỉ role có permission
  // key này (xem seed data trong 001_initial_schema.sql) mới xem được danh sách.
  app.get<{ Querystring: ListReceiptQuery }>(
    '/',
    { schema: listReceiptSchema, preHandler: requirePermission('receipt.view') },
    async (request, reply) => {
      return service.list(request.query)
    },
  )

  // GET /receipts/:id
  app.get<{ Params: { id: string } }>(
    '/:id',
    { preHandler: requirePermission('receipt.view') },
    async (request, reply) => {
      try {
        return await service.getById(request.params.id)
      } catch (err: any) {
        return reply.code(err.statusCode ?? 500).send({ error: err.message })
      }
    },
  )

  // POST /receipts — tạo phiếu mới (status = draft). Permission receipt.create —
  // role Warehouse có quyền này (xem seed role_permissions), Sale thì không.
  app.post<{ Body: CreateReceiptBody }>(
    '/',
    { schema: createReceiptSchema, preHandler: requirePermission('receipt.create') },
    async (request, reply) => {
      try {
        // request.user.sub = user id lấy từ JWT (do requirePermission đã gọi authenticate trước)
        const receipt = await service.create(request.body, request.user.sub)
        return reply.code(201).send(receipt)   // 201 = Created, chuẩn REST cho POST tạo mới
      } catch (err: any) {
        return reply.code(err.statusCode ?? 500).send({ error: err.message })
      }
    },
  )

  // PATCH /receipts/:id/submit — draft → pending_approval.
  // Dùng authenticate (chỉ cần đăng nhập) thay vì requirePermission, vì ai tạo phiếu
  // cũng được tự submit phiếu của mình, không cần quyền approve riêng.
  app.patch<{ Params: { id: string } }>(
    '/:id/submit',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        return await service.submitForApproval(request.params.id, request.user.sub)
      } catch (err: any) {
        return reply.code(err.statusCode ?? 500).send({ error: err.message })
      }
    },
  )

  // PATCH /receipts/:id/approve — pending_approval → approved.
  // Permission receipt.approve — chỉ Admin/Manager có quyền này (xem seed data).
  app.patch<{ Params: { id: string } }>(
    '/:id/approve',
    { preHandler: requirePermission('receipt.approve') },
    async (request, reply) => {
      try {
        return await service.approve(request.params.id, request.user.sub)
      } catch (err: any) {
        return reply.code(err.statusCode ?? 500).send({ error: err.message })
      }
    },
  )

  // PATCH /receipts/:id/complete — approved → completed (tồn kho thay đổi thật ở bước này)
  app.patch<{ Params: { id: string } }>(
    '/:id/complete',
    { preHandler: requirePermission('receipt.complete') },
    async (request, reply) => {
      try {
        return await service.complete(request.params.id, request.user.sub)
      } catch (err: any) {
        return reply.code(err.statusCode ?? 500).send({ error: err.message })
      }
    },
  )

  // PATCH /receipts/:id/cancel — huỷ phiếu (chỉ khi chưa completed)
  app.patch<{ Params: { id: string } }>(
    '/:id/cancel',
    { preHandler: requirePermission('receipt.create') },   // dùng tạm quyền create — người tạo được tự huỷ phiếu của mình
    async (request, reply) => {
      try {
        return await service.cancel(request.params.id)
      } catch (err: any) {
        return reply.code(err.statusCode ?? 500).send({ error: err.message })
      }
    },
  )
}

export default receiptRoutes
