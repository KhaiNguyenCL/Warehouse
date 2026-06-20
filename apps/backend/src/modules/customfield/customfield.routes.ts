import { FastifyPluginAsync } from 'fastify'
import { CustomFieldService } from './customfield.service'
import {
  createCustomFieldSchema,
  updateCustomFieldSchema,
  listCustomFieldSchema,
  getValuesSchema,
  setValuesSchema,
  CreateCustomFieldBody,
  UpdateCustomFieldBody,
  ListCustomFieldQuery,
  GetValuesQuery,
  SetValuesQuery,
  SetValuesBody,
} from './customfield.schema'
import { authenticate } from '../../middleware/auth'

// Không có permission key riêng cho custom field trong CLAUDE.md mục 15 (giống
// company/template/bitrix) — chỉ cần đăng nhập.
const customFieldRoutes: FastifyPluginAsync = async (app) => {
  const service = new CustomFieldService(app.db)

  app.get<{ Querystring: ListCustomFieldQuery }>(
    '/',
    { schema: listCustomFieldSchema, preHandler: authenticate },
    (request) => service.list(request.query.object_type),
  )

  app.post<{ Body: CreateCustomFieldBody }>(
    '/',
    { schema: createCustomFieldSchema, preHandler: authenticate },
    async (request, reply) => {
      const field = await service.create(request.body)
      return reply.code(201).send(field)
    },
  )

  app.patch<{ Params: { id: string }; Body: UpdateCustomFieldBody }>(
    '/:id',
    { schema: updateCustomFieldSchema, preHandler: authenticate },
    (request) => service.update(request.params.id, request.body),
  )

  app.delete<{ Params: { id: string } }>('/:id', { preHandler: authenticate }, async (request, reply) => {
    await service.delete(request.params.id)
    return reply.code(204).send()
  })

  // /values tách riêng khỏi /:id để không đụng route param ":id" ở trên.
  app.get<{ Querystring: GetValuesQuery }>(
    '/values',
    { schema: getValuesSchema, preHandler: authenticate },
    (request) => service.getValues(request.query.object_type, request.query.object_id),
  )

  // PUT — replace TOÀN BỘ field_values của 1 object instance mỗi lần gọi.
  app.put<{ Querystring: SetValuesQuery; Body: SetValuesBody }>(
    '/values',
    { schema: setValuesSchema, preHandler: authenticate },
    (request) => service.setValues(request.query.object_type, request.query.object_id, request.body.values),
  )
}

export default customFieldRoutes
