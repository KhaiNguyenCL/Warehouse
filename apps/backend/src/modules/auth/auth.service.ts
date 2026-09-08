import bcrypt from 'bcrypt'
import { FastifyInstance } from 'fastify'
import { AuthRepository } from './auth.repository'

export class AuthService {
  private repo: AuthRepository

  constructor(private app: FastifyInstance) {
    this.repo = new AuthRepository(app.db)
  }

  async login(email: string, password: string) {
    const user = await this.repo.findUserByEmail(email)
    if (!user) throw { statusCode: 401, message: 'Email hoặc mật khẩu không đúng' }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) throw { statusCode: 401, message: 'Email hoặc mật khẩu không đúng' }

    const token = this.app.jwt.sign(
      { sub: user.id },
      { expiresIn: process.env.JWT_EXPIRES_IN ?? '8h' },
    )

    return {
      token,
      user: {
        id:        user.id,
        email:     user.email,
        full_name: user.full_name,
        groups:    user.groups,
      },
    }
  }

  // Đổi mật khẩu tự phục vụ — khác PATCH /settings/users/:id (cần quyền settings.users,
  // dành cho admin đổi hộ user khác). Ở đây bất kỳ user nào cũng đổi được mật khẩu CHÍNH
  // MÌNH, miễn nhập đúng mật khẩu hiện tại.
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.repo.findUserById(userId)
    if (!user) throw { statusCode: 404, message: 'User not found' }

    const valid = await bcrypt.compare(currentPassword, user.password_hash)
    if (!valid) throw { statusCode: 400, message: 'Mật khẩu hiện tại không đúng' }

    const password_hash = await bcrypt.hash(newPassword, 10)
    await this.repo.updatePassword(userId, password_hash)
  }
}
