import { FastifyPluginAsync } from 'fastify'
import { SettingsService } from './settings.service'
import {
  createRoleSchema,
  updateRoleSchema,
  replaceRolePermissionsSchema,
  createUserSchema,
  updateUserSchema,
  listUserSchema,
  createImportTypeSchema,
  updateImportTypeSchema,
  createExportTypeSchema,
  updateExportTypeSchema,
  CreateRoleBody,
  UpdateRoleBody,
  ReplaceRolePermissionsBody,
  CreateUserBody,
  UpdateUserBody,
  ListUserQuery,
  CreateImportTypeBody,
  UpdateImportTypeBody,
  CreateExportTypeBody,
  UpdateExportTypeBody,
} from './settings.schema'
import { authenticate } from '../../middleware/auth'
import { requirePermission } from '../../middleware/permission'

const settingsRoutes: FastifyPluginAsync = async (app) => {
  const service = new SettingsService(app.db)

  // ─── Roles & Permissions (settings.roles) ─────────────────────────────────

  app.get('/roles', { preHandler: authenticate }, () => service.listRoles())
  app.get<{ Params: { id: string } }>('/roles/:id', { preHandler: authenticate }, (request) =>
    service.getRoleById(request.params.id),
  )
  app.get('/permissions', { preHandler: authenticate }, () => service.listPermissions())

  app.post<{ Body: CreateRoleBody }>(
    '/roles',
    { schema: createRoleSchema, preHandler: requirePermission('settings.roles') },
    async (request, reply) => {
      const role = await service.createRole(request.body)
      return reply.code(201).send(role)
    },
  )

  app.patch<{ Params: { id: string }; Body: UpdateRoleBody }>(
    '/roles/:id',
    { schema: updateRoleSchema, preHandler: requirePermission('settings.roles') },
    (request) => service.updateRole(request.params.id, request.body),
  )

  // PUT — replace toàn bộ permission set của role, không cộng dồn từng cái.
  app.put<{ Params: { id: string }; Body: ReplaceRolePermissionsBody }>(
    '/roles/:id/permissions',
    { schema: replaceRolePermissionsSchema, preHandler: requirePermission('settings.roles') },
    (request) => service.replaceRolePermissions(request.params.id, request.body.permission_keys),
  )

  app.delete<{ Params: { id: string } }>(
    '/roles/:id',
    { preHandler: requirePermission('settings.roles') },
    async (request, reply) => {
      await service.deleteRole(request.params.id)
      return reply.code(204).send()
    },
  )

  // ─── Users (settings.users) ────────────────────────────────────────────────

  app.get<{ Querystring: ListUserQuery }>(
    '/users',
    { schema: listUserSchema, preHandler: authenticate },
    (request) => service.listUsers(request.query),
  )
  app.get<{ Params: { id: string } }>('/users/:id', { preHandler: authenticate }, (request) =>
    service.getUserById(request.params.id),
  )

  app.post<{ Body: CreateUserBody }>(
    '/users',
    { schema: createUserSchema, preHandler: requirePermission('settings.users') },
    async (request, reply) => {
      const user = await service.createUser(request.body)
      return reply.code(201).send(user)
    },
  )

  app.patch<{ Params: { id: string }; Body: UpdateUserBody }>(
    '/users/:id',
    { schema: updateUserSchema, preHandler: requirePermission('settings.users') },
    (request) => service.updateUser(request.params.id, request.body),
  )

  // ─── Import / Export Types ─────────────────────────────────────────────────
  // Không có permission key riêng trong CLAUDE.md mục 15 — chỉ cần đăng nhập, giống
  // company/template/bitrix module.

  app.get('/import-types', { preHandler: authenticate }, () => service.listImportTypes())
  app.post<{ Body: CreateImportTypeBody }>(
    '/import-types',
    { schema: createImportTypeSchema, preHandler: authenticate },
    async (request, reply) => {
      const row = await service.createImportType(request.body)
      return reply.code(201).send(row)
    },
  )
  app.patch<{ Params: { id: string }; Body: UpdateImportTypeBody }>(
    '/import-types/:id',
    { schema: updateImportTypeSchema, preHandler: authenticate },
    (request) => service.updateImportType(request.params.id, request.body),
  )
  app.delete<{ Params: { id: string } }>('/import-types/:id', { preHandler: authenticate }, async (request, reply) => {
    await service.deleteImportType(request.params.id)
    return reply.code(204).send()
  })

  app.get('/export-types', { preHandler: authenticate }, () => service.listExportTypes())
  app.post<{ Body: CreateExportTypeBody }>(
    '/export-types',
    { schema: createExportTypeSchema, preHandler: authenticate },
    async (request, reply) => {
      const row = await service.createExportType(request.body)
      return reply.code(201).send(row)
    },
  )
  app.patch<{ Params: { id: string }; Body: UpdateExportTypeBody }>(
    '/export-types/:id',
    { schema: updateExportTypeSchema, preHandler: authenticate },
    (request) => service.updateExportType(request.params.id, request.body),
  )
  app.delete<{ Params: { id: string } }>('/export-types/:id', { preHandler: authenticate }, async (request, reply) => {
    await service.deleteExportType(request.params.id)
    return reply.code(204).send()
  })

  // ─── Quotation Term Templates ────────────────────────────────────────────────
  app.get('/term-templates', { preHandler: authenticate }, () => service.listTermTemplates())

  app.post<{ Body: { name: string; content: string; sort_order?: number } }>(
    '/term-templates',
    {
      schema: { body: { type: 'object', required: ['name', 'content'], properties: { name: { type: 'string', minLength: 1 }, content: { type: 'string' }, sort_order: { type: 'integer' } } } },
      preHandler: authenticate,
    },
    async (request, reply) => reply.code(201).send(await service.createTermTemplate(request.body)),
  )

  app.patch<{ Params: { id: string }; Body: { name?: string; content?: string; sort_order?: number } }>(
    '/term-templates/:id',
    {
      schema: { body: { type: 'object', properties: { name: { type: 'string', minLength: 1 }, content: { type: 'string' }, sort_order: { type: 'integer' } } } },
      preHandler: authenticate,
    },
    (request) => service.updateTermTemplate(request.params.id, request.body),
  )

  app.delete<{ Params: { id: string } }>(
    '/term-templates/:id',
    { preHandler: authenticate },
    async (request, reply) => { await service.deleteTermTemplate(request.params.id); return reply.code(204).send() },
  )

  // ─── Section Name Presets ────────────────────────────────────────────────────
  app.get('/section-name-presets', { preHandler: authenticate }, () => service.listSectionNamePresets())

  app.post<{ Body: { name: string; sort_order?: number } }>(
    '/section-name-presets',
    {
      schema: { body: { type: 'object', required: ['name'], properties: { name: { type: 'string', minLength: 1 }, sort_order: { type: 'integer' } } } },
      preHandler: authenticate,
    },
    async (request, reply) => reply.code(201).send(await service.createSectionNamePreset(request.body)),
  )

  app.patch<{ Params: { id: string }; Body: { name?: string; sort_order?: number } }>(
    '/section-name-presets/:id',
    {
      schema: { body: { type: 'object', properties: { name: { type: 'string', minLength: 1 }, sort_order: { type: 'integer' } } } },
      preHandler: authenticate,
    },
    (request) => service.updateSectionNamePreset(request.params.id, request.body),
  )

  app.delete<{ Params: { id: string } }>(
    '/section-name-presets/:id',
    { preHandler: authenticate },
    async (request, reply) => { await service.deleteSectionNamePreset(request.params.id); return reply.code(204).send() },
  )

  // ─── Variant Attribute Defs ──────────────────────────────────────────────────
  app.get('/variant-attribute-defs', { preHandler: authenticate }, () => service.listVariantAttributeDefs())

  app.post<{ Body: any }>(
    '/variant-attribute-defs',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name:        { type: 'string', minLength: 1 },
            field_type:  { type: 'string', enum: ['select', 'text'] },
            unit:        { type: 'string' },
            options:     { type: 'array', items: { type: 'string', minLength: 1 } },
            applies_to:  { type: 'string', enum: ['all', 'product'] },
            product_ids: { type: 'array', items: { type: 'string', format: 'uuid' } },
          },
        },
      },
      preHandler: authenticate,
    },
    async (request, reply) => reply.code(201).send(await service.createVariantAttributeDef(request.body)),
  )

  app.patch<{ Params: { id: string }; Body: any }>(
    '/variant-attribute-defs/:id',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            name:        { type: 'string', minLength: 1 },
            field_type:  { type: 'string', enum: ['select', 'text'] },
            unit:        { type: ['string', 'null'] },
            options:     { type: 'array', items: { type: 'string', minLength: 1 } },
            applies_to:  { type: 'string', enum: ['all', 'product'] },
            product_ids: { type: 'array', items: { type: 'string', format: 'uuid' } },
            is_active:   { type: 'boolean' },
          },
        },
      },
      preHandler: authenticate,
    },
    (request) => service.updateVariantAttributeDef(request.params.id, request.body),
  )

  app.delete<{ Params: { id: string } }>(
    '/variant-attribute-defs/:id',
    { preHandler: authenticate },
    async (request, reply) => {
      await service.deleteVariantAttributeDef(request.params.id)
      return reply.code(204).send()
    },
  )
}

export default settingsRoutes
