import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('document_sequences', (t) => {
    t.string('doc_type', 20).notNullable()
    t.integer('year').notNullable()
    t.integer('last_seq').notNullable().defaultTo(0)
    t.primary(['doc_type', 'year'])
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('document_sequences')
}
