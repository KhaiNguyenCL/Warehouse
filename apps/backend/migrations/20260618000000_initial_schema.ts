// Migration đầu tiên — Knex tự chạy file này khi gõ `pnpm migrate`.
// Tên file PHẢI bắt đầu bằng timestamp (20260618000000) — Knex chạy migration theo
// thứ tự tên file, và lưu lại trong bảng knex_migrations để biết file nào đã chạy rồi
// (chạy `pnpm migrate` lần 2 sẽ KHÔNG chạy lại file này).
import { Knex } from 'knex'
import fs from 'fs'
import path from 'path'

// Mỗi migration export 2 hàm: up() = áp dụng thay đổi, down() = đảo ngược lại (rollback).
export async function up(knex: Knex): Promise<void> {
  // Thay vì viết lại schema bằng Knex schema builder, mình tái dùng file SQL thuần đã
  // thiết kế sẵn ở backend/migrations/001_initial_schema.sql (xem warehouse_v2.dbml).
  const sqlPath = path.join(__dirname, '../../../backend/migrations/001_initial_schema.sql')
  let sql = fs.readFileSync(sqlPath, 'utf-8')

  // File SQL gốc có BEGIN/COMMIT để chạy độc lập qua psql. Nhưng Knex ĐÃ TỰ bọc mỗi
  // migration trong 1 transaction — nếu giữ BEGIN/COMMIT sẽ bị transaction lồng transaction,
  // PostgreSQL không hỗ trợ nested transaction nên phải strip 2 dòng này ra trước khi raw().
  sql = sql.replace(/^\s*BEGIN\s*;?\s*$/gim, '').replace(/^\s*COMMIT\s*;?\s*$/gim, '')
  await knex.raw(sql)
}

export async function down(knex: Knex): Promise<void> {
  // Cách rollback đơn giản nhất: xoá sạch schema "public" (chứa toàn bộ table) rồi tạo lại
  // rỗng. Chỉ an toàn dùng trong dev — KHÔNG bao giờ chạy migrate:rollback ở production
  // vì sẽ mất hết data.
  await knex.raw('DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO PUBLIC;')
}
