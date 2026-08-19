// Chạy trước mỗi test FILE — load .env.test để process.env sẵn sàng trước buildApp()
import dotenv from 'dotenv'
import path from 'path'
import knex from 'knex'
import { beforeEach } from 'vitest'

dotenv.config({ path: path.resolve(__dirname, '../../../../.env.test') })

const SYSTEM_WAREHOUSE_CODES = ['WH-DEMO', 'WH-BH', 'WH-QC', 'WH-SN']
const ADMIN_EMAIL = 'admin@test.local'

// Singleton DB connection dùng riêng cho cleanup — không dùng app instance
let _db: ReturnType<typeof knex> | null = null

function getDb() {
  if (!_db) {
    _db = knex({
      client: 'postgresql',
      connection: {
        host:     process.env.DB_HOST     ?? 'localhost',
        port:     Number(process.env.DB_PORT ?? 5435),
        database: process.env.DB_NAME     ?? 'wms_test_db',
        user:     process.env.DB_USER     ?? 'postgres',
        password: process.env.DB_PASSWORD ?? 'postgres',
      },
    })
  }
  return _db
}

// Reset toàn bộ dữ liệu nghiệp vụ trước mỗi test — giữ nguyên seed/reference data
beforeEach(async () => {
  const db = getDb()

  // Xóa theo đúng thứ tự FK — hoặc dùng TRUNCATE ... CASCADE
  await db.raw(`
    TRUNCATE TABLE
      stock_movements,
      serial_numbers,
      reserved_items,
      delivery_order_lines,
      delivery_orders,
      transfer_order_lines,
      transfer_orders,
      receipt_lines,
      receipts,
      quotation_line_items,
      quotation_sections,
      quotations,
      purchase_order_lines,
      purchase_orders,
      stocktake_results,
      stocktake_lines,
      stocktakes,
      inventory,
      document_templates,
      template_field_mappings,
      bitrix_field_mappings,
      variant_suppliers,
      bundle_items,
      variants,
      products,
      categories,
      brands
    CASCADE
  `)

  // Xóa warehouses do test tạo ra, giữ lại system warehouses
  await db('warehouses')
    .whereNotIn('code', SYSTEM_WAREHOUSE_CODES)
    .delete()

  // Xóa companies và contacts (created by tests)
  await db('company_types').delete()
  await db('contacts').delete()
  await db('companies').delete()

  // Xóa custom import/export types (giữ lại is_system=true)
  await db('import_types').where('is_system', false).delete()
  await db('export_types').where('is_system', false).delete()

  // Xóa custom fields và values
  await db('field_values').delete().catch(() => {})
  await db('custom_fields').delete().catch(() => {})

  // Xóa non-system roles (is_system=false), sau đó xóa users phụ thuộc
  // Xóa users không phải admin trước (có thể có role_id trỏ vào custom role)
  await db('users').whereNot('email', ADMIN_EMAIL).delete()
  // Xóa custom roles
  await db('roles').where('is_system', false).delete()
})
