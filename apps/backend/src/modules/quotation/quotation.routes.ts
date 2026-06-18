import { FastifyPluginAsync } from 'fastify'

const quotationRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async () => ({ message: 'quotation routes — TODO' }))
}

export default quotationRoutes
