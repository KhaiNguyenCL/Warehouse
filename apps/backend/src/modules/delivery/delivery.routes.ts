import { FastifyPluginAsync } from 'fastify'

const deliveryRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async () => ({ message: 'delivery routes — TODO' }))
}

export default deliveryRoutes
