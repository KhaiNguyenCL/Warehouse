import { Knex } from 'knex'

export async function up(knex: Knex) {
  await knex.schema.alterTable('purchase_orders', (t) => {
    t.date('start_date').nullable()
    t.date('end_date').nullable()
  })
}

export async function down(knex: Knex) {
  await knex.schema.alterTable('purchase_orders', (t) => {
    t.dropColumn('start_date')
    t.dropColumn('end_date')
  })
}
