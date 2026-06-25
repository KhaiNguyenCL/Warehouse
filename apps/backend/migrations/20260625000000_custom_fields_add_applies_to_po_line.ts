// Cho phép 1 custom field (object_type="variant") được đánh dấu "áp dụng riêng theo PO
// line" — khi đó giá trị field này nhập lúc tạo/sửa PO được lưu độc lập theo từng PO line
// (purchase_order_lines.id), không bị ảnh hưởng nếu sau đó sửa giá trị mặc định trên SKU.
// Cùng tinh thần với unit_price/warranty_months: variant chỉ cung cấp giá trị gợi ý mặc
// định, PO line lưu bản sao riêng.
import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('custom_fields', (table) => {
    table.boolean('applies_to_po_line').notNullable().defaultTo(false)
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('custom_fields', (table) => {
    table.dropColumn('applies_to_po_line')
  })
}
