// Thêm 'variant' vào danh sách object_type hợp lệ của custom_fields — nhiều thuộc tính kỹ
// thuật (RAM, màu, kích thước...) khác nhau THEO SKU cụ thể, không theo Product (dòng sản
// phẩm chung), nên Custom Field cần gắn được ở cấp variant, không chỉ product (CLAUDE.md mục 5).
import { Knex } from 'knex'

const OLD_TYPES = ['quotation', 'receipt', 'delivery_order', 'product', 'company']
const NEW_TYPES = ['quotation', 'receipt', 'delivery_order', 'product', 'variant', 'company']

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE custom_fields
      DROP CONSTRAINT custom_fields_object_type_check,
      ADD CONSTRAINT custom_fields_object_type_check
        CHECK (object_type IN (${NEW_TYPES.map((t) => `'${t}'`).join(', ')}))
  `)
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE custom_fields
      DROP CONSTRAINT custom_fields_object_type_check,
      ADD CONSTRAINT custom_fields_object_type_check
        CHECK (object_type IN (${OLD_TYPES.map((t) => `'${t}'`).join(', ')}))
  `)
}
