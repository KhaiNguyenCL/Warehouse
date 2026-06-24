// stock_movements.serial_id giờ được ghi (trước đây khai báo trong schema nhưng không nơi
// nào set giá trị — xem receipt/delivery/transfer.service.ts) để có lịch sử di chuyển theo
// TỪNG serial, không chỉ tổng quantity theo variant_id. export_type="return_out" hard-delete
// hẳn serial_numbers (CLAUDE.md mục 9/19) — nếu giữ FK mặc định (NO ACTION), record audit
// "đã return_out serial này" sẽ KHÔNG insert được (serial đã bị xoá trước khi insert) hoặc
// chặn luôn việc xoá serial (nếu insert trước). ON DELETE SET NULL cho phép giữ lại dòng
// audit (quantity, unit_cost, ref_document, created_at) sau khi serial gốc đã hard-delete —
// chỉ mất link serial_id, đúng tinh thần "serial không còn ý nghĩa theo dõi" của return_out.
import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE stock_movements
      DROP CONSTRAINT stock_movements_serial_id_fkey,
      ADD CONSTRAINT stock_movements_serial_id_fkey
        FOREIGN KEY (serial_id) REFERENCES serial_numbers(id) ON DELETE SET NULL
  `)
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE stock_movements
      DROP CONSTRAINT stock_movements_serial_id_fkey,
      ADD CONSTRAINT stock_movements_serial_id_fkey
        FOREIGN KEY (serial_id) REFERENCES serial_numbers(id)
  `)
}
