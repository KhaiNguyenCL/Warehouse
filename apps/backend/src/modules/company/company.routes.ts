import { FastifyPluginAsync } from 'fastify'
import { CompanyService } from './company.service'
import {
  createCompanySchema,
  updateCompanySchema,
  listCompanySchema,
  createContactSchema,
  updateContactSchema,
  CreateCompanyBody,
  UpdateCompanyBody,
  ListCompanyQuery,
  CreateContactBody,
  UpdateContactBody,
} from './company.schema'
import { authenticate } from '../../middleware/auth'

// CLAUDE.md không định nghĩa permission key riêng cho company (chỉ có settings.*,
// quotation.*, receipt.* ...) — companies là dữ liệu nền (KH/NCC) mọi role đã đăng
// nhập đều cần đọc/ghi được, nên chỉ cần authenticate, không requirePermission.
const companyRoutes: FastifyPluginAsync = async (app) => {
  const service = new CompanyService(app.db)

  // GET /companies?type=customer|supplier&search=...
  app.get<{ Querystring: ListCompanyQuery }>(
    '/',
    { schema: listCompanySchema, preHandler: authenticate },
    async (request) => service.list(request.query),
  )

  app.get<{ Params: { id: string } }>(
    '/:id',
    { preHandler: authenticate },
    async (request) => service.getById(request.params.id),
  )

  app.post<{ Body: CreateCompanyBody }>(
    '/',
    { schema: createCompanySchema, preHandler: authenticate },
    async (request, reply) => {
      const company = await service.create(request.body)
      return reply.code(201).send(company)
    },
  )

  app.patch<{ Params: { id: string }; Body: UpdateCompanyBody }>(
    '/:id',
    { schema: updateCompanySchema, preHandler: authenticate },
    async (request) => service.update(request.params.id, request.body),
  )

  // ─── Contacts ──────────────────────────────────────────────────────────

  app.post<{ Params: { id: string }; Body: CreateContactBody }>(
    '/:id/contacts',
    { schema: createContactSchema, preHandler: authenticate },
    async (request, reply) => {
      const contact = await service.addContact(request.params.id, request.body)
      return reply.code(201).send(contact)
    },
  )

  app.patch<{ Params: { id: string; contactId: string }; Body: UpdateContactBody }>(
    '/:id/contacts/:contactId',
    { schema: updateContactSchema, preHandler: authenticate },
    async (request) => service.updateContact(request.params.id, request.params.contactId, request.body),
  )
}

export default companyRoutes
