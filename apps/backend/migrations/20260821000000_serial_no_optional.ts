import type { Knex } from 'knex'

// serial_no từ bắt buộc → tuỳ chọn: một số SKU chỉ quản lý bằng MAC address
// (AP, switch,...) không có serial number in trên thiết bị.
// Constraint: ít nhất 1 trong 2 (serial_no hoặc mac_address) phải có giá trị.
export async function up(knex: Knex) {
  await knex.raw(`
    ALTER TABLE serial_numbers ALTER COLUMN serial_no DROP NOT NULL;

    ALTER TABLE serial_numbers
      ADD CONSTRAINT serial_numbers_sn_or_mac
      CHECK (serial_no IS NOT NULL OR mac_address IS NOT NULL);

    CREATE UNIQUE INDEX serial_numbers_mac_unique
      ON serial_numbers(mac_address)
      WHERE mac_address IS NOT NULL;
  `)
}

export async function down(knex: Knex) {
  await knex.raw(`
    DROP INDEX IF EXISTS serial_numbers_mac_unique;

    ALTER TABLE serial_numbers
      DROP CONSTRAINT IF EXISTS serial_numbers_sn_or_mac;

    UPDATE serial_numbers SET serial_no = 'UNKNOWN-' || id WHERE serial_no IS NULL;
    ALTER TABLE serial_numbers ALTER COLUMN serial_no SET NOT NULL;
  `)
}
