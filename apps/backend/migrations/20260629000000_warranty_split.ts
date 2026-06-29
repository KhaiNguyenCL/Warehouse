import { Knex } from 'knex'

// Tách warranty thành 2 loại (CLAUDE.md mục 19):
// - manufacturer_warranty: tính từ ngày nhập (Receipt completed_at + months)
// - customer_warranty: tính từ ngày bán (Delivery completed_at + months)
//
// Trước đây chỉ có 1 field "warranty_months" / "warranty_end" — không phân biệt được
// 2 loại bảo hành. User nhập cả 2 trên PO line; receipt kế thừa từ PO tự động.

export async function up(knex: Knex) {
  await knex.schema.table('purchase_order_lines', (t) => {
    t.renameColumn('warranty_months', 'manufacturer_warranty_months')
    t.integer('customer_warranty_months')
  })

  await knex.schema.table('receipt_lines', (t) => {
    t.renameColumn('warranty_months', 'manufacturer_warranty_months')
    t.integer('customer_warranty_months')
  })

  await knex.schema.table('serial_numbers', (t) => {
    t.renameColumn('warranty_end', 'manufacturer_warranty_end')
    t.timestamp('customer_warranty_end', { useTz: true })
  })
}

export async function down(knex: Knex) {
  await knex.schema.table('serial_numbers', (t) => {
    t.dropColumn('customer_warranty_end')
    t.renameColumn('manufacturer_warranty_end', 'warranty_end')
  })

  await knex.schema.table('receipt_lines', (t) => {
    t.dropColumn('customer_warranty_months')
    t.renameColumn('manufacturer_warranty_months', 'warranty_months')
  })

  await knex.schema.table('purchase_order_lines', (t) => {
    t.dropColumn('customer_warranty_months')
    t.renameColumn('manufacturer_warranty_months', 'warranty_months')
  })
}
