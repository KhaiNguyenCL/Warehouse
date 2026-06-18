import { FastifyPluginAsync } from 'fastify'
import { ProductService } from './product.service'
import {
  createCategorySchema,
  createProductSchema,
  updateProductSchema,
  listProductSchema,
  createVariantSchema,
  updateVariantSchema,
  CreateCategoryBody,
  CreateProductBody,
  UpdateProductBody,
  ListProductQuery,
  CreateVariantBody,
  UpdateVariantBody,
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
      try {
        const category = await service.createCategory(request.body)
        return reply.code(201).send(category)
      } catch (err: any) {
        return reply.code(err.statusCode ?? 500).send({ error: err.message })
      }
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
      try {
        return await service.getProductById(request.params.id)
      } catch (err: any) {
        return reply.code(err.statusCode ?? 500).send({ error: err.message })
      }
    },
  )

  app.post<{ Body: CreateProductBody }>(
    '/',
    { schema: createProductSchema, preHandler: requirePermission('settings.products') },
    async (request, reply) => {
      try {
        const product = await service.createProduct(request.body)
        return reply.code(201).send(product)
      } catch (err: any) {
        return reply.code(err.statusCode ?? 500).send({ error: err.message })
      }
    },
  )

  app.patch<{ Params: { id: string }; Body: UpdateProductBody }>(
    '/:id',
    { schema: updateProductSchema, preHandler: requirePermission('settings.products') },
    async (request, reply) => {
      try {
        return await service.updateProduct(request.params.id, request.body)
      } catch (err: any) {
        return reply.code(err.statusCode ?? 500).send({ error: err.message })
      }
    },
  )

  // ─── Variants ──────────────────────────────────────────────────────────

  app.post<{ Params: { id: string }; Body: CreateVariantBody }>(
    '/:id/variants',
    { schema: createVariantSchema, preHandler: requirePermission('settings.products') },
    async (request, reply) => {
      try {
        const variant = await service.addVariant(request.params.id, request.body)
        return reply.code(201).send(variant)
      } catch (err: any) {
        return reply.code(err.statusCode ?? 500).send({ error: err.message })
      }
    },
  )

  app.patch<{ Params: { id: string; variantId: string }; Body: UpdateVariantBody }>(
    '/:id/variants/:variantId',
    { schema: updateVariantSchema, preHandler: requirePermission('settings.products') },
    async (request, reply) => {
      try {
        return await service.updateVariant(request.params.id, request.params.variantId, request.body)
      } catch (err: any) {
        return reply.code(err.statusCode ?? 500).send({ error: err.message })
      }
    },
  )
}

export default productRoutes
