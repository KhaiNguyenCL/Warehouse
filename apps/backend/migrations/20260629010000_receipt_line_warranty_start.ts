import { Knex } from 'knex'

// Ngày bắt đầu BH hãng trên receipt_line — tuỳ chọn, override completed_at khi hãng
// tính BH từ ngày xuất xưởng / ngày giao chứ không phải ngày nhập vào kho ta.
// Nếu null → fallback về receipts.completed_at (hành vi cũ).
export async function up(knex: Knex) {
  await knex.schema.table('receipt_lines', (t) => {
    t.timestamp('manufacturer_warranty_start', { useTz: true }).nullable()
  })
}

export async function down(knex: Knex) {
  await knex.schema.table('receipt_lines', (t) => {
    t.dropColumn('manufacturer_warranty_start')
  })
}
