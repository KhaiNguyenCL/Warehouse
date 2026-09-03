import { FastifyRequest, FastifyReply } from 'fastify'
import { authenticate } from './auth'

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
