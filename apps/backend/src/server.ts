// Entry point thật của backend — đây là file `pnpm dev` chạy.
// Tách riêng khỏi app.ts để app.ts có thể được import trong test (build app nhưng không listen port).
import dotenv from 'dotenv'
import path from 'path'
// .env nằm ở root monorepo, không phải apps/backend — chỉ định path rõ ràng vì pnpm
// chạy script với cwd = apps/backend, dotenv mặc định chỉ tìm .env ở cwd.
dotenv.config({ path: path.resolve(__dirname, '../../../.env') })
import { buildApp } from './app'

const PORT = Number(process.env.PORT ?? 3000)

async function start() {
  const app = await buildApp()   // dựng Fastify instance + tất cả plugin/route
  try {
    // host: '0.0.0.0' — lắng nghe trên mọi network interface (không chỉ localhost).
    // Cần thiết nếu sau này chạy trong Docker container và muốn truy cập từ ngoài.
    await app.listen({ port: PORT, host: '0.0.0.0' })
    console.log(`WMS API running on http://localhost:${PORT}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)  // thoát hẳn process nếu listen thất bại (ví dụ port bị chiếm)
  }
}

start()
