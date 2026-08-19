// Chạy 1 lần duy nhất trước toàn bộ test suite — dùng để chuẩn bị DB test
import knex from 'knex'
import bcrypt from 'bcrypt'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../../../../.env.test') })

export async function setup() {
  const db = knex({
    client: 'postgresql',
    connection: {
      host:     process.env.DB_HOST     ?? 'localhost',
      port:     Number(process.env.DB_PORT ?? 5432),
      database: process.env.DB_NAME     ?? 'wms_test_db',
      user:     process.env.DB_USER     ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
    },
  })

  // Reset admin password về giá trị biết trước để test có thể đăng nhập
  const hash = await bcrypt.hash('admin123', 10)
  await db('users').where('email', 'admin@test.local').update({ password_hash: hash, is_active: true })

  await db.destroy()
}

export async function teardown() {}
