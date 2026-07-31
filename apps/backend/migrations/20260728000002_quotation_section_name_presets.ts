import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('quotation_section_name_presets', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    t.string('name', 255).notNullable()
    t.integer('sort_order').notNullable().defaultTo(0)
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now())
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('quotation_section_name_presets')
}
