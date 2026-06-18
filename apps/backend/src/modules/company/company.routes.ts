import { FastifyPluginAsync } from 'fastify'

const companyRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async () => ({ message: 'company routes — TODO' }))
}

export default companyRoutes
