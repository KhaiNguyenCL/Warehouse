import { Knex } from 'knex'

export async function up(knex: Knex) {
  await knex.schema.alterTable('purchase_orders', (t) => {
    t.uuid('confirmed_by').nullable().references('id').inTable('users')
  })
}

export async function down(knex: Knex) {
  await knex.schema.alterTable('purchase_orders', (t) => {
    t.dropColumn('confirmed_by')
  })
}
