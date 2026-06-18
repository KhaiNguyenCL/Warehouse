// Fastify plugin — tạo 1 Knex instance (connection pool) DUY NHẤT, gắn vào app.db
// để mọi route/service dùng chung (không tạo connection mới mỗi request).
import fp from 'fastify-plugin'
import { FastifyInstance } from 'fastify'
import knex, { Knex } from 'knex'

// "Dạy" TypeScript biết app.db tồn tại và có type Knex — nếu không khai báo,
// gọi app.db ở bất kỳ đâu sẽ bị lỗi type "Property 'db' does not exist".
declare module 'fastify' {
  interface FastifyInstance {
    db: Knex
  }
}

export const knexPlugin = fp(async (app: FastifyInstance) => {
  const db = knex({
    client: 'postgresql',
    connection: {
      host:     process.env.DB_HOST,
      port:     Number(process.env.DB_PORT ?? 5432),
      database: process.env.DB_NAME,
      user:     process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    },
    pool: { min: 2, max: 10 },   // giữ sẵn 2 connection, mở thêm tối đa tới 10 khi cần
  })

  // Test kết nối ngay lúc khởi động — nếu DB sai host/password thì server crash ngay,
  // không phải chờ tới request đầu tiên mới phát hiện.
  await db.raw('SELECT 1')
  app.log.info('Database connected')

  app.decorate('db', db)   // gắn db vào app — từ đây mọi route gọi app.db(...) hoặc request.server.db(...)

  // Đóng connection pool sạch sẽ khi server tắt (Ctrl+C, hoặc app.close() trong test)
  app.addHook('onClose', async () => {
    await db.destroy()
  })
})
