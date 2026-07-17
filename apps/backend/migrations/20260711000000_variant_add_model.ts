import { Knex } from 'knex'

export async function up(knex: Knex) {
  await knex.schema.alterTable('variants', (t) => {
    t.text('model').nullable()
  })
}

export async function down(knex: Knex) {
  await knex.schema.alterTable('variants', (t) => {
    t.dropColumn('model')
  })
}
