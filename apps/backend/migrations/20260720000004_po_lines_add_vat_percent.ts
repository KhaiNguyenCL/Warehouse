import type { Knex } from 'knex'

export async function up(knex: Knex) {
  await knex.schema.alterTable('purchase_order_lines', (t) => {
    t.decimal('vat_percent', 5, 2).notNullable().defaultTo(0)
  })
}

export async function down(knex: Knex) {
  await knex.schema.alterTable('purchase_order_lines', (t) => {
    t.dropColumn('vat_percent')
  })
}
