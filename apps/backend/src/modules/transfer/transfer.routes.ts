import { FastifyPluginAsync } from 'fastify'

const transferRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async () => ({ message: 'transfer routes — TODO' }))
}

export default transferRoutes
