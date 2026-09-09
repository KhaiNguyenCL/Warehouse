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
  let user: any
  const existing = await app.db('users').where({ email }).first()
  if (existing) {
    const [u] = await app.db('users').where({ email }).update({ password_hash }).returning('*')
    user = u
  } else {
    const [u] = await app.db('users')
      .insert({ full_name: `Test ${roleName}`, email, password_hash })
      .returning('*')
    user = u
  }

  // Đảm bảo có group với role này và user thuộc group đó
  let group = await app.db('user_groups').where({ role_id: role.id }).first()
  if (!group) {
    const [g] = await app.db('user_groups')
      .insert({ name: `${roleName} Group`, role_id: role.id, created_at: app.db.fn.now(), updated_at: app.db.fn.now() })
      .returning('*')
    group = g
  }
  await app.db('user_group_members')
    .insert({ user_id: user.id, group_id: group.id })
    .onConflict(['user_id', 'group_id']).ignore()

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

// Receipt import_type='purchase' bắt buộc shipment_id trỏ tới 1 Shipment đã "Đã nhận hàng"
// (xem receipt.service.ts::validateShipment) — helper này tạo + receive luôn 1 shipment,
// trả về id để dùng làm shipment_id khi test tạo receipt purchase.
export async function createReceivedShipment(
  token: string,
  warehouseId: string,
  lines: Array<{ variant_id: string; qty_expected: number; po_line_id?: string }>,
  po_id?: string,
): Promise<string> {
  const app = await getApp()
  const createRes = await app.inject({
    method: 'POST',
    url: '/api/v1/shipments',
    headers: { authorization: `Bearer ${token}` },
    payload: { warehouse_id: warehouseId, lines, ...(po_id ? { po_id } : {}) },
  })
  const shipment = JSON.parse(createRes.payload)
  if (!shipment.id) {
    throw new Error(`Tạo shipment thất bại: ${createRes.payload}`)
  }
  const receiveRes = await app.inject({
    method: 'PATCH',
    url: `/api/v1/shipments/${shipment.id}/receive`,
    headers: { authorization: `Bearer ${token}` },
    payload: {},
  })
  if (receiveRes.statusCode !== 200) {
    throw new Error(`Receive shipment thất bại: ${receiveRes.payload}`)
  }
  return shipment.id
}
