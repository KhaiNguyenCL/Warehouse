// Test Purchase Order: tạo draft → confirm → unconfirm → cancel
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getApp, closeApp, loginAdmin, auth, uid } from './helpers'
import type { FastifyInstance } from 'fastify'

let app: FastifyInstance
let token: string

let supplierId: string
let variantId: string
let poId: string

beforeAll(async () => {
  app   = await getApp()
  token = await loginAdmin()

  // Tạo supplier
  const compRes = await app.inject({
    method: 'POST', url: '/api/v1/companies',
    headers: auth(token),
    payload: {
      name: uid('PO Supplier'),
      types: ['supplier'],
    },
  })
  supplierId = JSON.parse(compRes.body).id

  // Tạo product + variant
  const catId = JSON.parse((await app.inject({
    method: 'POST', url: '/api/v1/products/categories',
    headers: auth(token), payload: { name: uid('POCat'), short_code: uid('PO') },
  })).body).id

  const brandId = JSON.parse((await app.inject({
    method: 'POST', url: '/api/v1/products/brands',
    headers: auth(token), payload: { name: uid('POBrand'), short_code: uid('PB') },
  })).body).id

  const productId = JSON.parse((await app.inject({
    method: 'POST', url: '/api/v1/products',
    headers: auth(token),
    payload: { code: uid('POPRD'), name: uid('PO Product'), product_type: 'storable', category_id: catId, brand_id: brandId },
  })).body).id

  variantId = JSON.parse((await app.inject({
    method: 'POST', url: `/api/v1/products/${productId}/variants`,
    headers: auth(token),
    payload: { sku: uid('POSKU'), name: uid('POVar'), sale_price: 1000000, cost_price: 800000, warranty_months: 24 },
  })).body).id
})

afterAll(async () => { await closeApp() })

describe('Purchase Order — tạo và chuyển trạng thái', () => {
  it('Tạo PO draft', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/purchase-orders',
      headers: auth(token),
      payload: {
        supplier_id: supplierId,
        note: 'Test PO',
        lines: [{ variant_id: variantId, quantity: 10, cost_price: 800000 }],
      },
    })
    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.body)
    expect(body.status).toBe('draft')
    expect(body.lines).toHaveLength(1)
    poId = body.id
  })

  it('Lấy danh sách POs', async () => {
    const res = await app.inject({
      method: 'GET', url: '/api/v1/purchase-orders',
      headers: auth(token),
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    const arr = Array.isArray(body) ? body : (body.data ?? [])
    expect(arr.some((p: any) => p.id === poId)).toBe(true)
  })

  it('Lấy chi tiết PO', async () => {
    const res = await app.inject({
      method: 'GET', url: `/api/v1/purchase-orders/${poId}`,
      headers: auth(token),
    })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).id).toBe(poId)
  })

  it('Sửa PO draft', async () => {
    const res = await app.inject({
      method: 'PATCH', url: `/api/v1/purchase-orders/${poId}`,
      headers: auth(token),
      payload: { note: 'Updated PO note' },
    })
    expect(res.statusCode).toBe(200)
  })

  it('Confirm PO → confirmed', async () => {
    const res = await app.inject({
      method: 'POST', url: `/api/v1/purchase-orders/${poId}/confirm`,
      headers: auth(token),
    })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).status).toBe('confirmed')
  })

  it('Unconfirm PO → draft', async () => {
    const res = await app.inject({
      method: 'POST', url: `/api/v1/purchase-orders/${poId}/unconfirm`,
      headers: auth(token),
    })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).status).toBe('draft')
  })

  it('Confirm lại rồi cancel', async () => {
    await app.inject({
      method: 'POST', url: `/api/v1/purchase-orders/${poId}/confirm`,
      headers: auth(token),
    })
    const res = await app.inject({
      method: 'POST', url: `/api/v1/purchase-orders/${poId}/cancel`,
      headers: auth(token),
    })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).status).toBe('cancelled')
  })
})
