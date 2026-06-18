// Routes = lớp NGOÀI CÙNG, duy nhất "nói chuyện" với HTTP — nhận request, trả response.
// Không chứa business logic (đó là việc của service), không tự query DB (đó là việc của repository).
import { FastifyPluginAsync } from 'fastify'
import { AuthService } from './auth.service'
import { loginSchema, LoginBody } from './auth.schema'
import { authenticate } from '../../middleware/auth'

// FastifyPluginAsync = "khuôn" chuẩn của Fastify cho 1 module — khi app.ts gọi
// app.register(authRoutes, { prefix: '/api/v1/auth' }), Fastify tự gọi hàm này 1 lần,
// truyền vào `app` (đã có prefix). Mọi route khai báo bên trong tự động có prefix đó.
const authRoutes: FastifyPluginAsync = async (app) => {
  const service = new AuthService(app)

  // POST /api/v1/auth/login — không cần preHandler vì đây là route public (chưa đăng nhập)
  // <{ Body: LoginBody }> = generic TypeScript, giúp request.body được gợi ý đúng kiểu trong IDE
  // Lỗi do service throw ({ statusCode, message }) tự rơi vào setErrorHandler ở app.ts.
  app.post<{ Body: LoginBody }>('/login', { schema: loginSchema }, async (request, reply) => {
    const result = await service.login(request.body.email, request.body.password)
    return reply.send(result)
  })

  // GET /api/v1/auth/me — route PHẢI đăng nhập, nên có preHandler: authenticate.
  // authenticate verify JWT trước, nếu hợp lệ mới cho chạy tới hàm handler bên dưới.
  app.get('/me', { preHandler: authenticate }, async (request, reply) => {
    const { sub } = request.user   // request.user được gán bởi authenticate (xem middleware/auth.ts)
    const user = await app.db('users')
      .join('roles', 'roles.id', 'users.role_id')
      .where('users.id', sub)
      .select('users.id', 'users.email', 'users.full_name', 'roles.name as role')
      .first()
    return reply.send(user)
  })
}

export default authRoutes
