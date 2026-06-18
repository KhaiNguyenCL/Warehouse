import { FastifyPluginAsync } from 'fastify'

const warehouseRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async () => ({ message: 'warehouse routes — TODO' }))
}

export default warehouseRoutes
