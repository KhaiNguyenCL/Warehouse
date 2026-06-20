import { FastifyPluginAsync } from 'fastify'
import { ProductService } from './product.service'
import {
  createCategorySchema,
  createProductSchema,
  updateProductSchema,
  listProductSchema,
  createVariantSchema,
  updateVariantSchema,
  createVariantSupplierSchema,
  updateVariantSupplierSchema,
  CreateCategoryBody,
  CreateProductBody,
  UpdateProductBody,
  ListProductQuery,
  CreateVariantBody,
  UpdateVariantBody,
  CreateVariantSupplierBody,
  UpdateVariantSupplierBody,
} from './product.schema'
import { authenticate } from '../../middleware/auth'
import { requirePermission } from '../../middleware/permission'

const productRoutes: FastifyPluginAsync = async (app) => {
  const service = new ProductService(app.db)

  // ─── Categories ────────────────────────────────────────────────────────

  app.get('/categories', { preHandler: authenticate }, async () => {
    return service.listCategories()
  })

  app.post<{ Body: CreateCategoryBody }>(
    '/categories',
    { schema: createCategorySchema, preHandler: requirePermission('settings.products') },
    async (request, reply) => {
      const category = await service.createCategory(request.body)
      return reply.code(201).send(category)
    },
  )

  // ─── Products ──────────────────────────────────────────────────────────

  app.get<{ Querystring: ListProductQuery }>(
    '/',
    { schema: listProductSchema, preHandler: authenticate },
    async (request) => {
      return service.listProducts(request.query)
    },
  )

  app.get<{ Params: { id: string } }>(
    '/:id',
    { preHandler: authenticate },
    async (request, reply) => {
      return await service.getProductById(request.params.id)
    },
  )

  app.post<{ Body: CreateProductBody }>(
    '/',
    { schema: createProductSchema, preHandler: requirePermission('settings.products') },
    async (request, reply) => {
      const product = await service.createProduct(request.body)
      return reply.code(201).send(product)
    },
  )

  app.patch<{ Params: { id: string }; Body: UpdateProductBody }>(
    '/:id',
    { schema: updateProductSchema, preHandler: requirePermission('settings.products') },
    async (request, reply) => {
      return await service.updateProduct(request.params.id, request.body)
    },
  )

  // ─── Variants ──────────────────────────────────────────────────────────

  app.post<{ Params: { id: string }; Body: CreateVariantBody }>(
    '/:id/variants',
    { schema: createVariantSchema, preHandler: requirePermission('settings.products') },
    async (request, reply) => {
      const variant = await service.addVariant(request.params.id, request.body)
      return reply.code(201).send(variant)
    },
  )

  app.patch<{ Params: { id: string; variantId: string }; Body: UpdateVariantBody }>(
    '/:id/variants/:variantId',
    { schema: updateVariantSchema, preHandler: requirePermission('settings.products') },
    async (request, reply) => {
      return await service.updateVariant(request.params.id, request.params.variantId, request.body)
    },
  )

  // ─── Variant Suppliers ────────────────────────────────────────────────

  app.get<{ Params: { id: string; variantId: string } }>(
    '/:id/variants/:variantId/suppliers',
    { preHandler: authenticate },
    async (request) => {
      return await service.listVariantSuppliers(request.params.id, request.params.variantId)
    },
  )

  app.post<{ Params: { id: string; variantId: string }; Body: CreateVariantSupplierBody }>(
    '/:id/variants/:variantId/suppliers',
    { schema: createVariantSupplierSchema, preHandler: requirePermission('settings.products') },
    async (request, reply) => {
      const supplier = await service.addVariantSupplier(request.params.id, request.params.variantId, request.body)
      return reply.code(201).send(supplier)
    },
  )

  app.patch<{ Params: { id: string; variantId: string; supplierId: string }; Body: UpdateVariantSupplierBody }>(
    '/:id/variants/:variantId/suppliers/:supplierId',
    { schema: updateVariantSupplierSchema, preHandler: requirePermission('settings.products') },
    async (request) => {
      return await service.updateVariantSupplier(
        request.params.id,
        request.params.variantId,
        request.params.supplierId,
        request.body,
      )
    },
  )

  app.delete<{ Params: { id: string; variantId: string; supplierId: string } }>(
    '/:id/variants/:variantId/suppliers/:supplierId',
    { preHandler: requirePermission('settings.products') },
    async (request, reply) => {
      await service.deleteVariantSupplier(request.params.id, request.params.variantId, request.params.supplierId)
      return reply.code(204).send()
    },
  )
}

export default productRoutes
