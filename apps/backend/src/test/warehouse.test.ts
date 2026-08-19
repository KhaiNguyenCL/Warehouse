import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getApp, closeApp, loginAdmin, auth, uid } from './helpers'
import type { FastifyInstance } from 'fastify'

let app: FastifyInstance
let token: string
let warehouseId: string

beforeAll(async () => {
  app   = await getApp()
  token = await loginAdmin()
})
afterAll(async () => { await closeApp() })

describe('Warehouse CRUD', () => {
  const code = uid('WH')
  const name = uid('Warehouse')

  it('Tạo kho mới', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/warehouses',
      headers: auth(token),
      payload: { code, name, type: 'physical', description: 'Test warehouse' },
    })
    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.body)
    expect(body.code).toBe(code)
    expect(body.name).toBe(name)
    expect(body.type).toBe('physical')
    warehouseId = body.id
  })

  it('Tạo kho thiếu code → 400', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/warehouses',
      headers: auth(token),
      payload: { name: uid('NoCode'), type: 'physical' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('Lấy danh sách kho', async () => {
    const res = await app.inject({
      method: 'GET', url: '/api/v1/warehouses',
      headers: auth(token),
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    const arr = Array.isArray(body) ? body : (body.data ?? [])
    expect(arr.some((w: any) => w.id === warehouseId)).toBe(true)
  })

  it('Lấy chi tiết kho', async () => {
    const res = await app.inject({
      method: 'GET', url: `/api/v1/warehouses/${warehouseId}`,
      headers: auth(token),
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.id).toBe(warehouseId)
  })

  it('Sửa kho', async () => {
    const res = await app.inject({
      method: 'PATCH', url: `/api/v1/warehouses/${warehouseId}`,
      headers: auth(token),
      payload: { description: 'Updated warehouse desc' },
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.description).toBe('Updated warehouse desc')
  })
})
