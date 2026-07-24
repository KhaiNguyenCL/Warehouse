import { Knex } from 'knex'

export async function up(knex: Knex) {
  await knex.schema.alterTable('quotation_line_items', (t) => {
    t.decimal('total_amount', 15, 2).notNullable().defaultTo(0)
  })
  await knex.raw(`UPDATE quotation_line_items SET total_amount = line_total + vat_amount`)
}

export async function down(knex: Knex) {
  await knex.schema.alterTable('quotation_line_items', (t) => {
    t.dropColumn('total_amount')
  })
}
