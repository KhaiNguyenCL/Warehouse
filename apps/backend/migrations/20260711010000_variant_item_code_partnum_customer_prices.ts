import { Knex } from 'knex'

export async function up(knex: Knex) {
  // 1. Thêm item_code (mã hàng viết tắt — trước đây là sku)
  await knex.schema.alterTable('variants', (t) => {
    t.text('item_code').nullable()
    t.text('part_number').nullable()
  })

  // 2. Migrate sku hiện tại → item_code
  await knex.raw('UPDATE variants SET item_code = sku WHERE item_code IS NULL')

  // 3. Tạo sequence để sinh sku tự tăng
  await knex.raw("CREATE SEQUENCE IF NOT EXISTS variant_sku_seq START 1")

  // 4. Đánh số lại sku hiện tại thành chuỗi số tuần tự (000001, 000002, ...)
  await knex.raw(`
    WITH ranked AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS rn
      FROM variants
    )
    UPDATE variants v
    SET sku = LPAD(r.rn::text, 6, '0')
    FROM ranked r
    WHERE v.id = r.id
  `)

  // 5. Đặt sequence bắt đầu từ sau số lượng variant hiện có
  await knex.raw("SELECT setval('variant_sku_seq', GREATEST(1, (SELECT COUNT(*) FROM variants)), true)")

  // 6. Bảng giá cố định theo khách hàng
  await knex.schema.createTable('customer_prices', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    t.uuid('variant_id').notNullable().references('id').inTable('variants').onDelete('CASCADE')
    t.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE')
    t.decimal('price', 15, 2).notNullable()
    t.specificType('currency', 'char(3)').notNullable().defaultTo('VND')
    t.text('note').nullable()
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now())
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now())
    t.unique(['variant_id', 'company_id'])
  })
}

export async function down(knex: Knex) {
  await knex.schema.dropTableIfExists('customer_prices')
  await knex.raw("DROP SEQUENCE IF EXISTS variant_sku_seq")
  await knex.schema.alterTable('variants', (t) => {
    t.dropColumn('item_code')
    t.dropColumn('part_number')
  })
}
