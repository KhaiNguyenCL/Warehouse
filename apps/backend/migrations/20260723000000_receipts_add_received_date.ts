import { Knex } from 'knex'

export async function up(knex: Knex) {
  await knex.schema.table('receipts', (t) => {
    t.date('received_date').nullable()
  })
}

export async function down(knex: Knex) {
  await knex.schema.table('receipts', (t) => {
    t.dropColumn('received_date')
  })
}
