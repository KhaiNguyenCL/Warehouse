import { beforeEach, afterAll } from 'vitest'
import { getApp, closeApp } from './helpers'

// Dùng DELETE (không phải TRUNCATE ... CASCADE) — TRUNCATE CASCADE sẽ xoá SẠCH cả
// những bảng "không liệt kê" nếu chúng có FK trỏ tới bảng bị truncate (ví dụ
// warehouses.manager_id -> users.id sẽ kéo theo TRUNCATE luôn bảng warehouses,
// xoá mất 4 kho ảo đã seed). DELETE theo thứ tự con → cha tránh được việc này,
// và không đụng tới roles/permissions/warehouses/import_types/export_types (seed cố định).
const TABLES_TO_CLEAN = [
  'stocktake_results', // FK -> stocktakes không cascade — xoá trước
  'stocktakes',        // cascade xoá stocktake_lines + stocktake_serials; serial_numbers
                        // còn bị stocktake_serials tham chiếu nên phải xoá TRƯỚC serial_numbers
  'stock_movements',
  'serial_numbers',   // phải xoá trước receipt_lines/delivery_order_lines (FK) và variants
  'inventory',
  'receipt_lines',
  'receipts',
  'delivery_order_lines',
  'delivery_orders',
  'transfer_order_lines',
  'transfer_orders',
  'reserved_items',   // FK -> variants/warehouses/quotation_line_items — xoá trước quotations
  'quotations',
  'template_field_mappings', // FK -> document_templates — xoá trước
  'document_templates',
  'bitrix_field_mappings',   // bảng config độc lập, không FK — xoá để mỗi test có config sạch
  'field_values',     // FK -> custom_fields — xoá trước
  'custom_fields',    // không có seed cố định, toàn bộ là dữ liệu do test tạo
  'variant_suppliers', // FK -> companies + variants — xoá trước cả 2
  'companies',
  'bundle_items',     // FK -> variants — xoá trước variants
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

  // Settings module test có thể tạo role/import_type/export_type tuỳ chỉnh — chỉ xoá
  // phần KHÔNG phải seed cố định (is_system=false), giữ nguyên 5 role mặc định + các
  // type hệ thống mà rất nhiều test khác đang dựa vào tồn tại sẵn. Chạy SAU khi đã xoá
  // hết 'users' ở trên nên không vướng FK users.role_id.
  const customRoleIds = await app.db('roles').where({ is_system: false }).pluck('id')
  if (customRoleIds.length > 0) {
    await app.db('role_permissions').whereIn('role_id', customRoleIds).del()
    await app.db('roles').whereIn('id', customRoleIds).del()
  }
  await app.db('import_types').where({ is_system: false }).del()
  await app.db('export_types').where({ is_system: false }).del()
})

afterAll(async () => {
  await closeApp()
})
