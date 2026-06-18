import { beforeEach, afterAll } from 'vitest'
import { getApp, closeApp } from './helpers'

// Dùng DELETE (không phải TRUNCATE ... CASCADE) — TRUNCATE CASCADE sẽ xoá SẠCH cả
// những bảng "không liệt kê" nếu chúng có FK trỏ tới bảng bị truncate (ví dụ
// warehouses.manager_id -> users.id sẽ kéo theo TRUNCATE luôn bảng warehouses,
// xoá mất 4 kho ảo đã seed). DELETE theo thứ tự con → cha tránh được việc này,
// và không đụng tới roles/permissions/warehouses/import_types/export_types (seed cố định).
const TABLES_TO_CLEAN = [
  'stock_movements',
  'inventory',
  'receipt_lines',
  'receipts',
  'variants',
  'products',
  'categories',
  'users',
]

beforeEach(async () => {
  const app = await getApp()
  for (const table of TABLES_TO_CLEAN) {
    await app.db(table).del()
  }
})

afterAll(async () => {
  await closeApp()
})
