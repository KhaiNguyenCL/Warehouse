// Repository = lớp DUY NHẤT được phép viết Knex query trong module này.
// Service không bao giờ gọi this.db(...) trực tiếp — luôn qua repository.
// Lý do: nếu sau này đổi cách query (ví dụ thêm cache), chỉ sửa ở đây, không đụng business logic.
import { Knex } from 'knex'

export class AuthRepository {
  // Nhận Knex instance qua constructor (dependency injection) — không tự tạo connection,
  // dùng lại connection pool đã có ở app.db (xem plugins/knex.ts)
  constructor(private db: Knex) {}

  async findUserByEmail(email: string) {
    return this.db('users')
      .join('roles', 'roles.id', 'users.role_id')   // join để lấy luôn tên role, không cần query 2 lần
      .where('users.email', email)
      .where('users.is_active', true)                // user bị khoá (is_active = false) không cho login
      .select(
        'users.id',
        'users.email',
        'users.full_name',
        'users.password_hash',   // lấy hash để service so sánh bằng bcrypt — KHÔNG trả ra ngoài route
        'users.role_id',
        'roles.name as role_name',
      )
      .first()   // .first() = LIMIT 1, trả về 1 object hoặc undefined (thay vì luôn trả array)
  }
}
