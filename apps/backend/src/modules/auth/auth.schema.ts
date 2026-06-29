// Schema = nơi định nghĩa "hình dạng" dữ liệu cho 1 module — dùng cho 2 việc:
//  1. JSON Schema (loginSchema) — Fastify dùng để TỰ ĐỘNG validate request.body,
//     trả lỗi 400 sẵn nếu thiếu/sai field, route handler không cần if/else check tay.
//  2. TypeScript interface (LoginBody) — để code có type-safe, IDE gợi ý đúng field.
// Cả 2 phải khớp nhau (schema validate runtime, interface check lúc compile).

export const loginSchema = {
  body: {
    type: 'object',
    required: ['email', 'password'],   // thiếu field này → Fastify tự trả 400, không vào tới route handler
    properties: {
      email:    { type: 'string', minLength: 1 },
      password: { type: 'string', minLength: 6 },
    },
  },
}

export interface LoginBody {
  email: string
  password: string
}
