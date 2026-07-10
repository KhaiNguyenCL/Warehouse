import { Knex } from 'knex'

export async function up(knex: Knex) {
  await knex.schema.alterTable('warehouses', (t) => {
    t.boolean('is_default').notNullable().defaultTo(false)
  })
}

export async function down(knex: Knex) {
  await knex.schema.alterTable('warehouses', (t) => {
    t.dropColumn('is_default')
  })
}
