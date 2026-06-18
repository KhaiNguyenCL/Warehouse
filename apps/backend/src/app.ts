// "Khung xương" của backend — nơi duy nhất biết TẤT CẢ plugin và module nào tồn tại.
// Tách khỏi server.ts để có thể import buildApp() trong test mà không cần mở port thật.
import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'

import { knexPlugin } from './plugins/knex'
import { envPlugin } from './plugins/env'

// Mỗi module nghiệp vụ export 1 Fastify plugin (xem modules/receipt/receipt.routes.ts
// làm ví dụ). Import hết vào đây rồi register dưới dạng route có prefix riêng.
import authRoutes from './modules/auth/auth.routes'
import productRoutes from './modules/product/product.routes'
import warehouseRoutes from './modules/warehouse/warehouse.routes'
import inventoryRoutes from './modules/inventory/inventory.routes'
import receiptRoutes from './modules/receipt/receipt.routes'
import deliveryRoutes from './modules/delivery/delivery.routes'
import transferRoutes from './modules/transfer/transfer.routes'
import quotationRoutes from './modules/quotation/quotation.routes'
import companyRoutes from './modules/company/company.routes'
import stocktakeRoutes from './modules/stocktake/stocktake.routes'
import templateRoutes from './modules/template/template.routes'
import bitrixRoutes from './modules/bitrix/bitrix.routes'
import settingsRoutes from './modules/settings/settings.routes'

export async function buildApp() {
  const app = Fastify({
    logger: {
      // production chỉ log warn/error (đỡ rác log); dev log mọi thứ (info) để debug
      level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
    },
  })

  // ─── Plugins ─── thứ tự register CÓ Ý NGHĨA: envPlugin chạy trước để fail-fast
  // nếu thiếu biến môi trường, trước khi tốn công kết nối DB.
  await app.register(envPlugin)      // validate process.env có đủ biến bắt buộc
  await app.register(knexPlugin)     // kết nối Postgres, gắn app.db cho mọi route dùng
  await app.register(cors, { origin: true })          // cho phép web/mobile gọi API (origin: true = mở cho tất cả, NHỚ siết lại ở production)
  await app.register(jwt, { secret: process.env.JWT_SECRET! })  // bật request.jwtVerify() / app.jwt.sign()
  await app.register(multipart)      // cho phép upload file (dùng ở module template — upload Excel)

  // Health check — dùng để kiểm tra server còn sống (load balancer, docker healthcheck...)
  app.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }))

  // ─── Routes ─── mỗi module có URL riêng dưới /api/v1/...
  // Ví dụ: receiptRoutes định nghĩa route '/' và '/:id' bên trong,
  // khi register với prefix '/api/v1/receipts' thì thành GET /api/v1/receipts, GET /api/v1/receipts/:id
  await app.register(authRoutes,      { prefix: '/api/v1/auth' })
  await app.register(productRoutes,   { prefix: '/api/v1/products' })
  await app.register(warehouseRoutes, { prefix: '/api/v1/warehouses' })
  await app.register(inventoryRoutes, { prefix: '/api/v1/inventory' })
  await app.register(receiptRoutes,   { prefix: '/api/v1/receipts' })
  await app.register(deliveryRoutes,  { prefix: '/api/v1/deliveries' })
  await app.register(transferRoutes,  { prefix: '/api/v1/transfers' })
  await app.register(quotationRoutes, { prefix: '/api/v1/quotations' })
  await app.register(companyRoutes,   { prefix: '/api/v1/companies' })
  await app.register(stocktakeRoutes, { prefix: '/api/v1/stocktakes' })
  await app.register(templateRoutes,  { prefix: '/api/v1/templates' })
  await app.register(bitrixRoutes,    { prefix: '/api/v1/bitrix' })
  await app.register(settingsRoutes,  { prefix: '/api/v1/settings' })

  return app
}
