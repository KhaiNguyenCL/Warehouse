import { Knex } from 'knex'
import bcrypt from 'bcrypt'
import { SettingsRepository } from './settings.repository'
import {
  CreateRoleBody,
  UpdateRoleBody,
  CreateUserBody,
  UpdateUserBody,
  ListUserQuery,
  CreateImportTypeBody,
  UpdateImportTypeBody,
  CreateExportTypeBody,
  UpdateExportTypeBody,
} from './settings.schema'

const PG_UNIQUE_VIOLATION = '23505'

function mapDbError(message: string) {
  return (err: any): never => {
    if (err.code === PG_UNIQUE_VIOLATION) throw { statusCode: 409, message }
    throw err
  }
}

export class SettingsService {
  private repo: SettingsRepository

  constructor(private db: Knex) {
    this.repo = new SettingsRepository(db)
  }

  // ─── Roles & Permissions ──────────────────────────────────────────────────

  listRoles() {
    return this.repo.findRoles()
  }

  async getRoleById(id: string) {
    const role = await this.repo.findRoleById(id)
    if (!role) throw { statusCode: 404, message: 'Role not found' }
    return role
  }

  async createRole(data: CreateRoleBody) {
    const [role] = await this.repo.insertRole({ name: data.name, description: data.description })
    if (data.permission_keys && data.permission_keys.length > 0) {
      await this.replaceRolePermissions(role.id, data.permission_keys)
    }
    return this.getRoleById(role.id)
  }

  // Role hệ thống (CLAUDE.md mục 15: "không xoá được, có thể sửa quyền") — giữ nguyên
  // name để các nơi khác (vd test helper, tài liệu) không bị lệch khi tra theo tên,
  // chỉ cho sửa description; quyền (permissions) vẫn sửa được qua replaceRolePermissions().
  async updateRole(id: string, data: UpdateRoleBody) {
    const role = await this.repo.findRoleById(id)
    if (!role) throw { statusCode: 404, message: 'Role not found' }

    const payload: Record<string, unknown> = {}
    if (data.description !== undefined) payload.description = data.description
    if (data.name !== undefined) {
      if (role.is_system) throw { statusCode: 400, message: 'Không thể đổi tên role hệ thống' }
      payload.name = data.name
    }

    const [updated] = await this.repo.updateRole(id, payload)
    return updated
  }

  async replaceRolePermissions(id: string, permissionKeys: string[]) {
    const role = await this.repo.findRoleById(id)
    if (!role) throw { statusCode: 404, message: 'Role not found' }

    const uniqueKeys = [...new Set(permissionKeys)]
    const permissions = await this.repo.findPermissionsByKeys(uniqueKeys)
    if (permissions.length !== uniqueKeys.length) {
      const found = new Set(permissions.map((p) => p.key))
      const missing = uniqueKeys.filter((k) => !found.has(k))
      throw { statusCode: 400, message: `Permission key không tồn tại: ${missing.join(', ')}` }
    }

    await this.db.transaction((trx) => this.repo.replaceRolePermissions(id, permissions.map((p) => p.id), trx))
    return this.getRoleById(id)
  }

  // Chỉ xoá role tự tạo (is_system=false) và không còn user nào đang dùng — tránh để
  // user "mồ côi" role (users.role_id NOT NULL, không có ON DELETE SET NULL).
  async deleteRole(id: string) {
    const role = await this.repo.findRoleById(id)
    if (!role) throw { statusCode: 404, message: 'Role not found' }
    if (role.is_system) throw { statusCode: 400, message: 'Không thể xoá role hệ thống' }

    const { count } = (await this.repo.countUsersByRole(id)) ?? { count: 0 }
    if (Number(count) > 0) {
      throw { statusCode: 400, message: `Còn ${count} user đang dùng role này, không thể xoá` }
    }
    await this.repo.deleteRole(id)
  }

  listPermissions() {
    return this.repo.findPermissions()
  }

  // ─── Users ─────────────────────────────────────────────────────────────────

  listUsers(query: ListUserQuery) {
    return this.repo.findUsers(query)
  }

  async getUserById(id: string) {
    const user = await this.repo.findUserById(id)
    if (!user) throw { statusCode: 404, message: 'User not found' }
    return user
  }

  async createUser(data: CreateUserBody) {
    const role = await this.repo.findRoleByIdRaw(data.role_id)
    if (!role) throw { statusCode: 400, message: 'role_id không tồn tại' }

    const password_hash = await bcrypt.hash(data.password, 10)
    try {
      const [user] = await this.repo.insertUser({
        full_name: data.full_name,
        email: data.email,
        phone: data.phone,
        password_hash,
        role_id: data.role_id,
      })
      return this.getUserById(user.id)
    } catch (err) {
      mapDbError('Email đã được sử dụng')(err)
    }
  }

  // Không có hàm xoá user (hard delete) — users.id được NHIỀU bảng khác tham chiếu
  // làm created_by (receipts, quotations,...) KHÔNG có ON DELETE CASCADE/SET NULL, xoá
  // sẽ vi phạm FK. Khoá tài khoản qua is_active=false (route PATCH) thay vì xoá.
  async updateUser(id: string, data: UpdateUserBody) {
    const user = await this.repo.findUserById(id)
    if (!user) throw { statusCode: 404, message: 'User not found' }

    const payload: Record<string, unknown> = {}
    if (data.full_name !== undefined) payload.full_name = data.full_name
    if (data.phone !== undefined) payload.phone = data.phone
    if (data.is_active !== undefined) payload.is_active = data.is_active
    if (data.role_id !== undefined) {
      const role = await this.repo.findRoleByIdRaw(data.role_id)
      if (!role) throw { statusCode: 400, message: 'role_id không tồn tại' }
      payload.role_id = data.role_id
    }
    if (data.password) payload.password_hash = await bcrypt.hash(data.password, 10)

    const [updated] = await this.repo.updateUser(id, payload)
    return this.getUserById(updated.id)
  }

  // ─── Import / Export Types ─────────────────────────────────────────────────
  // LƯU Ý: receipt.schema.ts/delivery.schema.ts hiện validate import_type/export_type
  // bằng enum TS hardcode (IMPORT_TYPES/EXPORT_TYPES), KHÔNG đọc từ 2 bảng này — thêm
  // type mới ở đây chưa tự động cho phép dùng ngay trong Receipt/Delivery (cần nối lại
  // riêng, ngoài phạm vi module settings).

  listImportTypes() {
    return this.repo.findImportTypes()
  }

  async createImportType(data: CreateImportTypeBody) {
    try {
      const [row] = await this.repo.insertImportType(data)
      return row
    } catch (err) {
      mapDbError(`Key "${data.key}" đã tồn tại`)(err)
    }
  }

  async updateImportType(id: string, data: UpdateImportTypeBody) {
    const existing = await this.repo.findImportTypeById(id)
    if (!existing) throw { statusCode: 404, message: 'Import type not found' }
    const [updated] = await this.repo.updateImportType(id, data)
    return updated
  }

  async deleteImportType(id: string) {
    const existing = await this.repo.findImportTypeById(id)
    if (!existing) throw { statusCode: 404, message: 'Import type not found' }
    if (existing.is_system) throw { statusCode: 400, message: 'Không thể xoá loại nhập hệ thống' }
    await this.repo.deleteImportType(id)
  }

  listExportTypes() {
    return this.repo.findExportTypes()
  }

  async createExportType(data: CreateExportTypeBody) {
    try {
      const [row] = await this.repo.insertExportType(data)
      return row
    } catch (err) {
      mapDbError(`Key "${data.key}" đã tồn tại`)(err)
    }
  }

  async updateExportType(id: string, data: UpdateExportTypeBody) {
    const existing = await this.repo.findExportTypeById(id)
    if (!existing) throw { statusCode: 404, message: 'Export type not found' }
    const [updated] = await this.repo.updateExportType(id, data)
    return updated
  }

  async deleteExportType(id: string) {
    const existing = await this.repo.findExportTypeById(id)
    if (!existing) throw { statusCode: 404, message: 'Export type not found' }
    if (existing.is_system) throw { statusCode: 400, message: 'Không thể xoá loại xuất hệ thống' }
    await this.repo.deleteExportType(id)
  }

  // ─── Variant Attribute Defs ────────────────────────────────────────────────
  listVariantAttributeDefs() {
    return this.repo.findVariantAttributeDefs()
  }

  async createVariantAttributeDef(data: any) {
    const { product_ids, ...row } = data
    const def = await this.repo.insertVariantAttributeDef(row)
    if (def.applies_to === 'product' && product_ids?.length) {
      await this.repo.setVariantAttributeDefProducts(def.id, product_ids)
    }
    return this.repo.findVariantAttributeDefById(def.id)
  }

  async updateVariantAttributeDef(id: string, data: any) {
    const existing = await this.repo.findVariantAttributeDefById(id)
    if (!existing) throw { statusCode: 404, message: 'Attribute def not found' }
    const { product_ids, ...row } = data
    await this.repo.updateVariantAttributeDef(id, row)
    if (product_ids !== undefined) {
      await this.repo.setVariantAttributeDefProducts(id, product_ids ?? [])
    }
    return this.repo.findVariantAttributeDefById(id)
  }

  async deleteVariantAttributeDef(id: string) {
    const existing = await this.repo.findVariantAttributeDefById(id)
    if (!existing) throw { statusCode: 404, message: 'Attribute def not found' }
    await this.repo.deleteVariantAttributeDef(id)
  }

  // ─── Quotation Term Templates ─────────────────────────────────────────────

  listTermTemplates() {
    return this.db('quotation_term_templates').orderBy('sort_order').orderBy('name')
  }

  async createTermTemplate(data: { name: string; content: string; sort_order?: number }) {
    const [row] = await this.db('quotation_term_templates')
      .insert({ ...data, sort_order: data.sort_order ?? 0, created_at: this.db.fn.now(), updated_at: this.db.fn.now() })
      .returning('*')
    return row
  }

  async updateTermTemplate(id: string, data: { name?: string; content?: string; sort_order?: number }) {
    const [row] = await this.db('quotation_term_templates')
      .where({ id }).update({ ...data, updated_at: this.db.fn.now() }).returning('*')
    if (!row) throw { statusCode: 404, message: 'Term template not found' }
    return row
  }

  async deleteTermTemplate(id: string) {
    await this.db('quotation_term_templates').where({ id }).del()
  }
}
