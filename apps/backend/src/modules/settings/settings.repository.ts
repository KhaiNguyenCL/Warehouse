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

  countGroupsByRole(roleId: string) {
    return this.db('user_groups').where({ role_id: roleId }).count('id as count').first()
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

  // ─── Groups ─────────────────────────────────────────────────────────────────

  findGroups() {
    return this.db('user_groups as ug')
      .join('roles as r', 'r.id', 'ug.role_id')
      .select('ug.*', 'r.name as role_name')
      .orderBy('ug.name')
  }

  async findGroupById(id: string) {
    const group = await this.db('user_groups as ug')
      .join('roles as r', 'r.id', 'ug.role_id')
      .where('ug.id', id)
      .select('ug.*', 'r.name as role_name')
      .first()
    if (!group) return null
    const members = await this.db('user_group_members as ugm')
      .join('users as u', 'u.id', 'ugm.user_id')
      .where('ugm.group_id', id)
      .select('u.id', 'u.full_name', 'u.email', 'u.is_active')
    return { ...group, members }
  }

  insertGroup(data: { name: string; description?: string; role_id: string }) {
    return this.db('user_groups').insert({
      ...data,
      created_at: this.db.fn.now(),
      updated_at: this.db.fn.now(),
    }).returning('*')
  }

  updateGroup(id: string, data: Record<string, unknown>) {
    return this.db('user_groups').where({ id }).update({ ...data, updated_at: this.db.fn.now() }).returning('*')
  }

  deleteGroup(id: string) {
    return this.db('user_groups').where({ id }).del()
  }

  addGroupMember(groupId: string, userId: string) {
    return this.db('user_group_members').insert({ group_id: groupId, user_id: userId })
  }

  removeGroupMember(groupId: string, userId: string) {
    return this.db('user_group_members').where({ group_id: groupId, user_id: userId }).del()
  }

  getUserGroups(userId: string) {
    return this.db('user_group_members as ugm')
      .join('user_groups as ug', 'ug.id', 'ugm.group_id')
      .join('roles as r', 'r.id', 'ug.role_id')
      .where('ugm.user_id', userId)
      .select('ug.id', 'ug.name', 'r.name as role_name')
  }

  // ─── Users ─────────────────────────────────────────────────────────────────

  async findUsers(query: ListUserQuery) {
    const { group_id, is_active, page = 1, limit = 20 } = query
    const offset = (page - 1) * limit

    let base = this.db('users as u')
    if (group_id) {
      base = base.join('user_group_members as ugm', 'ugm.user_id', 'u.id').where('ugm.group_id', group_id)
    }
    if (is_active !== undefined) base = base.where('u.is_active', is_active)

    const [users, countResult] = await Promise.all([
      base.clone()
        .select('u.id', 'u.full_name', 'u.email', 'u.phone', 'u.is_active', 'u.created_at')
        .distinct('u.id', 'u.full_name', 'u.email', 'u.phone', 'u.is_active', 'u.created_at')
        .orderBy('u.full_name')
        .limit(limit)
        .offset(offset),
      base.clone().countDistinct('u.id as count').first(),
    ])

    const ids = users.map((u: any) => u.id)
    const memberships = ids.length
      ? await this.db('user_group_members as ugm')
          .join('user_groups as ug', 'ug.id', 'ugm.group_id')
          .join('roles as r', 'r.id', 'ug.role_id')
          .whereIn('ugm.user_id', ids)
          .select('ugm.user_id', 'ug.id', 'ug.name', 'r.name as role_name')
      : []

    const groupsByUser = new Map<string, any[]>()
    for (const m of memberships) {
      if (!groupsByUser.has(m.user_id)) groupsByUser.set(m.user_id, [])
      groupsByUser.get(m.user_id)!.push({ id: m.id, name: m.name, role_name: m.role_name })
    }

    return {
      data: users.map((u: any) => ({ ...u, groups: groupsByUser.get(u.id) ?? [] })),
      total: Number(countResult?.count ?? 0),
      page,
      limit,
    }
  }

  async findUserById(id: string) {
    const user = await this.db('users as u')
      .where('u.id', id)
      .select('u.id', 'u.full_name', 'u.email', 'u.phone', 'u.is_active', 'u.created_at')
      .first()
    if (!user) return null
    const groups = await this.getUserGroups(id)
    return { ...user, groups }
  }

  findUserByEmail(email: string) {
    return this.db('users').where({ email }).first()
  }

  findRoleByIdRaw(id: string) {
    return this.db('roles').where({ id }).first()
  }

  insertUser(data: { full_name: string; email: string; phone?: string; password_hash: string }) {
    return this.db('users').insert(data).returning('*')
  }

  updateUser(id: string, data: Record<string, unknown>) {
    return this.db('users').where({ id }).update({ ...data, updated_at: this.db.fn.now() }).returning('*')
  }

  deleteUser(id: string) {
    return this.db('users').where({ id }).delete()
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

  // ─── Variant Attribute Defs ─────────────────────────────────────────────────
  async findVariantAttributeDefs() {
    const defs = await this.db('variant_attribute_defs').orderBy('created_at')
    const ids = defs.map((d: any) => d.id)
    const products = ids.length
      ? await this.db('variant_attribute_def_products as vadp')
          .join('products as p', 'p.id', 'vadp.product_id')
          .whereIn('vadp.attribute_def_id', ids)
          .select('vadp.attribute_def_id', 'vadp.product_id', 'p.name as product_name')
      : []
    const productsByDef = new Map<string, any[]>()
    for (const p of products) {
      if (!productsByDef.has(p.attribute_def_id)) productsByDef.set(p.attribute_def_id, [])
      productsByDef.get(p.attribute_def_id)!.push({ product_id: p.product_id, product_name: p.product_name })
    }
    return defs.map((d: any) => ({ ...d, products: productsByDef.get(d.id) ?? [] }))
  }

  async findVariantAttributeDefById(id: string) {
    const all = await this.findVariantAttributeDefs()
    return all.find((d: any) => d.id === id) ?? null
  }

  async insertVariantAttributeDef(data: any) {
    const [row] = await this.db('variant_attribute_defs')
      .insert({ ...data, options: data.options ?? [] })
      .returning('*')
    return row
  }

  updateVariantAttributeDef(id: string, data: any) {
    return this.db('variant_attribute_defs').where({ id }).update(data)
  }

  async setVariantAttributeDefProducts(defId: string, productIds: string[]) {
    await this.db('variant_attribute_def_products').where({ attribute_def_id: defId }).del()
    if (productIds.length) {
      await this.db('variant_attribute_def_products').insert(
        productIds.map((product_id) => ({ attribute_def_id: defId, product_id })),
      )
    }
  }

  deleteVariantAttributeDef(id: string) {
    return this.db('variant_attribute_defs').where({ id }).del()
  }
}
