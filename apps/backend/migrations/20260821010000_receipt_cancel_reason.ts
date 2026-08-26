import type { Knex } from 'knex'

// Thêm lý do hủy + file đính kèm vào phiếu nhập kho.
// cancel_attachments lưu mảng { url, originalName } dạng JSONB.
export async function up(knex: Knex) {
  await knex.raw(`
    ALTER TABLE receipts
      ADD COLUMN cancel_reason      TEXT,
      ADD COLUMN cancel_attachments JSONB;
  `)
}

export async function down(knex: Knex) {
  await knex.raw(`
    ALTER TABLE receipts
      DROP COLUMN IF EXISTS cancel_reason,
      DROP COLUMN IF EXISTS cancel_attachments;
  `)
}
