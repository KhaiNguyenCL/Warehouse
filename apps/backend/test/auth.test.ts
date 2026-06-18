import { describe, it, expect, beforeEach } from 'vitest'
import { getApp, createUserWithRole, loginAs } from './helpers'

describe('Auth', () => {
  beforeEach(async () => {
    await createUserWithRole('Admin', 'admin@test.local', 'Test@123')
  })

  it('đăng nhập đúng email/password trả về token + thông tin user', async () => {
    const app = await getApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'admin@test.local', password: 'Test@123' },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(body.token).toBeTypeOf('string')
    expect(body.user.email).toBe('admin@test.local')
    expect(body.user.role).toBe('Admin')
  })

  it('sai password trả về 401', async () => {
    const app = await getApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'admin@test.local', password: 'wrong-password' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('email không tồn tại trả về 401 (không lộ thông tin email có tồn tại hay không)', async () => {
    const app = await getApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'khong-ton-tai@test.local', password: 'Test@123' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('GET /me với token hợp lệ trả về user hiện tại', async () => {
    const token = await loginAs('admin@test.local', 'Test@123')
    const app = await getApp()
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.payload).email).toBe('admin@test.local')
  })

  it('GET /me không có token trả về 401', async () => {
    const app = await getApp()
    const res = await app.inject({ method: 'GET', url: '/api/v1/auth/me' })
    expect(res.statusCode).toBe(401)
  })
})
