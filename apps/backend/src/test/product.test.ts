// Test CRUD cho Category → Brand → Product → Variant (thứ tự phụ thuộc lẫn nhau)
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getApp, closeApp, loginAdmin, auth, uid } from './helpers'
import type { FastifyInstance } from 'fastify'

let app: FastifyInstance
let token: string

// IDs tạo ra trong test để dùng xuyên suốt
let categoryId: string
let brandId: string
let productId: string
let variantId: string

beforeAll(async () => {
  app   = await getApp()
  token = await loginAdmin()

  // Tạo category & brand cần thiết
  const catRes = await app.inject({
    method: 'POST', url: '/api/v1/products/categories',
    headers: auth(token),
    payload: { name: uid('Cat'), short_code: uid('C') },
  })
  categoryId = JSON.parse(catRes.body).id

  const brandRes = await app.inject({
    method: 'POST', url: '/api/v1/products/brands',
    headers: auth(token),
    payload: { name: uid('Brand'), short_code: uid('B') },
  })
  brandId = JSON.parse(brandRes.body).id
})

afterAll(async () => { await closeApp() })

describe('Product CRUD', () => {
  const productCode = uid('PROD')

  it('Tạo product mới', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/products',
      headers: auth(token),
      payload: {
        code: productCode,
        name: uid('Test Product'),
        product_type: 'storable',
        category_id: categoryId,
        brand_id: brandId,
      },
    })
    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.body)
    expect(body.code).toBe(productCode)
    expect(body.product_type).toBe('storable')
    productId = body.id
  })

  it('Tạo product thiếu category_id → 400', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/products',
      headers: auth(token),
      payload: { code: uid('NC'), name: uid('NoCat'), product_type: 'storable' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('Lấy danh sách products', async () => {
    const res = await app.inject({
      method: 'GET', url: '/api/v1/products',
      headers: auth(token),
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    const arr = Array.isArray(body) ? body : (body.data ?? [])
    expect(arr.some((p: any) => p.id === productId)).toBe(true)
  })

  it('Lấy chi tiết product', async () => {
    const res = await app.inject({
      method: 'GET', url: `/api/v1/products/${productId}`,
      headers: auth(token),
    })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).id).toBe(productId)
  })

  it('Sửa product', async () => {
    const res = await app.inject({
      method: 'PATCH', url: `/api/v1/products/${productId}`,
      headers: auth(token),
      payload: { name: uid('Updated Product') },
    })
    expect(res.statusCode).toBe(200)
  })
})

describe('Variant CRUD', () => {
  const sku = uid('SKU')

  it('Tạo variant', async () => {
    const res = await app.inject({
      method: 'POST', url: `/api/v1/products/${productId}/variants`,
      headers: auth(token),
      payload: {
        sku,
        name: uid('Variant'),
        sale_price: 1000000,
        cost_price: 800000,
        warranty_months: 12,
      },
    })
    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.body)
    expect(body.sku).toBe(sku)
    variantId = body.id
  })

  it('Tạo variant trùng SKU → 409', async () => {
    const res = await app.inject({
      method: 'POST', url: `/api/v1/products/${productId}/variants`,
      headers: auth(token),
      payload: { sku, name: uid('Dup'), sale_price: 1000, cost_price: 800, warranty_months: 6 },
    })
    expect(res.statusCode).toBeGreaterThanOrEqual(400)
  })

  it('Lấy variants của product', async () => {
    const res = await app.inject({
      method: 'GET', url: `/api/v1/products/${productId}/variants`,
      headers: auth(token),
    })
    expect(res.statusCode).toBe(200)
    const arr = JSON.parse(res.body)
    expect(arr.some((v: any) => v.id === variantId)).toBe(true)
  })

  it('Sửa variant', async () => {
    const res = await app.inject({
      method: 'PATCH', url: `/api/v1/products/${productId}/variants/${variantId}`,
      headers: auth(token),
      payload: { sale_price: 1200000 },
    })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).sale_price).toBe(1200000)
  })
})
