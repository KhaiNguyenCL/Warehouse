import { Knex } from 'knex'

const OLD_TYPES = ['quotation', 'receipt', 'delivery_order', 'product', 'variant', 'company']
const NEW_TYPES = ['quotation', 'receipt', 'delivery_order', 'purchase_order', 'transfer_order', 'stocktake', 'product', 'variant', 'company']

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
