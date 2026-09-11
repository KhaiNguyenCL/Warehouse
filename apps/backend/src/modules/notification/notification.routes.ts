import { FastifyPluginAsync } from 'fastify'
import { authenticate } from '../../middleware/auth'
import { NotificationService } from './notification.service'

const notificationRoutes: FastifyPluginAsync = async (app) => {
  const service = new NotificationService(app.db)

  app.get('/', { preHandler: authenticate }, async (request) => {
    return service.list(request.user.sub)
  })

  app.patch<{ Params: { id: string } }>('/:id/read', { preHandler: authenticate }, async (request) => {
    return service.markRead(request.params.id, request.user.sub)
  })

  app.patch('/read-all', { preHandler: authenticate }, async (request, reply) => {
    await service.markAllRead(request.user.sub)
    reply.code(204).send()
  })
}

export default notificationRoutes
