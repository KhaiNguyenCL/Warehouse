import type { Knex } from 'knex'

// return_in nên tham chiếu Phiếu xuất kho (delivery_order) thay vì quotation —
// DO biết chính xác serial nào xuất cho khách, còn quotation có thể có nhiều DO.
export async function up(knex: Knex) {
  // 1. Mở rộng CHECK constraint để cho phép 'delivery_order'
  await knex.raw(`
    ALTER TABLE import_types
      DROP CONSTRAINT import_types_requires_ref_document_check;
    ALTER TABLE import_types
      ADD CONSTRAINT import_types_requires_ref_document_check
      CHECK (requires_ref_document = ANY (ARRAY[
        'quotation'::text, 'stocktake_result'::text,
        'delivery_order'::text, 'none'::text
      ]));
  `)

  // 2. Đổi return_in sang delivery_order
  await knex('import_types')
    .where({ key: 'return_in' })
    .update({ requires_ref_document: 'delivery_order' })
}

export async function down(knex: Knex) {
  await knex('import_types')
    .where({ key: 'return_in' })
    .update({ requires_ref_document: 'quotation' })

  await knex.raw(`
    ALTER TABLE import_types
      DROP CONSTRAINT import_types_requires_ref_document_check;
    ALTER TABLE import_types
      ADD CONSTRAINT import_types_requires_ref_document_check
      CHECK (requires_ref_document = ANY (ARRAY[
        'quotation'::text, 'stocktake_result'::text, 'none'::text
      ]));
  `)
}
