import { Knex } from 'knex'

export async function up(knex: Knex) {
  await knex.schema.alterTable('variants', (t) => {
    t.text('image_url').nullable()
  })
}

export async function down(knex: Knex) {
  await knex.schema.alterTable('variants', (t) => {
    t.dropColumn('image_url')
  })
}
