import { Knex } from 'knex'

export async function up(knex: Knex) {
  await knex.schema.createTable('quotation_term_templates', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    t.text('name').notNullable()
    t.text('content').notNullable().defaultTo('')
    t.integer('sort_order').notNullable().defaultTo(0)
    t.timestamps(true, true)
  })
}

export async function down(knex: Knex) {
  await knex.schema.dropTableIfExists('quotation_term_templates')
}
