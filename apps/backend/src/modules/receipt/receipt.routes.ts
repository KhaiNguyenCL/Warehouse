// Routes — định nghĩa URL + permission cần có cho mỗi action. Đây là module ví dụ ĐẦY ĐỦ
// nhất, có 6 endpoint khớp với state machine trong receipt.service.ts.
import { FastifyPluginAsync } from 'fastify'
import { ReceiptService } from './receipt.service'
import {
  createReceiptSchema,
  listReceiptSchema,
  completeReceiptSchema,
  CreateReceiptBody,
  ListReceiptQuery,
  CompleteReceiptBody,
} from './receipt.schema'
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
      return await service.getById(request.params.id)
    },
  )

  // POST /receipts — tạo phiếu mới (status = draft). Permission receipt.create —
  // role Warehouse có quyền này (xem seed role_permissions), Sale thì không.
  app.post<{ Body: CreateReceiptBody }>(
    '/',
    { schema: createReceiptSchema, preHandler: requirePermission('receipt.create') },
    async (request, reply) => {
      // request.user.sub = user id lấy từ JWT (do requirePermission đã gọi authenticate trước)
      const receipt = await service.create(request.body, request.user.sub)
      return reply.code(201).send(receipt)   // 201 = Created, chuẩn REST cho POST tạo mới
    },
  )

  // PATCH /receipts/:id — sửa header khi Draft
  app.patch<{ Params: { id: string }; Body: any }>(
    '/:id',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            note:       { type: 'string' },
            company_id: { type: 'string', format: 'uuid' },
            contact_id: { type: 'string', format: 'uuid' },
            lines: {
              type: 'array',
              items: {
                type: 'object',
                required: ['id'],
                properties: {
                  id:                           { type: 'string', format: 'uuid' },
                  cost_price:                   { type: 'number', minimum: 0 },
                  manufacturer_warranty_months: { type: ['integer', 'null'], minimum: 0 },
                  customer_warranty_months:     { type: ['integer', 'null'], minimum: 0 },
                },
              },
            },
          },
        },
      },
      preHandler: requirePermission('receipt.create'),
    },
    async (request, reply) => reply.send(await service.update(request.params.id, request.body as Record<string, unknown>)),
  )

  // PATCH /receipts/:id/complete — draft → completed (tồn kho thay đổi thật ở bước này).
  // Body { lines: [{ line_id, serials }] } — chỉ cần truyền cho dòng hàng storable.
  app.patch<{ Params: { id: string }; Body: CompleteReceiptBody }>(
    '/:id/complete',
    { schema: completeReceiptSchema, preHandler: requirePermission('receipt.complete') },
    async (request, reply) => {
      return await service.complete(request.params.id, request.user.sub, request.body)
    },
  )

  // PATCH /receipts/:id/cancel — huỷ phiếu (chỉ khi chưa completed). preHandler chỉ cần
  // authenticate — authorization thật (chủ phiếu hoặc người có quyền approve) nằm trong
  // service.cancel(), vì cần biết created_by của chính document đó.
  app.patch<{ Params: { id: string } }>(
    '/:id/cancel',
    { preHandler: authenticate },
    async (request, reply) => {
      return await service.cancel(request.params.id, request.user.sub, request.user.roleId)
    },
  )
}

export default receiptRoutes
