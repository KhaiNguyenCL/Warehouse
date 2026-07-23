import { Knex } from 'knex'

export async function up(knex: Knex) {
  await knex.schema.table('quotations', (t) => {
    t.text('quote_number').nullable()
    t.date('quote_date').nullable()
  })
}

export async function down(knex: Knex) {
  await knex.schema.table('quotations', (t) => {
    t.dropColumn('quote_number')
    t.dropColumn('quote_date')
  })
}
