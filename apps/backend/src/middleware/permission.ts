import { FastifyRequest, FastifyReply } from 'fastify'
import { authenticate } from './auth'

// Tự gọi authenticate() trước — route dùng requirePermission() KHÔNG cần khai báo thêm
// preHandler: authenticate riêng, khai cả 2 là dư thừa (chỉ chạy JWT verify 2 lần vô hại
// nhưng dễ gây nhầm là 2 bước độc lập). Query check permission giống hệt
// lib/permission-check.ts::userHasPermission() — cùng lý do (RBAC qua user_group_members
// → user_groups.role_id, không có users.role_id trực tiếp).
export function requirePermission(permissionKey: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await authenticate(request, reply)
    if (reply.sent) return

    const db = request.server.db
    const has = await db('user_group_members as ugm')
      .join('user_groups as ug', 'ug.id', 'ugm.group_id')
      .join('role_permissions as rp', 'rp.role_id', 'ug.role_id')
      .join('permissions as p', 'p.id', 'rp.permission_id')
      .where('ugm.user_id', request.user.sub)
      .where('p.key', permissionKey)
      .first()

    if (!has) {
      reply.code(403).send({ error: 'Forbidden', required: permissionKey })
    }
  }
}
