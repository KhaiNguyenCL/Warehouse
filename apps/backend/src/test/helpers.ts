import { buildApp } from '../app'
import type { FastifyInstance } from 'fastify'

let _app: FastifyInstance | null = null

export async function getApp(): Promise<FastifyInstance> {
  if (!_app) {
    _app = await buildApp()
    await _app.ready()
  }
  return _app
}

export async function closeApp() {
  if (_app) {
    await _app.close()
    _app = null
  }
}

export async function loginAdmin(): Promise<string> {
  const app = await getApp()
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email: 'admin@test.local', password: 'admin123' },
  })
  expect(res.statusCode).toBe(200)
  return JSON.parse(res.body).token
}

export function auth(token: string) {
  return { Authorization: `Bearer ${token}` }
}

// Tạo suffix ngẫu nhiên để tránh conflict giữa các test run
export const RUN = Date.now().toString(36).toUpperCase()

export function uid(prefix: string) {
  return `${prefix}-${RUN}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
}
