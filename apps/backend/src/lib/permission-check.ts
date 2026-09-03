import { Knex } from 'knex'

export async function userHasPermission(db: Knex, userId: string, permissionKey: string): Promise<boolean> {
  const row = await db('user_group_members as ugm')
    .join('user_groups as ug', 'ug.id', 'ugm.group_id')
    .join('role_permissions as rp', 'rp.role_id', 'ug.role_id')
    .join('permissions as p', 'p.id', 'rp.permission_id')
    .where('ugm.user_id', userId)
    .where('p.key', permissionKey)
    .first()
  return !!row
}
