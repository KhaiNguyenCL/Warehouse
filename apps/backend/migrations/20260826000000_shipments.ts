import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('shipments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    t.string('code').notNullable().unique()
    t.uuid('po_id').references('id').inTable('purchase_orders').nullable()
    t.uuid('supplier_id').references('id').inTable('companies').nullable()
    t.uuid('warehouse_id').notNullable().references('id').inTable('warehouses')
    t.enum('status', ['draft', 'received', 'cancelled']).notNullable().defaultTo('draft')
    t.timestamp('expected_date', { useTz: true }).nullable()
    t.timestamp('received_date', { useTz: true }).nullable()
    t.uuid('received_by').references('id').inTable('users').nullable()
    t.text('notes').nullable()
    t.jsonb('attachments').notNullable().defaultTo('[]')
    t.uuid('created_by').notNullable().references('id').inTable('users')
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now())
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now())
  })

  await knex.schema.createTable('shipment_lines', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    t.uuid('shipment_id').notNullable().references('id').inTable('shipments').onDelete('CASCADE')
    t.uuid('variant_id').notNullable().references('id').inTable('variants')
    t.uuid('po_line_id').references('id').inTable('purchase_order_lines').nullable()
    t.integer('qty_expected').notNullable().defaultTo(0)
    t.integer('qty_received').notNullable().defaultTo(0)
    t.enum('condition', ['good', 'damaged', 'missing']).notNullable().defaultTo('good')
    t.text('notes').nullable()
    t.jsonb('attachments').notNullable().defaultTo('[]')
    t.integer('line_order').notNullable().defaultTo(1)
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now())
  })

  // Receipt có thể link về shipment (optional)
  await knex.schema.alterTable('receipts', (t) => {
    t.uuid('shipment_id').references('id').inTable('shipments').nullable()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('receipts', (t) => { t.dropColumn('shipment_id') })
  await knex.schema.dropTableIfExists('shipment_lines')
  await knex.schema.dropTableIfExists('shipments')
}
