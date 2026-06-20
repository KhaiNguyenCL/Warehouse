import { Knex } from 'knex'
import {
  ListUserQuery,
  CreateImportTypeBody,
  UpdateImportTypeBody,
  CreateExportTypeBody,
  UpdateExportTypeBody,
} from './settings.schema'

export class SettingsRepository {
  constructor(private db: Knex) {}

  // ─── Roles & Permissions ──────────────────────────────────────────────────

  findRoles() {
    return this.db('roles').orderBy('name')
  }

  async findRoleById(id: string) {
    const role = await this.db('roles').where({ id }).first()
    if (!role) return null
    const permissions = await this.db('role_permissions as rp')
      .join('permissions as p', 'p.id', 'rp.permission_id')
      .where('rp.role_id', id)
      .select('p.id', 'p.key', 'p.description', 'p.group')
    return { ...role, permissions }
  }

  countUsersByRole(roleId: string) {
    return this.db('users').where({ role_id: roleId }).count('id as count').first()
  }

  insertRole(data: { name: string; description?: string }) {
    return this.db('roles').insert({ ...data, is_system: false }).returning('*')
  }

  updateRole(id: string, data: Record<string, unknown>) {
    return this.db('roles').where({ id }).update({ ...data, updated_at: this.db.fn.now() }).returning('*')
  }

  deleteRole(id: string) {
    return this.db('roles').where({ id }).del()
  }

  findPermissions() {
    return this.db('permissions').orderBy(['group', 'key'])
  }

  findPermissionsByKeys(keys: string[]) {
    return this.db('permissions').whereIn('key', keys)
  }

  async replaceRolePermissions(roleId: string, permissionIds: string[], trx: Knex.Transaction) {
    await trx('role_permissions').where({ role_id: roleId }).del()
    if (permissionIds.length === 0) return
    await trx('role_permissions').insert(permissionIds.map((permission_id) => ({ role_id: roleId, permission_id })))
  }

  // ─── Users ─────────────────────────────────────────────────────────────────

  async findUsers(query: ListUserQuery) {
    const { role_id, is_active, page = 1, limit = 20 } = query
    const offset = (page - 1) * limit

    const base = this.db('users as u').join('roles as r', 'r.id', 'u.role_id')
    if (role_id) base.where('u.role_id', role_id)
    if (is_active !== undefined) base.where('u.is_active', is_active)

    const [data, countResult] = await Promise.all([
      base
        .clone()
        .select('u.id', 'u.full_name', 'u.email', 'u.phone', 'u.is_active', 'u.created_at', 'r.name as role_name', 'u.role_id')
        .orderBy('u.full_name')
        .limit(limit)
        .offset(offset),
      base.clone().clearSelect().count('u.id as count').first(),
    ])

    return { data, total: Number(countResult?.count ?? 0), page, limit }
  }

  findUserById(id: string) {
    return this.db('users as u')
      .join('roles as r', 'r.id', 'u.role_id')
      .where('u.id', id)
      .select('u.id', 'u.full_name', 'u.email', 'u.phone', 'u.is_active', 'u.created_at', 'r.name as role_name', 'u.role_id')
      .first()
  }

  findUserByEmail(email: string) {
    return this.db('users').where({ email }).first()
  }

  findRoleByIdRaw(id: string) {
    return this.db('roles').where({ id }).first()
  }

  insertUser(data: { full_name: string; email: string; phone?: string; password_hash: string; role_id: string }) {
    return this.db('users').insert(data).returning('*')
  }

  updateUser(id: string, data: Record<string, unknown>) {
    return this.db('users').where({ id }).update({ ...data, updated_at: this.db.fn.now() }).returning('*')
  }

  // ─── Import / Export Types ─────────────────────────────────────────────────

  findImportTypes() {
    return this.db('import_types').orderBy('key')
  }

  findImportTypeById(id: string) {
    return this.db('import_types').where({ id }).first()
  }

  findImportTypeByKey(key: string) {
    return this.db('import_types').where({ key }).first()
  }

  insertImportType(data: CreateImportTypeBody) {
    return this.db('import_types').insert({ ...data, is_system: false }).returning('*')
  }

  updateImportType(id: string, data: UpdateImportTypeBody) {
    return this.db('import_types').where({ id }).update(data).returning('*')
  }

  deleteImportType(id: string) {
    return this.db('import_types').where({ id }).del()
  }

  findExportTypes() {
    return this.db('export_types').orderBy('key')
  }

  findExportTypeById(id: string) {
    return this.db('export_types').where({ id }).first()
  }

  findExportTypeByKey(key: string) {
    return this.db('export_types').where({ key }).first()
  }

  insertExportType(data: CreateExportTypeBody) {
    return this.db('export_types').insert({ ...data, is_system: false }).returning('*')
  }

  updateExportType(id: string, data: UpdateExportTypeBody) {
    return this.db('export_types').where({ id }).update(data).returning('*')
  }

  deleteExportType(id: string) {
    return this.db('export_types').where({ id }).del()
  }
}
