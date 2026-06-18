import { FastifyPluginAsync } from 'fastify'

const templateRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async () => ({ message: 'template routes — TODO' }))
}

export default templateRoutes
