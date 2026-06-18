import { FastifyPluginAsync } from 'fastify'

const settingsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async () => ({ message: 'settings routes — TODO' }))
}

export default settingsRoutes
