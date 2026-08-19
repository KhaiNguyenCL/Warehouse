import { FastifyPluginAsync } from 'fastify'
import fs from 'fs/promises'
import path from 'path'
import { TemplateService } from './template.service'
import {
  listTemplateSchema,
  updateTemplateSchema,
  replaceMappingsSchema,
  exportTemplateSchema,
  ListTemplateQuery,
  UpdateTemplateBody,
  ReplaceMappingsBody,
  ExportTemplateBody,
} from './template.schema'
import { authenticate } from '../../middleware/auth'

// Không có permission key riêng cho template trong CLAUDE.md mục 15 (giống module
// company) — chỉ cần đăng nhập, chưa cần phân quyền chi tiết theo role.
const templateRoutes: FastifyPluginAsync = async (app) => {
  const service = new TemplateService(app)

  // Serve file mẫu import_1.html để admin tải về làm cơ sở thiết kế template
  app.get('/sample/import_1', { preHandler: authenticate }, async (_request, reply) => {
    const samplePath = path.join(app.carbone.uploadDir, 'import_1.html')
    try {
      const content = await fs.readFile(samplePath)
      reply.header('Content-Disposition', 'attachment; filename="import_1.html"')
      reply.type('text/html')
      return reply.send(content)
    } catch {
      throw { statusCode: 404, message: 'File mẫu import_1.html không tồn tại' }
    }
  })

  app.get<{ Querystring: ListTemplateQuery }>(
    '/',
    { schema: listTemplateSchema, preHandler: authenticate },
    async (request) => service.list(request.query),
  )

  app.get<{ Params: { id: string } }>(
    '/:id',
    { preHandler: authenticate },
    async (request) => service.getById(request.params.id),
  )

  // multipart: field "name", field "object_type", file "file" — không dùng AJV schema
  // cho body vì @fastify/multipart không populate request.body theo JSON schema thường.
  app.post(
    '/',
    { preHandler: authenticate },
    async (request, reply) => {
      let name: string | undefined
      let object_type: string | undefined
      let fileBuffer: Buffer | undefined
      let fileName: string | undefined

      for await (const part of request.parts()) {
        if (part.type === 'file' && part.fieldname === 'file') {
          fileBuffer = await part.toBuffer()
          fileName = part.filename
        } else if (part.type === 'field' && part.fieldname === 'name') {
          name = String(part.value)
        } else if (part.type === 'field' && part.fieldname === 'object_type') {
          object_type = String(part.value)
        }
      }

      if (!fileBuffer || !fileName || !name || !object_type) {
        throw { statusCode: 400, message: 'Thiếu field "name", "object_type" hoặc file "file"' }
      }

      const template = await service.upload({ name, object_type, fileBuffer, fileName }, request.user.sub)
      return reply.code(201).send(template)
    },
  )

  app.patch<{ Params: { id: string }; Body: UpdateTemplateBody }>(
    '/:id',
    { schema: updateTemplateSchema, preHandler: authenticate },
    async (request) => service.update(request.params.id, request.body),
  )

  // PUT thay vì PATCH — replace TOÀN BỘ mappings mỗi lần (CLAUDE.md mục 14: admin map lại
  // trong Settings), không hỗ trợ sửa từng dòng riêng lẻ.
  app.put<{ Params: { id: string }; Body: ReplaceMappingsBody }>(
    '/:id/mappings',
    { schema: replaceMappingsSchema, preHandler: authenticate },
    async (request) => service.replaceMappings(request.params.id, request.body.mappings),
  )

  app.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: authenticate },
    async (request, reply) => {
      await service.delete(request.params.id)
      return reply.code(204).send()
    },
  )

  app.post<{ Params: { id: string }; Body: ExportTemplateBody }>(
    '/:id/export',
    { schema: exportTemplateSchema, preHandler: authenticate },
    async (request, reply) => {
      const { content, extension } = await service.export(request.params.id, request.body)
      const mimeType =
        extension === 'pdf'  ? 'application/pdf'
        : extension === 'html' ? 'text/html'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      reply.header('Content-Disposition', `attachment; filename="export.${extension}"`)
      reply.type(mimeType)
      return reply.send(content)
    },
  )
}

export default templateRoutes
