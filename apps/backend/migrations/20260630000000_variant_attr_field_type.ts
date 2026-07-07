import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('variant_attribute_defs', (t) => {
    t.text('field_type').notNullable().defaultTo('select')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('variant_attribute_defs', (t) => {
    t.dropColumn('field_type')
  })
}
