// Middleware xác thực — kiểm tra request có JWT token hợp lệ không.
// Dùng làm preHandler trong route: app.get('/me', { preHandler: authenticate }, ...)
import { FastifyRequest, FastifyReply } from 'fastify'

// Payload nhúng trong JWT — theo đúng nguyên tắc trong CLAUDE.md:
// "JWT chỉ chứa { sub: userId, roleId } — permission check query DB mỗi request".
// Không nhúng permissions/role name vào token để tránh token cũ bị stale khi đổi quyền.
export interface JwtPayload {
  sub: string   // user id (chuẩn JWT gọi field này là "sub" = subject)
  roleId: string
}

// "Dạy" @fastify/jwt biết payload và request.user có shape gì (type-safe khi gọi request.user.sub)
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload
    user: JwtPayload
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Đọc header "Authorization: Bearer <token>", verify chữ ký bằng JWT_SECRET,
    // nếu hợp lệ thì gán payload vào request.user
    await request.jwtVerify()
  } catch {
    // Token thiếu / sai / hết hạn — chặn request tại đây, không cho chạy tới route handler
    reply.code(401).send({ error: 'Unauthorized' })
  }
}
