import dotenv from 'dotenv'
import path from 'path'
// Nạp .env.test TRƯỚC khi import buildApp — buildApp() đăng ký envPlugin/knexPlugin
// đọc process.env ngay lúc register, phải có DB_NAME=wms_test_db sẵn từ đây.
dotenv.config({ path: path.resolve(__dirname, '../../../.env.test') })

import bcrypt from 'bcrypt'
import { FastifyInstance } from 'fastify'
import { buildApp } from '../src/app'

let appInstance: FastifyInstance | null = null

// Dùng lại 1 Fastify instance (và 1 connection pool) cho toàn bộ test file —
// gọi buildApp() mỗi test sẽ tốn thời gian mở pool mới không cần thiết.
export async function getApp(): Promise<FastifyInstance> {
  if (!appInstance) {
    appInstance = await buildApp()
    await appInstance.ready()
  }
  return appInstance
}

export async function closeApp() {
  if (appInstance) {
    await appInstance.close()
    appInstance = null
  }
}

export async function createUserWithRole(roleName: string, email: string, password: string) {
  const app = await getApp()
  const role = await app.db('roles').where({ name: roleName }).first()
  if (!role) throw new Error(`Role "${roleName}" không tồn tại trong DB — kiểm tra seed data`)

  const password_hash = await bcrypt.hash(password, 10)
  const [user] = await app
    .db('users')
    .insert({ full_name: `Test ${roleName}`, email, password_hash, role_id: role.id })
    .returning('*')
  return user
}

export async function loginAs(email: string, password: string): Promise<string> {
  const app = await getApp()
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email, password },
  })
  return JSON.parse(res.payload).token
}
