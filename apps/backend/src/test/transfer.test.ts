// Test Transfer Order: tạo → submit → approve → complete
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getApp, closeApp, loginAdmin, auth, uid } from './helpers'
import type { FastifyInstance } from 'fastify'

let app: FastifyInstance
let token: string

let variantId: string
let srcWarehouseId: string
let dstWarehouseId: string
let transferId: string

beforeAll(async () => {
  app   = await getApp()
  token = await loginAdmin()

  // Hai kho: nguồn và đích
  srcWarehouseId = JSON.parse((await app.inject({
    method: 'POST', url: '/api/v1/warehouses',
    headers: auth(token),
    payload: { code: uid('SRC'), name: uid('Source WH'), type: 'physical' },
  })).body).id

  dstWarehouseId = JSON.parse((await app.inject({
    method: 'POST', url: '/api/v1/warehouses',
    headers: auth(token),
    payload: { code: uid('DST'), name: uid('Dest WH'), type: 'physical' },
  })).body).id

  // Product + variant (consumable — không cần serial)
  const catId = JSON.parse((await app.inject({
    method: 'POST', url: '/api/v1/products/categories',
    headers: auth(token), payload: { name: uid('TCat'), short_code: uid('TC') },
  })).body).id

  const brandId = JSON.parse((await app.inject({
    method: 'POST', url: '/api/v1/products/brands',
    headers: auth(token), payload: { name: uid('TBrand'), short_code: uid('TB') },
  })).body).id

  const productId = JSON.parse((await app.inject({
    method: 'POST', url: '/api/v1/products',
    headers: auth(token),
    payload: { code: uid('TPRD'), name: uid('Transfer Product'), product_type: 'consumable', category_id: catId, brand_id: brandId },
  })).body).id

  variantId = JSON.parse((await app.inject({
    method: 'POST', url: `/api/v1/products/${productId}/variants`,
    headers: auth(token),
    payload: { sku: uid('TSKU'), name: uid('TVar'), sale_price: 100000, cost_price: 80000, warranty_months: 0 },
  })).body).id

  // Nhập hàng vào kho nguồn trước
  const receiptRes = await app.inject({
    method: 'POST', url: '/api/v1/receipts',
    headers: auth(token),
    payload: {
      import_type: 'purchase', warehouse_id: srcWarehouseId,
      lines: [{ variant_id: variantId, quantity: 10, cost_price: 80000, warranty_months: 0 }],
    },
  })
  const rId = JSON.parse(receiptRes.body).id
  await app.inject({ method: 'POST', url: `/api/v1/receipts/${rId}/submit`, headers: auth(token) })
  await app.inject({ method: 'POST', url: `/api/v1/receipts/${rId}/approve`, headers: auth(token) })
  const detail = await app.inject({ method: 'GET', url: `/api/v1/receipts/${rId}`, headers: auth(token) })
  const lineId = JSON.parse(detail.body).lines[0].id
  await app.inject({
    method: 'POST', url: `/api/v1/receipts/${rId}/complete`,
    headers: auth(token),
    payload: { lines: [{ line_id: lineId, serials: [] }] },
  })
})

afterAll(async () => { await closeApp() })

describe('Transfer Order — tạo và chuyển trạng thái', () => {
  it('Tạo transfer order draft', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/transfers',
      headers: auth(token),
      payload: {
        transfer_type:       'transfer',
        source_warehouse_id: srcWarehouseId,
        dest_warehouse_id:   dstWarehouseId,
        lines: [{ variant_id: variantId, quantity: 4, serials: [] }],
      },
    })
    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.body)
    expect(body.status).toBe('draft')
    transferId = body.id
  })

  it('Lấy chi tiết transfer', async () => {
    const res = await app.inject({
      method: 'GET', url: `/api/v1/transfers/${transferId}`,
      headers: auth(token),
    })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).id).toBe(transferId)
  })

  it('Lấy danh sách transfers', async () => {
    const res = await app.inject({
      method: 'GET', url: '/api/v1/transfers',
      headers: auth(token),
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    const arr = Array.isArray(body) ? body : (body.data ?? [])
    expect(arr.some((t: any) => t.id === transferId)).toBe(true)
  })

  it('Submit transfer → pending_approval', async () => {
    const res = await app.inject({
      method: 'POST', url: `/api/v1/transfers/${transferId}/submit`,
      headers: auth(token),
    })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).status).toBe('pending_approval')
  })

  it('Approve transfer → approved', async () => {
    const res = await app.inject({
      method: 'POST', url: `/api/v1/transfers/${transferId}/approve`,
      headers: auth(token),
    })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).status).toBe('approved')
  })

  it('Complete transfer → completed', async () => {
    const detail = await app.inject({
      method: 'GET', url: `/api/v1/transfers/${transferId}`,
      headers: auth(token),
    })
    const lines = JSON.parse(detail.body).lines ?? []

    const res = await app.inject({
      method: 'POST', url: `/api/v1/transfers/${transferId}/complete`,
      headers: auth(token),
      payload: { lines: lines.map((l: any) => ({ line_id: l.id, serials: [] })) },
    })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).status).toBe('completed')
  })
})

describe('Transfer Order — cancel', () => {
  let cancelId: string

  it('Tạo transfer mới để test cancel', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/transfers',
      headers: auth(token),
      payload: {
        transfer_type:       'transfer',
        source_warehouse_id: srcWarehouseId,
        dest_warehouse_id:   dstWarehouseId,
        lines: [{ variant_id: variantId, quantity: 2, serials: [] }],
      },
    })
    expect(res.statusCode).toBe(201)
    cancelId = JSON.parse(res.body).id
  })

  it('Cancel draft transfer → cancelled', async () => {
    const res = await app.inject({
      method: 'POST', url: `/api/v1/transfers/${cancelId}/cancel`,
      headers: auth(token),
    })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).status).toBe('cancelled')
  })
})
