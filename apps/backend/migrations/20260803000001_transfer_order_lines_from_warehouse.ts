import { Knex } from 'knex'

export async function up(knex: Knex) {
  await knex.schema.alterTable('transfer_order_lines', (t) => {
    t.uuid('from_warehouse_id').nullable().references('id').inTable('warehouses')
  })

  await knex.schema.alterTable('companies', (t) => {
    t.boolean('sync_locked').notNullable().defaultTo(false)
  })

  await knex.schema.alterTable('variants', (t) => {
    t.decimal('vat_percent', 5, 2).nullable()
  })
}

export async function down(knex: Knex) {
  await knex.schema.alterTable('transfer_order_lines', (t) => {
    t.dropColumn('from_warehouse_id')
  })
  await knex.schema.alterTable('companies', (t) => {
    t.dropColumn('sync_locked')
  })
  await knex.schema.alterTable('variants', (t) => {
    t.dropColumn('vat_percent')
  })
}
