import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('quotation_sub_sections', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    t.uuid('quotation_id').notNullable().references('id').inTable('quotations').onDelete('CASCADE')
    t.uuid('section_id').notNullable().references('id').inTable('quotation_sections').onDelete('CASCADE')
    t.uuid('product_id').nullable().references('id').inTable('products')
    t.string('name', 255).notNullable()
    t.integer('sub_section_order').notNullable().defaultTo(0)
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now())
  })

  await knex.schema.alterTable('quotation_line_items', (t) => {
    t.uuid('sub_section_id')
      .nullable()
      .references('id')
      .inTable('quotation_sub_sections')
      .onDelete('SET NULL')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('quotation_line_items', (t) => {
    t.dropColumn('sub_section_id')
  })
  await knex.schema.dropTable('quotation_sub_sections')
}
