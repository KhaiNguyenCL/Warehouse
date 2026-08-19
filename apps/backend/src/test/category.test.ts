import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getApp, closeApp, loginAdmin, auth, uid } from './helpers'
import type { FastifyInstance } from 'fastify'

let app: FastifyInstance
let token: string
let createdId: string

beforeAll(async () => {
  app   = await getApp()
  token = await loginAdmin()
})
afterAll(async () => { await closeApp() })

describe('Category CRUD', () => {
  const name       = uid('TestCat')
  const short_code = uid('TC')

  it('Tạo category mới', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/products/categories',
      headers: auth(token),
      payload: { name, short_code, description: 'Test category' },
    })
    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.body)
    expect(body.name).toBe(name)
    expect(body.short_code).toBe(short_code)
    createdId = body.id
  })

  it('Tạo category thiếu name → 400', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/products/categories',
      headers: auth(token),
      payload: { short_code: uid('XX') },
    })
    expect(res.statusCode).toBe(400)
  })

  it('Lấy danh sách categories', async () => {
    const res = await app.inject({
      method: 'GET', url: '/api/v1/products/categories',
      headers: auth(token),
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    const arr = Array.isArray(body) ? body : (body.data ?? [])
    expect(arr.length).toBeGreaterThan(0)
    expect(arr.some((c: any) => c.id === createdId)).toBe(true)
  })

  it('Sửa category', async () => {
    const res = await app.inject({
      method: 'PATCH', url: `/api/v1/products/categories/${createdId}`,
      headers: auth(token),
      payload: { description: 'Updated description' },
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.description).toBe('Updated description')
  })

  it('Xoá category', async () => {
    const res = await app.inject({
      method: 'DELETE', url: `/api/v1/products/categories/${createdId}`,
      headers: auth(token),
    })
    expect(res.statusCode).toBe(200)
  })

  it('Xoá category không tồn tại → 404', async () => {
    const res = await app.inject({
      method: 'DELETE', url: `/api/v1/products/categories/00000000-0000-0000-0000-000000000000`,
      headers: auth(token),
    })
    expect(res.statusCode).toBe(404)
  })
})
