import { FastifyPluginAsync } from 'fastify'

const bitrixRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async () => ({ message: 'bitrix routes — TODO' }))
}

export default bitrixRoutes
