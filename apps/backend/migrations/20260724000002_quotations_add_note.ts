import { Knex } from 'knex'

export async function up(knex: Knex) {
  await knex.schema.alterTable('quotations', (t) => {
    t.text('note').nullable()
  })
}

export async function down(knex: Knex) {
  await knex.schema.alterTable('quotations', (t) => {
    t.dropColumn('note')
  })
}
