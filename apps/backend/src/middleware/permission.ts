// Middleware phân quyền (RBAC) — kiểm tra user hiện tại có permission key cụ thể không.
// Dùng làm preHandler: app.post('/', { preHandler: requirePermission('receipt.create') }, ...)
import { FastifyRequest, FastifyReply } from 'fastify'
import { authenticate } from './auth'

// Đây là 1 FACTORY FUNCTION — gọi requirePermission('receipt.approve') sẽ trả về
// 1 hàm preHandler MỚI, "nhớ" permissionKey qua closure. Nhờ vậy 1 hàm dùng được
// cho mọi permission key khác nhau, không cần viết middleware riêng cho từng quyền.
export function requirePermission(permissionKey: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Bước 1: phải có JWT hợp lệ trước (tái dùng middleware authenticate)
    await authenticate(request, reply)
    if (reply.sent) return   // authenticate đã trả lỗi 401 rồi → dừng luôn, không check tiếp

    const { roleId } = request.user
    const db = request.server.db

    // Bước 2: query DB xem role này có được gán permission key này không.
    // Query mỗi request (không cache trong token) — đúng nguyên tắc trong CLAUDE.md,
    // để khi admin đổi quyền, có hiệu lực NGAY mà không cần user đăng nhập lại.
    const has = await db('role_permissions as rp')
      .join('permissions as p', 'p.id', 'rp.permission_id')
      .where('rp.role_id', roleId)
      .where('p.key', permissionKey)
      .first()

    if (!has) {
      reply.code(403).send({ error: 'Forbidden', required: permissionKey })
    }
  }
}
