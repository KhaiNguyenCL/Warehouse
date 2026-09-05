import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('variants', (t) => {
    t.text('description_long').nullable()
  })

  await knex.schema.createTable('variant_customer_descriptions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    t.uuid('variant_id').notNullable().references('id').inTable('variants').onDelete('CASCADE')
    t.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE')
    t.text('description').notNullable()
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now())
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now())
    t.unique(['variant_id', 'company_id'])
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('variant_customer_descriptions')
  await knex.schema.alterTable('variants', (t) => {
    t.dropColumn('description_long')
  })
}
