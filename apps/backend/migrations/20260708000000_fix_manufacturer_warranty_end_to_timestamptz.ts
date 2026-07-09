import type { Knex } from 'knex'

// manufacturer_warranty_end được khai báo là DATE thay vì TIMESTAMPTZ (không nhất quán
// với customer_warranty_end). Khi node-postgres đọc cột DATE trong môi trường UTC+7,
// nó tạo JS Date ở local midnight → serialize thành '2026-12-31T17:00:00Z' thay vì
// '2027-01-01T00:00:00Z' — hiển thị sai ngày trên frontend.
export async function up(knex: Knex) {
  await knex.schema.alterTable('serial_numbers', (t) => {
    t.specificType('manufacturer_warranty_end', 'TIMESTAMPTZ').alter()
  })
}

export async function down(knex: Knex) {
  await knex.schema.alterTable('serial_numbers', (t) => {
    t.specificType('manufacturer_warranty_end', 'DATE').alter()
  })
}
