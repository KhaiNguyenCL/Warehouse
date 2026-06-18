// File cấu hình cho Knex CLI (chạy migration). KHÔNG dùng để kết nối DB lúc app chạy —
// việc đó nằm ở src/plugins/knex.ts. File này chỉ phục vụ lệnh:
//   pnpm migrate  (= knex migrate:latest)
import type { Knex } from 'knex'
import dotenv from 'dotenv'
import path from 'path'
// .env nằm ở root monorepo (2 cấp trên file này), không phải apps/backend
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

// Knex cho phép định nghĩa nhiều "environment" (development/production/...),
// chọn bằng biến NODE_ENV. Mỗi environment có connection + nơi chứa migration riêng.
const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'postgresql',           // loại DB — Knex hỗ trợ nhiều driver, mình dùng pg
    connection: {
      host:     process.env.DB_HOST     ?? 'localhost',
      port:     Number(process.env.DB_PORT ?? 5432),
      database: process.env.DB_NAME     ?? 'wms_db',
      user:     process.env.DB_USER     ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
    },
    migrations: {
      directory: './migrations',    // Knex CLI quét file migration trong thư mục này
      extension: 'ts',              // tìm file .ts (cần tsx để load — xem package.json)
    },
    pool: { min: 2, max: 10 },      // số connection giữ sẵn trong pool (2 tối thiểu, 10 tối đa)
  },

  production: {
    client: 'postgresql',
    connection: process.env.DATABASE_URL,  // production thường dùng 1 connection string duy nhất
    migrations: {
      directory: './migrations',
      extension: 'ts',
    },
    pool: { min: 2, max: 10 },
  },
}

export default config
