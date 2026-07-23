import type { Knex } from 'knex'

export async function up(knex: Knex) {
  await knex.schema.alterTable('purchase_orders', (t) => {
    t.timestamp('deleted_at', { useTz: true }).nullable()
  })
}

export async function down(knex: Knex) {
  await knex.schema.alterTable('purchase_orders', (t) => {
    t.dropColumn('deleted_at')
  })
}
