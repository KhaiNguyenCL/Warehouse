import { FastifyPluginAsync } from 'fastify'
import { randomUUID } from 'crypto'
import { createWriteStream, mkdirSync } from 'fs'
import { join, extname } from 'path'
import { pipeline } from 'stream/promises'

const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const ALLOWED_FILE_MIME  = [...ALLOWED_IMAGE_MIME, 'application/pdf']
const MAX_IMAGE_SIZE = 5  * 1024 * 1024 // 5 MB
const MAX_FILE_SIZE  = 20 * 1024 * 1024 // 20 MB

const uploadRoutes: FastifyPluginAsync = async (app) => {
  const imagesDir = join(process.cwd(), 'uploads', 'images')
  const filesDir  = join(process.cwd(), 'uploads', 'files')
  mkdirSync(imagesDir, { recursive: true })
  mkdirSync(filesDir,  { recursive: true })

  // POST /api/v1/uploads/image — ảnh product (5 MB, chỉ ảnh)
  app.post('/image', async (request, reply) => {
    const data = await request.file({ limits: { fileSize: MAX_IMAGE_SIZE } })
    if (!data) throw { statusCode: 400, message: 'Không có file nào được gửi lên' }
    if (!ALLOWED_IMAGE_MIME.includes(data.mimetype)) {
      throw { statusCode: 400, message: 'Chỉ chấp nhận ảnh JPEG, PNG, WebP, GIF' }
    }

    const ext = extname(data.filename) || '.jpg'
    const filename = `${randomUUID()}${ext}`
    const dest = join(imagesDir, filename)

    await pipeline(data.file, createWriteStream(dest))

    if (data.file.truncated) {
      throw { statusCode: 400, message: 'File quá lớn — tối đa 5 MB' }
    }

    return reply.send({ url: `/uploads/images/${filename}` })
  })

  // POST /api/v1/uploads/file — đính kèm chứng từ (ảnh + PDF, 20 MB)
  // Dùng cho cancel_attachments của Receipt, Purchase Order,...
  app.post('/file', async (request, reply) => {
    const data = await request.file({ limits: { fileSize: MAX_FILE_SIZE } })
    if (!data) throw { statusCode: 400, message: 'Không có file nào được gửi lên' }
    if (!ALLOWED_FILE_MIME.includes(data.mimetype)) {
      throw { statusCode: 400, message: 'Chỉ chấp nhận ảnh (JPEG/PNG/WebP/GIF) hoặc PDF' }
    }

    const ext = extname(data.filename) || (data.mimetype === 'application/pdf' ? '.pdf' : '.jpg')
    const filename = `${randomUUID()}${ext}`
    const dest = join(filesDir, filename)

    await pipeline(data.file, createWriteStream(dest))

    if (data.file.truncated) {
      throw { statusCode: 400, message: 'File quá lớn — tối đa 20 MB' }
    }

    // Trả thêm originalName để frontend hiển thị tên file gốc
    return reply.send({ url: `/uploads/files/${filename}`, originalName: data.filename })
  })
}

export default uploadRoutes
