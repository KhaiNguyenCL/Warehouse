// Service = nơi chứa BUSINESS LOGIC — so sánh password, tạo JWT, quyết định throw lỗi gì.
// Route (auth.routes.ts) chỉ gọi service, không tự xử lý logic; Repository chỉ query DB,
// không biết gì về bcrypt/JWT. Tách 3 lớp để mỗi lớp chỉ làm 1 việc, dễ test riêng.
import bcrypt from 'bcrypt'
import { FastifyInstance } from 'fastify'
import { AuthRepository } from './auth.repository'

export class AuthService {
  private repo: AuthRepository

  // Nhận cả FastifyInstance (không chỉ Knex) vì cần dùng app.jwt.sign() —
  // JWT plugin được Fastify decorate vào app, không tách riêng được như db.
  constructor(private app: FastifyInstance) {
    this.repo = new AuthRepository(app.db)
  }

  async login(email: string, password: string) {
    const user = await this.repo.findUserByEmail(email)
    // Cố ý dùng CÙNG message cho cả 2 trường hợp (sai email / sai password) —
    // tránh lộ thông tin "email này có tồn tại trong hệ thống hay không" cho kẻ tấn công.
    if (!user) throw { statusCode: 401, message: 'Email hoặc mật khẩu không đúng' }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) throw { statusCode: 401, message: 'Email hoặc mật khẩu không đúng' }

    // Token CHỈ chứa sub (user id) + roleId — không nhúng permissions hay role name.
    // Mọi request sau đó, permission được query lại từ DB (xem middleware/permission.ts),
    // nên đổi quyền có hiệu lực ngay, không cần đợi token cũ hết hạn.
    const token = this.app.jwt.sign(
      { sub: user.id, roleId: user.role_id },
      { expiresIn: process.env.JWT_EXPIRES_IN ?? '8h' },
    )

    return {
      token,
      user: {
        id:        user.id,
        email:     user.email,
        full_name: user.full_name,
        role:      user.role_name,
        // KHÔNG trả password_hash ra ngoài — dù đã hash, vẫn không nên lộ ra response
      },
    }
  }
}
