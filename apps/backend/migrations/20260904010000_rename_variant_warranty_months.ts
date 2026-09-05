import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('variants', (t) => {
    t.renameColumn('warranty_months', 'manufacturer_warranty_months')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('variants', (t) => {
    t.renameColumn('manufacturer_warranty_months', 'warranty_months')
  })
}
