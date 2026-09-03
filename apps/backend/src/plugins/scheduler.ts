import fp from 'fastify-plugin'
import { FastifyPluginAsync } from 'fastify'
import cron from 'node-cron'
import { QuotationService } from '../modules/quotation/quotation.service'
import { ReportRepository } from '../modules/report/report.repository'

// Chạy mỗi 15 phút — đủ sát với expired_at mà không tốn tài nguyên.
// Dùng fastify-plugin để plugin có quyền truy cập app.db (không tạo scope mới).
const schedulerPlugin: FastifyPluginAsync = fp(async (app) => {
  const service = new QuotationService(app.db)
  const reportRepo = new ReportRepository(app.db)

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

  // Chụp 1 snapshot report_snapshots cho "hôm nay" — nguồn dữ liệu cho sparkline/delta ở
  // trang Báo cáo (report.repository.ts::kpiTrend()). Upsert theo ngày nên an toàn khi chạy
  // lại nhiều lần trong cùng 1 ngày.
  async function captureReportSnapshot() {
    try {
      await reportRepo.captureSnapshot()
    } catch (err) {
      app.log.error({ err }, '[scheduler] failed to capture report snapshot')
    }
  }

  // Chạy ngay 1 lần khi server start — bắt kịp quotation expired khi server đang offline,
  // và đảm bảo luôn có snapshot "hôm nay" ngay cả khi server chỉ chạy 1 lúc rồi tắt trước
  // giờ cron 00:10 (vd môi trường dev không chạy xuyên đêm).
  app.addHook('onReady', async () => {
    await expireOverdueQuotations()
    await captureReportSnapshot()
  })

  cron.schedule('*/15 * * * *', expireOverdueQuotations)
  cron.schedule('10 0 * * *', captureReportSnapshot)
})

export default schedulerPlugin
