import type { Knex } from 'knex'

export async function up(knex: Knex) {
  // Đảm bảo không có dòng nào đang âm trước khi thêm constraint
  const neg = await knex('inventory').where('qty_on_hand', '<', 0).count('id as cnt').first()
  if (Number(neg?.cnt ?? 0) > 0) {
    throw new Error('Có dòng inventory đang có qty_on_hand < 0 — cần sửa dữ liệu trước khi thêm constraint')
  }
  await knex.schema.raw(
    'ALTER TABLE inventory ADD CONSTRAINT inventory_qty_on_hand_nonneg CHECK (qty_on_hand >= 0)',
  )
}

export async function down(knex: Knex) {
  await knex.schema.raw('ALTER TABLE inventory DROP CONSTRAINT IF EXISTS inventory_qty_on_hand_nonneg')
}
