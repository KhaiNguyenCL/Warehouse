import { FastifyPluginAsync } from 'fastify'
import { QuotationService } from './quotation.service'
import {
  createQuotationSchema,
  updateQuotationSchema,
  listQuotationSchema,
  CreateQuotationBody,
  UpdateQuotationBody,
  ListQuotationQuery,
} from './quotation.schema'
import { authenticate } from '../../middleware/auth'
import { requirePermission } from '../../middleware/permission'

const quotationRoutes: FastifyPluginAsync = async (app) => {
  const service = new QuotationService(app.db)

  app.get<{ Querystring: ListQuotationQuery }>(
    '/',
    { schema: listQuotationSchema, preHandler: requirePermission('quotation.view') },
    async (request) => service.list(request.query),
  )

  app.get<{ Params: { id: string } }>(
    '/:id',
    { preHandler: requirePermission('quotation.view') },
    async (request) => service.getById(request.params.id),
  )

  app.post<{ Body: CreateQuotationBody }>(
    '/',
    { schema: createQuotationSchema, preHandler: requirePermission('quotation.create') },
    async (request, reply) => {
      const quotation = await service.create(request.body, request.user.sub)
      return reply.code(201).send(quotation)
    },
  )

  // PATCH /quotations/:id — chỉ sửa được khi Draft (xem quotation.service.ts).
  app.patch<{ Params: { id: string }; Body: UpdateQuotationBody }>(
    '/:id',
    { schema: updateQuotationSchema, preHandler: requirePermission('quotation.edit') },
    async (request) => service.update(request.params.id, request.body),
  )

  // PATCH /quotations/:id/confirm — Draft → Confirmed, tạo reserved_items.
  app.patch<{ Params: { id: string } }>(
    '/:id/confirm',
    { preHandler: requirePermission('quotation.confirm') },
    async (request) => service.confirm(request.params.id),
  )

  // PATCH /quotations/:id/unconfirm — Confirmed → Draft để sửa, giải phóng reserved.
  app.patch<{ Params: { id: string } }>(
    '/:id/unconfirm',
    { preHandler: requirePermission('quotation.edit') },
    async (request) => service.unconfirm(request.params.id),
  )

  // PATCH /quotations/:id/expire — Confirmed → Expired (trigger thủ công), giải phóng reserved.
  app.patch<{ Params: { id: string } }>(
    '/:id/expire',
    { preHandler: requirePermission('quotation.confirm') },
    async (request) => service.expire(request.params.id),
  )

  // PATCH /quotations/:id/cancel — authorization thật (chủ báo giá hoặc người có quyền
  // confirm) nằm trong service.cancel(), preHandler chỉ cần authenticate.
  app.patch<{ Params: { id: string } }>(
    '/:id/cancel',
    { preHandler: authenticate },
    async (request) => service.cancel(request.params.id, request.user.sub, request.user.roleId),
  )
}

export default quotationRoutes
