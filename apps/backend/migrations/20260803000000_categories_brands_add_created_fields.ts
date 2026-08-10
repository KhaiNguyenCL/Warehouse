import { Knex } from 'knex'

export async function up(knex: Knex) {
  await knex.schema.alterTable('categories', (t) => {
    t.specificType('created_at', 'TIMESTAMPTZ').notNullable().defaultTo(knex.fn.now())
    t.uuid('created_by').nullable().references('id').inTable('users').onDelete('SET NULL')
  })

  await knex.schema.alterTable('brands', (t) => {
    t.specificType('created_at', 'TIMESTAMPTZ').notNullable().defaultTo(knex.fn.now())
    t.uuid('created_by').nullable().references('id').inTable('users').onDelete('SET NULL')
  })
}

export async function down(knex: Knex) {
  await knex.schema.alterTable('categories', (t) => {
    t.dropColumn('created_at')
    t.dropColumn('created_by')
  })
  await knex.schema.alterTable('brands', (t) => {
    t.dropColumn('created_at')
    t.dropColumn('created_by')
  })
}
