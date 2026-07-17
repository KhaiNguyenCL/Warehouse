import { FastifyPluginAsync } from 'fastify'
import { randomUUID } from 'crypto'
import { createWriteStream, mkdirSync } from 'fs'
import { join, extname } from 'path'
import { pipeline } from 'stream/promises'

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

const uploadRoutes: FastifyPluginAsync = async (app) => {
  const uploadDir = join(process.cwd(), 'uploads', 'images')
  mkdirSync(uploadDir, { recursive: true })

  // POST /api/v1/uploads/image
  // Trả về { url: '/uploads/images/<filename>' }
  app.post('/image', async (request, reply) => {
    const data = await request.file({ limits: { fileSize: MAX_SIZE } })
    if (!data) throw { statusCode: 400, message: 'Không có file nào được gửi lên' }
    if (!ALLOWED_MIME.includes(data.mimetype)) {
      throw { statusCode: 400, message: 'Chỉ chấp nhận ảnh JPEG, PNG, WebP, GIF' }
    }

    const ext = extname(data.filename) || '.jpg'
    const filename = `${randomUUID()}${ext}`
    const dest = join(uploadDir, filename)

    await pipeline(data.file, createWriteStream(dest))

    // Kiểm tra nếu file bị cắt do vượt quá giới hạn
    if (data.file.truncated) {
      throw { statusCode: 400, message: 'File quá lớn — tối đa 5 MB' }
    }

    return reply.send({ url: `/uploads/images/${filename}` })
  })
}

export default uploadRoutes
