import { FastifyPluginAsync } from 'fastify'
import { AssistantService } from './assistant.service'
import { askAssistantSchema, AskAssistantBody } from './assistant.schema'
import { requirePermission } from '../../middleware/permission'

const assistantRoutes: FastifyPluginAsync = async (app) => {
  const service = new AssistantService(app.db)

  // POST /assistant/ask — hỏi nhanh bằng ngôn ngữ tự nhiên (VD "còn bao nhiêu SG350 ở kho HCM").
  // Gate bằng report.inventory vì hiện tool duy nhất là tra tồn kho — thêm tool mới đọc dữ
  // liệu khác (receipt, PO...) thì cân nhắc gate theo permission tương ứng của tool đó.
  app.post<{ Body: AskAssistantBody }>(
    '/ask',
    { schema: askAssistantSchema, preHandler: requirePermission('report.inventory') },
    async (request) => {
      const answer = await service.ask(request.body.question)
      return { answer }
    },
  )
}

export default assistantRoutes
