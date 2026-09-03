import { FastifyInstance } from 'fastify'
import { authenticate } from '../../middleware/auth'

export async function activityLogRoutes(app: FastifyInstance) {
  // GET /activity-logs?object_type=&object_id=&actor_id=&limit=&offset=
  app.get(
    '/',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            object_type: { type: 'string' },
            object_id:   { type: 'string', format: 'uuid' },
            actor_id:    { type: 'string', format: 'uuid' },
            limit:       { type: 'integer', minimum: 1, maximum: 200, default: 50 },
            offset:      { type: 'integer', minimum: 0, default: 0 },
          },
        },
      },
      preHandler: authenticate,
    },
    async (request) => {
      const { object_type, object_id, actor_id, limit = 50, offset = 0 } = request.query as any
      const q = app.db('activity_logs as al')
        .orderBy('al.created_at', 'desc')
        .limit(limit)
        .offset(offset)

      if (object_type) q.where('al.object_type', object_type)
      if (object_id)   q.where('al.object_id', object_id)
      if (actor_id)    q.where('al.actor_id', actor_id)

      const [rows, [{ count }]] = await Promise.all([
        q,
        app.db('activity_logs').modify((qb) => {
          if (object_type) qb.where('object_type', object_type)
          if (object_id)   qb.where('object_id', object_id)
          if (actor_id)    qb.where('actor_id', actor_id)
        }).count('id as count'),
      ])

      return { data: rows, total: Number(count), limit, offset }
    },
  )
}
