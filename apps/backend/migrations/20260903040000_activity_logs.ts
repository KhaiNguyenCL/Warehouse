import type { Knex } from 'knex'

export async function up(knex: Knex) {
  await knex.schema.createTable('activity_logs', (t) => {
    t.uuid('id').defaultTo(knex.raw('gen_random_uuid()')).primary()
    t.text('object_type').notNullable()   // 'receipt' | 'delivery_order' | 'quotation' | ...
    t.uuid('object_id').notNullable()
    t.text('object_code').nullable()       // mã phiếu để đọc nhanh (RC-240001, ...)
    t.text('action').notNullable()         // 'created' | 'completed' | 'cancelled' | ...
    t.uuid('actor_id').notNullable().references('id').inTable('users')
    t.text('actor_name').nullable()        // denormalized — tránh JOIN khi đọc
    t.jsonb('payload').nullable()          // { old, new, note, ... }
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable()
  })

  await knex.schema.raw(`
    CREATE INDEX idx_activity_logs_object ON activity_logs (object_type, object_id, created_at DESC);
    CREATE INDEX idx_activity_logs_actor  ON activity_logs (actor_id, created_at DESC);
  `)
}

export async function down(knex: Knex) {
  await knex.schema.dropTableIfExists('activity_logs')
}
