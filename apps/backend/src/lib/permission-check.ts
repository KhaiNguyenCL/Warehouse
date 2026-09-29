import { Knex } from 'knex'

// RBAC không có cột users.role_id trực tiếp — role gắn vào user_groups, user thuộc N
// group (user_group_members), nên phải join qua đúng 4 bảng này. Nếu sau này thêm bảng
// users.role_id thì đây KHÔNG phải nguồn sự thật, tra theo group vẫn là chuẩn (đối xứng
// với middleware/permission.ts::requirePermission() dùng cùng query để check preHandler).
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
