// Fastify plugin — chạy 1 lần lúc khởi động server, KHÔNG xử lý request.
// Mục đích: fail nhanh ("fail-fast") nếu thiếu config quan trọng, thay vì để app chạy
// lỗi mơ hồ ở giữa lúc xử lý request (ví dụ JWT_SECRET undefined → sign() lỗi khó hiểu).
import fp from 'fastify-plugin'   // bọc plugin bằng fastify-plugin để app.decorate() ở plugin con
                                   // (knex.ts) "thấy" được — Fastify mặc định encapsulate plugin,
                                   // fp() tắt encapsulation cho riêng plugin này.
import { FastifyInstance } from 'fastify'

const REQUIRED_ENV = ['JWT_SECRET', 'DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD']

export const envPlugin = fp(async (app: FastifyInstance) => {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key])
  if (missing.length > 0) {
    // throw ở đây làm app.register() reject → server.ts catch và process.exit(1)
    throw new Error(`Missing required env vars: ${missing.join(', ')}`)
  }
})
