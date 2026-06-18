import { beforeEach, afterAll } from 'vitest'
import { getApp, closeApp } from './helpers'

// Dùng DELETE (không phải TRUNCATE ... CASCADE) — TRUNCATE CASCADE sẽ xoá SẠCH cả
// những bảng "không liệt kê" nếu chúng có FK trỏ tới bảng bị truncate (ví dụ
// warehouses.manager_id -> users.id sẽ kéo theo TRUNCATE luôn bảng warehouses,
// xoá mất 4 kho ảo đã seed). DELETE theo thứ tự con → cha tránh được việc này,
// và không đụng tới roles/permissions/warehouses/import_types/export_types (seed cố định).
const TABLES_TO_CLEAN = [
  'stock_movements',
  'serial_numbers',   // phải xoá trước receipt_lines/delivery_order_lines (FK) và variants
  'inventory',
  'receipt_lines',
  'receipts',
  'delivery_order_lines',
  'delivery_orders',
  'transfer_order_lines',
  'transfer_orders',
  'quotations',
  'companies',
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
  // Chỉ xoá kho "physical" do test tạo ra — 4 kho "virtual" (WH-DEMO, WH-BH,...)
  // là seed data cố định từ migration, nhiều test khác đang dựa vào chúng tồn tại sẵn.
  await app.db('warehouses').where({ type: 'physical' }).del()
})

afterAll(async () => {
  await closeApp()
})
