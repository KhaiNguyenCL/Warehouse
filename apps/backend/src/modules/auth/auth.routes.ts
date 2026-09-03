import { FastifyPluginAsync } from 'fastify'
import { AuthService } from './auth.service'
import { loginSchema, LoginBody } from './auth.schema'
import { authenticate } from '../../middleware/auth'

const authRoutes: FastifyPluginAsync = async (app) => {
  const service = new AuthService(app)

  app.post<{ Body: LoginBody }>('/login', { schema: loginSchema }, async (request, reply) => {
    const result = await service.login(request.body.email, request.body.password)
    return reply.send(result)
  })

  app.get('/me', { preHandler: authenticate }, async (request, reply) => {
    const { sub } = request.user
    const user = await app.db('users')
      .where('users.id', sub)
      .select('users.id', 'users.email', 'users.full_name')
      .first()
    if (!user) return reply.code(404).send({ error: 'Not found' })

    const [groups, permRows] = await Promise.all([
      app.db('user_group_members as ugm')
        .join('user_groups as ug', 'ug.id', 'ugm.group_id')
        .join('roles as r', 'r.id', 'ug.role_id')
        .where('ugm.user_id', sub)
        .select('ug.id', 'ug.name', 'r.name as role_name'),
      // Lấy tất cả permission keys của user (union qua tất cả role trong các group)
      app.db('user_group_members as ugm')
        .join('user_groups as ug', 'ug.id', 'ugm.group_id')
        .join('role_permissions as rp', 'rp.role_id', 'ug.role_id')
        .join('permissions as p', 'p.id', 'rp.permission_id')
        .where('ugm.user_id', sub)
        .distinct('p.key')
        .pluck('p.key'),
    ])

    return reply.send({ ...user, groups, permissions: permRows })
  })
}

export default authRoutes
