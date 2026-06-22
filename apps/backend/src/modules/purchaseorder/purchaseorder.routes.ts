import { FastifyPluginAsync } from 'fastify'
import { PurchaseOrderService } from './purchaseorder.service'
import {
  createPurchaseOrderSchema,
  updatePurchaseOrderSchema,
  listPurchaseOrderSchema,
  CreatePurchaseOrderBody,
  UpdatePurchaseOrderBody,
  ListPurchaseOrderQuery,
} from './purchaseorder.schema'
import { authenticate } from '../../middleware/auth'
import { requirePermission } from '../../middleware/permission'

const purchaseOrderRoutes: FastifyPluginAsync = async (app) => {
  const service = new PurchaseOrderService(app.db)

  app.get<{ Querystring: ListPurchaseOrderQuery }>(
    '/',
    { schema: listPurchaseOrderSchema, preHandler: requirePermission('purchase_order.view') },
    async (request) => service.list(request.query),
  )

  app.get<{ Params: { id: string } }>(
    '/:id',
    { preHandler: requirePermission('purchase_order.view') },
    async (request) => service.getById(request.params.id),
  )

  app.post<{ Body: CreatePurchaseOrderBody }>(
    '/',
    { schema: createPurchaseOrderSchema, preHandler: requirePermission('purchase_order.create') },
    async (request, reply) => {
      const po = await service.create(request.body, request.user.sub)
      return reply.code(201).send(po)
    },
  )

  // PATCH /purchase-orders/:id — chỉ sửa được khi Draft (xem purchaseorder.service.ts).
  app.patch<{ Params: { id: string }; Body: UpdatePurchaseOrderBody }>(
    '/:id',
    { schema: updatePurchaseOrderSchema, preHandler: requirePermission('purchase_order.edit') },
    async (request) => service.update(request.params.id, request.body),
  )

  // PATCH /purchase-orders/:id/confirm — Draft → Confirmed, Receipt mới dùng được po_id này.
  app.patch<{ Params: { id: string } }>(
    '/:id/confirm',
    { preHandler: requirePermission('purchase_order.confirm') },
    async (request) => service.confirm(request.params.id),
  )

  // PATCH /purchase-orders/:id/unconfirm — Confirmed → Draft để sửa.
  app.patch<{ Params: { id: string } }>(
    '/:id/unconfirm',
    { preHandler: requirePermission('purchase_order.edit') },
    async (request) => service.unconfirm(request.params.id),
  )

  // PATCH /purchase-orders/:id/cancel — authorization thật (chủ PO hoặc người có quyền
  // confirm) nằm trong service.cancel(), preHandler chỉ cần authenticate.
  app.patch<{ Params: { id: string } }>(
    '/:id/cancel',
    { preHandler: authenticate },
    async (request) => service.cancel(request.params.id, request.user.sub, request.user.roleId),
  )
}

export default purchaseOrderRoutes
