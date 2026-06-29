import { Knex } from 'knex'

// Ngày bắt đầu BH công ty trên delivery_order_lines — tuỳ chọn.
// Cho phép user nhập ngày lắp đặt/bàn giao thực tế thay vì dùng completed_at.
// Nếu null → fallback về delivery.completed_at (hành vi mặc định).
export async function up(knex: Knex) {
  await knex.schema.table('delivery_order_lines', (t) => {
    t.timestamp('customer_warranty_start', { useTz: true }).nullable()
  })
}

export async function down(knex: Knex) {
  await knex.schema.table('delivery_order_lines', (t) => {
    t.dropColumn('customer_warranty_start')
  })
}
