import { FastifyPluginAsync } from 'fastify'
import puppeteer from 'puppeteer'
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
import { buildQuotationHtml, buildFooterTemplate } from './quotation.pdf'

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

  // GET /quotations/:id/pdf — xuất PDF bằng Puppeteer (không qua Carbone/LibreOffice).
  app.get<{ Params: { id: string } }>(
    '/:id/pdf',
    { preHandler: requirePermission('quotation.view') },
    async (request, reply) => {
      const quotation = await service.getById(request.params.id)
      if (!quotation) throw { statusCode: 404, message: 'Không tìm thấy báo giá' }

      // Recompute totals từ line_total/vat_amount đã lưu — tránh dùng stored subtotal/grand_total
      // có thể lỗi thời (VD: quotation tạo trước khi có sub_sections được tính vào tổng).
      const allLineItems = (quotation.sections ?? []).flatMap((s: any) => [
        ...(s.sub_sections ?? []).flatMap((ss: any) => ss.line_items ?? []),
        ...(s.line_items ?? []),
      ])
      const recomputedSubtotal   = allLineItems.reduce((sum: number, li: any) => sum + Number(li.line_total ?? 0), 0)
      const recomputedVatTotal   = allLineItems.reduce((sum: number, li: any) => sum + Number(li.vat_amount ?? 0), 0)
      const recomputedGrandTotal = recomputedSubtotal + recomputedVatTotal - Number(quotation.discount ?? 0)

      const html = buildQuotationHtml({
        ...quotation,
        subtotal:    recomputedSubtotal,
        vat_total:   recomputedVatTotal,
        grand_total: recomputedGrandTotal,
      })
      const expiredAt = quotation.expired_at
        ? new Date(quotation.expired_at).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
        : null
      const footerTemplate = buildFooterTemplate(expiredAt)

      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      })
      try {
        const page = await browser.newPage()
        await page.setContent(html, { waitUntil: 'load' })
        const pdf = await page.pdf({
          landscape: true,
          format: 'A4',
          printBackground: true,
          displayHeaderFooter: true,
          headerTemplate: '<span></span>',
          footerTemplate,
          margin: { top: '12mm', right: '12mm', bottom: '14mm', left: '12mm' },
        })
        const filename = `BG-${quotation.code ?? quotation.id}.pdf`
        reply.header('Content-Type', 'application/pdf')
        reply.header('Content-Disposition', `attachment; filename="${filename}"`)
        reply.header('Cache-Control', 'no-store')
        return reply.send(Buffer.from(pdf))
      } finally {
        await browser.close()
      }
    },
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
