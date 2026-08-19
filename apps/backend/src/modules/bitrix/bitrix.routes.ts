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

  // Merge crm.deal.fields (standard) + crm.deal.userfield.list (custom UF_CRM_*)
  // thành 1 map { [fieldKey]: { title, type } } — dùng cho Settings mapping UI.
  app.get('/deal-fields', { preHandler: authenticate }, async () => {
    const [standard, userFields] = await Promise.all([
      app.bitrix.getDealFields(),
      app.bitrix.getDealUserFields(),
    ])
    const result: Record<string, { title: string; type: string }> = { ...standard }
    for (const uf of userFields) {
      const label = typeof uf.EDIT_FORM_LABEL === 'string'
        ? uf.EDIT_FORM_LABEL
        : (uf.EDIT_FORM_LABEL?.ru ?? uf.EDIT_FORM_LABEL?.en ?? uf.FIELD_NAME)
      result[uf.FIELD_NAME] = { title: label, type: uf.USER_TYPE_ID }
    }
    return result
  })

  // Proxy đọc 1 deal Bitrix — chủ yếu để UI preview trước khi sync vào quotation.
  app.get<{ Params: { dealId: string } }>(
    '/deals/:dealId',
    { preHandler: authenticate },
    (request) => service.getDeal(request.params.dealId),
  )

  // Resolve deal → WMS company/contact (nếu đã import). Dùng cho form tạo PO.
  app.get<{ Params: { dealId: string } }>(
    '/deals/:dealId/resolve',
    { preHandler: authenticate },
    (request) => service.resolveDeal(request.params.dealId),
  )

  // Preview những giá trị sẽ được sync vào quotation — không update DB, chỉ trả kết quả để debug.
  app.get<{ Params: { dealId: string } }>(
    '/deals/:dealId/preview-sync',
    { preHandler: authenticate },
    (request) => service.previewSync(request.params.dealId),
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

  // Sync toàn bộ danh sách company từ Bitrix: fetch, so sánh với DB, trả về diff.
  app.get('/companies/sync-preview', { preHandler: authenticate }, () => service.syncCompaniesPreview())

  // Áp dụng sync cho các bitrix_id đã chọn (idempotent — tạo mới hoặc update).
  app.post<{ Body: { bitrix_ids: string[] } }>(
    '/companies/sync-apply',
    { preHandler: authenticate },
    (request) => service.syncCompaniesApply(request.body.bitrix_ids),
  )

  app.post<{ Params: { bitrixContactId: string }; Body: ImportContactBody }>(
    '/contacts/:bitrixContactId/import',
    { schema: importContactSchema, preHandler: authenticate },
    async (request, reply) => {
      const contact = await service.importContact(request.params.bitrixContactId, request.body.company_id)
      return reply.code(201).send(contact)
    },
  )

  // Debug: xem raw data Bitrix trả về cho 1 contact
  app.get<{ Params: { bitrixContactId: string } }>(
    '/contacts/:bitrixContactId/raw',
    { preHandler: authenticate },
    (request) => app.bitrix.getContact(request.params.bitrixContactId),
  )

  // Debug: xem tất cả company mà 1 contact thuộc về trong Bitrix
  app.get<{ Params: { bitrixContactId: string } }>(
    '/contacts/:bitrixContactId/companies',
    { preHandler: authenticate },
    (request) => app.bitrix.getContactCompanies(request.params.bitrixContactId),
  )

  // Sync toàn bộ contacts từ Bitrix (có thể gọi độc lập sau khi sync companies)
  app.post('/contacts/sync-all', { preHandler: authenticate }, () => service.syncAllContacts())
}

export default bitrixRoutes
