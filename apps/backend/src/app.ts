// "Khung xương" của backend — nơi duy nhất biết TẤT CẢ plugin và module nào tồn tại.
// Tách khỏi server.ts để có thể import buildApp() trong test mà không cần mở port thật.
import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import staticFiles from '@fastify/static'
import { join } from 'path'

import { knexPlugin } from './plugins/knex'
import { envPlugin } from './plugins/env'
import { carbonePlugin } from './plugins/carbone'
import { bitrixPlugin } from './plugins/bitrix'
import schedulerPlugin from './plugins/scheduler'

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
import purchaseOrderRoutes from './modules/purchaseorder/purchaseorder.routes'
import companyRoutes from './modules/company/company.routes'
import stocktakeRoutes from './modules/stocktake/stocktake.routes'
import templateRoutes from './modules/template/template.routes'
import bitrixRoutes from './modules/bitrix/bitrix.routes'
import settingsRoutes from './modules/settings/settings.routes'
import customFieldRoutes from './modules/customfield/customfield.routes'
import reportRoutes from './modules/report/report.routes'
import uploadRoutes from './modules/upload/upload.routes'

const FIELD_VI: Record<string, string> = {
  vat_percent:                   'VAT%',
  unit_price:                    'Đơn giá',
  cost_price:                    'Giá nhập',
  sale_price:                    'Giá bán',
  quantity:                      'Số lượng',
  qty_actual:                    'Số lượng thực tế',
  warranty_months:               'Bảo hành (tháng)',
  manufacturer_warranty_months:  'BH hãng (tháng)',
  customer_warranty_months:      'BH công ty (tháng)',
  weight_kg:                     'Cân nặng (kg)',
  reorder_point:                 'Điểm đặt lại',
  discount:                      'Giảm giá',
  valid_days:                    'Hiệu lực (ngày)',
  lead_time_days:                'Lead time (ngày)',
  supplier_price:                'Giá NCC',
  price:                         'Giá',
  limit:                         'Giới hạn',
}

function translateType(t: string | string[]): string {
  const map: Record<string, string> = {
    number: 'số', integer: 'số nguyên', string: 'chuỗi ký tự',
    boolean: 'true/false', array: 'danh sách', object: 'đối tượng',
  }
  return (Array.isArray(t) ? t : [t]).filter(x => x !== 'null').map(x => map[x] ?? x).join(' hoặc ')
}

function translateAjvErrors(errors: any[]): string {
  const msgs = errors.map(err => {
    const segs = (err.instancePath ?? '').split('/').filter(Boolean)
    const last = segs[segs.length - 1] ?? ''
    const label = isNaN(Number(last))
      ? (FIELD_VI[last] ?? last)
      : (FIELD_VI[segs[segs.length - 2] ?? ''] ?? segs[segs.length - 2] ?? '')

    switch (err.keyword) {
      case 'maximum':    return `${label} không được vượt quá ${err.params.limit}`
      case 'minimum':    return `${label} không được nhỏ hơn ${err.params.limit}`
      case 'type': {
        const t = translateType(err.params.type)
        return t ? `${label} phải là ${t}` : `${label} không đúng kiểu dữ liệu`
      }
      case 'required': {
        const f = FIELD_VI[err.params.missingProperty] ?? err.params.missingProperty
        return `Thiếu trường bắt buộc: ${f}`
      }
      case 'pattern':    return `${label} không đúng định dạng`
      case 'minLength':  return `${label} phải có ít nhất ${err.params.limit} ký tự`
      case 'maxLength':  return `${label} không được quá ${err.params.limit} ký tự`
      case 'enum':       return `${label} không hợp lệ`
      case 'additionalProperties': return `Trường không được phép: ${err.params.additionalProperty}`
      default:           return err.message ?? 'Dữ liệu không hợp lệ'
    }
  })
  return msgs.filter(Boolean).join('; ')
}

export async function buildApp() {
  const app = Fastify({
    logger: {
      // production chỉ log warn/error (đỡ rác log); dev log mọi thứ (info) để debug;
      // test im hoàn toàn để output `pnpm test` chỉ hiện kết quả pass/fail
      level: process.env.NODE_ENV === 'test' ? 'silent' : process.env.NODE_ENV === 'production' ? 'warn' : 'info',
    },
  })

  // ─── Plugins ─── thứ tự register CÓ Ý NGHĨA: envPlugin chạy trước để fail-fast
  // nếu thiếu biến môi trường, trước khi tốn công kết nối DB.
  await app.register(envPlugin)      // validate process.env có đủ biến bắt buộc
  await app.register(knexPlugin)     // kết nối Postgres, gắn app.db cho mọi route dùng
  await app.register(cors, { origin: true })          // cho phép web/mobile gọi API (origin: true = mở cho tất cả, NHỚ siết lại ở production)
  await app.register(jwt, { secret: process.env.JWT_SECRET! })  // bật request.jwtVerify() / app.jwt.sign()
  await app.register(multipart)      // cho phép upload file (template Excel + ảnh sản phẩm)
  await app.register(staticFiles, { root: join(process.cwd(), 'uploads'), prefix: '/uploads/' })
  await app.register(carbonePlugin)  // gắn app.carbone — render template Excel/PDF (mục 14)
  await app.register(bitrixPlugin)   // gắn app.bitrix — fetch deal/company/contact (mục 13)
  if (process.env.NODE_ENV !== 'test') {
    await app.register(schedulerPlugin) // cron: expire quotation hết hạn mỗi 15 phút
  }

  // Error handler chung — mọi route chỉ cần `throw { statusCode, message }` trong service,
  // không cần try/catch lặp lại ở từng route nữa. Fastify tự bắt lỗi throw từ async handler
  // và đưa vào đây. statusCode >= 500 thì log full error (lỗi thật, cần biết để debug);
  // 4xx là lỗi nghiệp vụ đã được service chủ động throw, không cần log ồn log server.
  app.setErrorHandler((err: any, request, reply) => {
    const statusCode = err.statusCode ?? 500
    if (statusCode >= 500) request.log.error(err)
    // AJV validation errors (từ Fastify JSON Schema) mặc định ra tiếng Anh — dịch sang tiếng Việt
    const message = err.validation ? translateAjvErrors(err.validation) : (err.message ?? 'Lỗi máy chủ')
    reply.code(statusCode).send({ error: message })
  })

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
  await app.register(purchaseOrderRoutes, { prefix: '/api/v1/purchase-orders' })
  await app.register(companyRoutes,   { prefix: '/api/v1/companies' })
  await app.register(stocktakeRoutes, { prefix: '/api/v1/stocktakes' })
  await app.register(templateRoutes,  { prefix: '/api/v1/templates' })
  await app.register(bitrixRoutes,    { prefix: '/api/v1/bitrix' })
  await app.register(settingsRoutes,  { prefix: '/api/v1/settings' })
  await app.register(customFieldRoutes, { prefix: '/api/v1/custom-fields' })
  await app.register(reportRoutes,    { prefix: '/api/v1/reports' })
  await app.register(uploadRoutes,   { prefix: '/api/v1/uploads' })

  return app
}
