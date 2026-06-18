import { describe, it, expect, beforeEach } from 'vitest'
import { getApp, createUserWithRole, loginAs } from './helpers'

describe('Warehouse', () => {
  let token: string

  beforeEach(async () => {
    await createUserWithRole('Admin', 'admin@test.local', 'Test@123')
    token = await loginAs('admin@test.local', 'Test@123')
  })

  async function authedInject(opts: Parameters<Awaited<ReturnType<typeof getApp>>['inject']>[0]) {
    const app = await getApp()
    return app.inject({ ...opts, headers: { authorization: `Bearer ${token}`, ...(opts.headers as object) } })
  }

  it('tạo kho vật lý mới thành công', async () => {
    const res = await authedInject({
      method: 'POST',
      url: '/api/v1/warehouses',
      payload: { code: 'WH-HCM', name: 'Kho Hồ Chí Minh', type: 'physical', address: '123 Nguyễn Văn A' },
    })
    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.payload)
    expect(body.code).toBe('WH-HCM')
    expect(body.is_active).toBe(true)
  })

  it('trùng code kho trả về 409', async () => {
    await authedInject({
      method: 'POST',
      url: '/api/v1/warehouses',
      payload: { code: 'WH-HN', name: 'Kho Hà Nội', type: 'physical' },
    })
    const res = await authedInject({
      method: 'POST',
      url: '/api/v1/warehouses',
      payload: { code: 'WH-HN', name: 'Kho Hà Nội 2', type: 'physical' },
    })
    expect(res.statusCode).toBe(409)
  })

  it('list trả về 4 kho ảo đã seed sẵn', async () => {
    const res = await authedInject({ method: 'GET', url: '/api/v1/warehouses?type=virtual' })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(body).toHaveLength(4)
    expect(body.map((w: any) => w.code).sort()).toEqual(['WH-BH', 'WH-DEMO', 'WH-QC', 'WH-SN'])
  })

  it('update is_active = false để ngừng dùng 1 kho', async () => {
    const created = JSON.parse(
      (
        await authedInject({
          method: 'POST',
          url: '/api/v1/warehouses',
          payload: { code: 'WH-TEMP', name: 'Kho tạm', type: 'physical' },
        })
      ).payload,
    )

    const updateRes = await authedInject({
      method: 'PATCH',
      url: `/api/v1/warehouses/${created.id}`,
      payload: { is_active: false },
    })
    expect(JSON.parse(updateRes.payload).is_active).toBe(false)
  })

  it('GET /:id với id không tồn tại trả về 404', async () => {
    const res = await authedInject({
      method: 'GET',
      url: '/api/v1/warehouses/00000000-0000-0000-0000-000000000000',
    })
    expect(res.statusCode).toBe(404)
  })
})
