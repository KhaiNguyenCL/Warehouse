import type { Knex } from 'knex'

// bundle_unit_qty: khi dòng DO là 1 component của 1 bundle (bundle_id IS NOT NULL),
// field này lưu số lượng bundle đơn vị mà dòng này đại diện — dùng để tính tiến độ
// xuất kho theo báo giá ở mức bundle (không phải mức component).
// VD: xuất 2 bundle SG350+Cáp → switch_line.quantity=2, cap_line.quantity=4, cả 2 đều
// có bundle_unit_qty=2. Khi so sánh với remaining_qty trên quotation_line, dùng
// bundle_unit_qty thay vì quantity để không bị nhầm.
export async function up(knex: Knex) {
  await knex.schema.alterTable('delivery_order_lines', (t) => {
    t.integer('bundle_unit_qty').nullable()
  })
}

export async function down(knex: Knex) {
  await knex.schema.alterTable('delivery_order_lines', (t) => {
    t.dropColumn('bundle_unit_qty')
  })
}
