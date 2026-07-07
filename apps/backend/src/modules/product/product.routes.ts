import { FastifyPluginAsync } from 'fastify'
import { ProductService } from './product.service'
import {
  createCategorySchema,
  updateCategorySchema,
  createBrandSchema,
  updateBrandSchema,
  createProductSchema,
  updateProductSchema,
  listProductSchema,
  createVariantSchema,
  updateVariantSchema,
  createVariantSupplierSchema,
  updateVariantSupplierSchema,
  createBundleItemSchema,
  updateBundleItemSchema,
  CreateCategoryBody,
  UpdateCategoryBody,
  CreateBrandBody,
  UpdateBrandBody,
  CreateProductBody,
  UpdateProductBody,
  ListProductQuery,
  CreateVariantBody,
  UpdateVariantBody,
  CreateVariantSupplierBody,
  UpdateVariantSupplierBody,
  CreateBundleItemBody,
  UpdateBundleItemBody,
} from './product.schema'
import { authenticate } from '../../middleware/auth'
import { requirePermission } from '../../middleware/permission'

const productRoutes: FastifyPluginAsync = async (app) => {
  const service = new ProductService(app.db)

  // ─── Categories ────────────────────────────────────────────────────────
  // Phải tạo Category (+ short_code) trước khi tạo Product — short_code dùng gợi ý
  // product.code = category.short_code + brand.short_code (note.txt).

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

  app.patch<{ Params: { id: string }; Body: UpdateCategoryBody }>(
    '/categories/:id',
    { schema: updateCategorySchema, preHandler: requirePermission('settings.products') },
    async (request) => service.updateCategory(request.params.id, request.body),
  )

  app.delete<{ Params: { id: string } }>(
    '/categories/:id',
    { preHandler: requirePermission('settings.products') },
    async (request, reply) => { await service.deleteCategory(request.params.id); return reply.code(204).send() },
  )

  // ─── Brands ────────────────────────────────────────────────────────────

  app.get('/brands', { preHandler: authenticate }, async () => {
    return service.listBrands()
  })

  app.post<{ Body: CreateBrandBody }>(
    '/brands',
    { schema: createBrandSchema, preHandler: requirePermission('settings.products') },
    async (request, reply) => {
      const brand = await service.createBrand(request.body)
      return reply.code(201).send(brand)
    },
  )

  app.patch<{ Params: { id: string }; Body: UpdateBrandBody }>(
    '/brands/:id',
    { schema: updateBrandSchema, preHandler: requirePermission('settings.products') },
    async (request) => service.updateBrand(request.params.id, request.body),
  )

  app.delete<{ Params: { id: string } }>(
    '/brands/:id',
    { preHandler: requirePermission('settings.products') },
    async (request, reply) => { await service.deleteBrand(request.params.id); return reply.code(204).send() },
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

  app.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: requirePermission('settings.products') },
    async (request, reply) => {
      await service.deleteProduct(request.params.id)
      return reply.code(204).send()
    },
  )

  // ─── Variants ──────────────────────────────────────────────────────────

  // Flat search — dùng cho dropdown chọn SKU khi tạo Receipt/DO không qua PO/Quotation.
  app.get<{ Querystring: { search?: string; product_type?: string; limit?: number } }>(
    '/variants',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            search:       { type: 'string' },
            product_type: { type: 'string' },
            limit:        { type: 'integer', minimum: 1, maximum: 200 },
          },
        },
      },
      preHandler: authenticate,
    },
    async (request) => {
      const { search, product_type, limit } = request.query
      return service.searchVariants(search, product_type, limit)
    },
  )

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

  app.delete<{ Params: { id: string; variantId: string } }>(
    '/:id/variants/:variantId',
    { preHandler: requirePermission('settings.products') },
    async (request, reply) => {
      await service.deleteVariant(request.params.id, request.params.variantId)
      return reply.code(204).send()
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

  // ─── Bundle Items ────────────────────────────────────────────────────────

  app.get<{ Params: { id: string; variantId: string } }>(
    '/:id/variants/:variantId/bundle-items',
    { preHandler: authenticate },
    async (request) => {
      return await service.listBundleItems(request.params.id, request.params.variantId)
    },
  )

  app.post<{ Params: { id: string; variantId: string }; Body: CreateBundleItemBody }>(
    '/:id/variants/:variantId/bundle-items',
    { schema: createBundleItemSchema, preHandler: requirePermission('settings.products') },
    async (request, reply) => {
      const item = await service.addBundleItem(request.params.id, request.params.variantId, request.body)
      return reply.code(201).send(item)
    },
  )

  app.patch<{ Params: { id: string; variantId: string; itemId: string }; Body: UpdateBundleItemBody }>(
    '/:id/variants/:variantId/bundle-items/:itemId',
    { schema: updateBundleItemSchema, preHandler: requirePermission('settings.products') },
    async (request) => {
      return await service.updateBundleItem(
        request.params.id,
        request.params.variantId,
        request.params.itemId,
        request.body,
      )
    },
  )

  app.delete<{ Params: { id: string; variantId: string; itemId: string } }>(
    '/:id/variants/:variantId/bundle-items/:itemId',
    { preHandler: requirePermission('settings.products') },
    async (request, reply) => {
      await service.deleteBundleItem(request.params.id, request.params.variantId, request.params.itemId)
      return reply.code(204).send()
    },
  )

  // ─── Variant Attribute Values ─────────────────────────────────────────────
  // PUT thay thế toàn bộ attribute values của 1 variant (upsert array)
  app.put<{ Params: { id: string; variantId: string }; Body: any }>(
    '/:id/variants/:variantId/attribute-values',
    {
      schema: {
        body: {
          type: 'array',
          items: {
            type: 'object',
            required: ['attribute_def_id'],
            properties: {
              attribute_def_id: { type: 'string', format: 'uuid' },
              value:            { type: ['string', 'null'] },
              include_in_sku:   { type: 'boolean' },
            },
          },
        },
      },
      preHandler: requirePermission('settings.products'),
    },
    async (request) => service.setVariantAttributeValues(request.params.variantId, request.body as any),
  )
}

export default productRoutes
