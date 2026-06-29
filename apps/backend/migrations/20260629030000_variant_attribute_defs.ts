import { Knex } from 'knex'

export async function up(knex: Knex) {
  // Định nghĩa thuộc tính variant — quản lý trong Settings
  await knex.schema.createTable('variant_attribute_defs', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    t.string('name').notNullable()           // "Số port", "RAM", "Dung lượng"
    t.string('unit').nullable()              // "P", "G", "TB" — null = không có đơn vị
    t.specificType('options', 'text[]').notNullable().defaultTo('{}')  // ['8','16','24','48']
    t.enum('applies_to', ['all', 'product']).notNullable().defaultTo('all')
    t.boolean('is_active').notNullable().defaultTo(true)
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now())
  })

  // Khi applies_to='product': danh sách product được áp dụng thuộc tính này
  await knex.schema.createTable('variant_attribute_def_products', (t) => {
    t.uuid('attribute_def_id').notNullable().references('id').inTable('variant_attribute_defs').onDelete('CASCADE')
    t.uuid('product_id').notNullable().references('id').inTable('products').onDelete('CASCADE')
    t.primary(['attribute_def_id', 'product_id'])
  })

  // Giá trị thuộc tính của từng variant
  await knex.schema.createTable('variant_attribute_values', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    t.uuid('variant_id').notNullable().references('id').inTable('variants').onDelete('CASCADE')
    t.uuid('attribute_def_id').notNullable().references('id').inTable('variant_attribute_defs').onDelete('CASCADE')
    t.string('value').nullable()
    t.boolean('include_in_sku').notNullable().defaultTo(false)
    t.unique(['variant_id', 'attribute_def_id'])
  })
}

export async function down(knex: Knex) {
  await knex.schema.dropTableIfExists('variant_attribute_values')
  await knex.schema.dropTableIfExists('variant_attribute_def_products')
  await knex.schema.dropTableIfExists('variant_attribute_defs')
}
