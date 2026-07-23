import { Knex } from 'knex'

export async function up(knex: Knex) {
  await knex.schema.alterTable('purchase_orders', (t) => {
    t.text('delivery_location').nullable()
  })
}

export async function down(knex: Knex) {
  await knex.schema.alterTable('purchase_orders', (t) => {
    t.dropColumn('delivery_location')
  })
}
