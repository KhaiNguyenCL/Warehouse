import { FastifyPluginAsync } from 'fastify'
import { BitrixService } from './bitrix.service'
import {
  replaceMappingsSchema,
  syncQuotationSchema,
  importContactSchema,
  ReplaceMappingsBody,
  SyncQuotationBody,
  ImportContactBody,
} from './bitrix.schema'
import { authenticate } from '../../middleware/auth'

// Không có permission key riêng cho bitrix trong CLAUDE.md mục 15 (giống company/template)
// — chỉ cần đăng nhập.
const bitrixRoutes: FastifyPluginAsync = async (app) => {
  const service = new BitrixService(app)

  app.get('/mappings', { preHandler: authenticate }, () => service.listMappings())

  // PUT thay PATCH — replace TOÀN BỘ mapping mỗi lần, giống template_field_mappings.
  app.put<{ Body: ReplaceMappingsBody }>(
    '/mappings',
    { schema: replaceMappingsSchema, preHandler: authenticate },
    (request) => service.replaceMappings(request.body.mappings),
  )

  // Proxy đọc 1 deal Bitrix — chủ yếu để UI preview trước khi sync vào quotation.
  app.get<{ Params: { dealId: string } }>(
    '/deals/:dealId',
    { preHandler: authenticate },
    (request) => service.getDeal(request.params.dealId),
  )

  // body.deal_id optional — nếu quotation đã có bitrix_deal_id từ lần sync trước,
  // bấm "Sync lại" không cần gửi lại deal_id (CLAUDE.md mục 13).
  app.post<{ Params: { id: string }; Body: SyncQuotationBody }>(
    '/quotations/:id/sync',
    { schema: syncQuotationSchema, preHandler: authenticate },
    (request) => service.syncQuotation(request.params.id, request.body.deal_id),
  )

  // CLAUDE.md mục 12: import Company/Contact thật từ Bitrix vào companies/contacts nội bộ
  // (idempotent theo bitrix_company_id/bitrix_contact_id — gọi lại để "sync lại" cũng được).
  app.post<{ Params: { bitrixCompanyId: string } }>(
    '/companies/:bitrixCompanyId/import',
    { preHandler: authenticate },
    async (request, reply) => {
      const company = await service.importCompany(request.params.bitrixCompanyId)
      return reply.code(201).send(company)
    },
  )

  app.post<{ Params: { bitrixContactId: string }; Body: ImportContactBody }>(
    '/contacts/:bitrixContactId/import',
    { schema: importContactSchema, preHandler: authenticate },
    async (request, reply) => {
      const contact = await service.importContact(request.params.bitrixContactId, request.body.company_id)
      return reply.code(201).send(contact)
    },
  )
}

export default bitrixRoutes
