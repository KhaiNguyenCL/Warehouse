import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getApp, closeApp, auth } from './helpers'
import type { FastifyInstance } from 'fastify'

let app: FastifyInstance

beforeAll(async () => { app = await getApp() })
afterAll(async () => { await closeApp() })

describe('Auth', () => {
  it('login với email/password hợp lệ → trả token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'admin@test.local', password: 'admin123' },
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.token).toBeDefined()
    expect(body.user).toBeDefined()
    expect(body.user.email).toBe('admin@test.local')
  })

  it('login sai password → 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'admin@test.local', password: 'wrongpassword' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('login email không tồn tại → 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'nobody@test.local', password: 'admin123' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('GET /me không có token → 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/auth/me' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /me với token hợp lệ → trả thông tin user', async () => {
    const loginRes = await app.inject({
      method: 'POST', url: '/api/v1/auth/login',
      payload: { email: 'admin@test.local', password: 'admin123' },
    })
    const { token } = JSON.parse(loginRes.body)

    const res = await app.inject({
      method: 'GET', url: '/api/v1/auth/me',
      headers: auth(token),
    })
    expect(res.statusCode).toBe(200)
    const me = JSON.parse(res.body)
    expect(me.email).toBe('admin@test.local')
    expect(me.role).toBeDefined()
  })
})
