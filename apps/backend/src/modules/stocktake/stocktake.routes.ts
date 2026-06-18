import { FastifyPluginAsync } from 'fastify'

const stocktakeRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async () => ({ message: 'stocktake routes — TODO' }))
}

export default stocktakeRoutes
