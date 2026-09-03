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
}
