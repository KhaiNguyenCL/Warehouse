import type { Knex } from 'knex'

export async function up(knex: Knex) {
  await knex.schema.createTable('notifications', (t) => {
    t.uuid('id').defaultTo(knex.raw('gen_random_uuid()')).primary()
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
    t.text('type').notNullable()      // 'po_confirmed' | 'shipment_received' | 'receipt_pending_approval' | ...
    t.text('title').notNullable()
    t.text('body').nullable()
    t.text('link').nullable()         // route path, e.g. '/receipts/abc'
    t.timestamp('read_at', { useTz: true }).nullable()
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable()
  })

  await knex.schema.raw(`
    CREATE INDEX idx_notifications_user ON notifications (user_id, created_at DESC);
    CREATE INDEX idx_notifications_unread ON notifications (user_id) WHERE read_at IS NULL;
  `)
}

export async function down(knex: Knex) {
  await knex.schema.dropTableIfExists('notifications')
}
