import { FastifyPluginAsync } from 'fastify'

const inventoryRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async () => ({ message: 'inventory routes — TODO' }))
}

export default inventoryRoutes
