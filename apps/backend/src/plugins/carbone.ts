// Fastify plugin — bọc carbone (chỉ có API callback) thành Promise để dùng async/await
// đồng bộ với phần còn lại của codebase, và gắn sẵn đường dẫn lưu file template upload.
import fp from 'fastify-plugin'
import { FastifyInstance } from 'fastify'
import fs from 'fs'
import path from 'path'
import carbone from 'carbone'

declare module 'fastify' {
  interface FastifyInstance {
    carbone: {
      uploadDir: string
      render: (
        templatePath: string,
        data: unknown,
        options?: Record<string, unknown>,
      ) => Promise<{ content: Buffer; extension: string }>
    }
  }
}

// File Excel admin upload (CLAUDE.md mục 14) được lưu ở đây — đọc từ CARBONE_TEMPLATE_DIR
// (.env, đã có sẵn trong .env.example) thay vì hardcode, để khớp với cấu hình đã định nghĩa
// sẵn cho project. Resolve theo cwd (luôn là apps/backend khi chạy qua pnpm) — KHÔNG commit
// vào git, xem .gitignore.
const UPLOAD_DIR = path.resolve(process.cwd(), process.env.CARBONE_TEMPLATE_DIR ?? './templates')

export const carbonePlugin = fp(async (app: FastifyInstance) => {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })

  app.decorate('carbone', {
    uploadDir: UPLOAD_DIR,
    render(templatePath: string, data: unknown, options: Record<string, unknown> = {}) {
      return new Promise((resolve, reject) => {
        carbone.render(templatePath, data, options, (err: Error | null, result: Buffer, extension: string) => {
          if (err) return reject(err)
          resolve({ content: result, extension })
        })
      })
    },
  })
})
