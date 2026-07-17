import fp from 'fastify-plugin'
import { FastifyPluginAsync } from 'fastify'
import cron from 'node-cron'
import { QuotationService } from '../modules/quotation/quotation.service'

// Chạy mỗi 15 phút — đủ sát với expired_at mà không tốn tài nguyên.
// Dùng fastify-plugin để plugin có quyền truy cập app.db (không tạo scope mới).
const schedulerPlugin: FastifyPluginAsync = fp(async (app) => {
  const service = new QuotationService(app.db)

  async function expireOverdueQuotations() {
    const overdue = await app.db('quotations')
      .where('status', 'confirmed')
      .where('expired_at', '<=', app.db.fn.now())
      .select('id')

    if (overdue.length === 0) return

    app.log.info(`[scheduler] expiring ${overdue.length} overdue quotation(s)`)

    for (const { id } of overdue) {
      try {
        await service.expire(id)
      } catch (err: any) {
        // Quota đã expired/cancelled bởi request khác trước khi job chạy tới — bỏ qua.
        if (err.statusCode === 400) continue
        app.log.error({ err, quotationId: id }, '[scheduler] failed to expire quotation')
      }
    }
  }

  // Chạy ngay 1 lần khi server start (bắt kịp các quotation expired khi server đang offline).
  app.addHook('onReady', async () => {
    await expireOverdueQuotations()
  })

  cron.schedule('*/15 * * * *', expireOverdueQuotations)
})

export default schedulerPlugin
