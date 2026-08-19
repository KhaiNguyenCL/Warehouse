// Test Quotation: tạo → confirm → cancel
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getApp, closeApp, loginAdmin, auth, uid } from './helpers'
import type { FastifyInstance } from 'fastify'

let app: FastifyInstance
let token: string

let customerId: string
let variantId: string
let warehouseId: string
let quotationId: string

beforeAll(async () => {
  app   = await getApp()
  token = await loginAdmin()

  // Customer
  const compRes = await app.inject({
    method: 'POST', url: '/api/v1/companies',
    headers: auth(token),
    payload: { name: uid('QT Customer'), types: ['customer'] },
  })
  customerId = JSON.parse(compRes.body).id

  // Warehouse
  const whRes = await app.inject({
    method: 'POST', url: '/api/v1/warehouses',
    headers: auth(token),
    payload: { code: uid('QWH'), name: uid('Quote WH'), type: 'physical' },
  })
  warehouseId = JSON.parse(whRes.body).id

  // Product + variant
  const catId = JSON.parse((await app.inject({
    method: 'POST', url: '/api/v1/products/categories',
    headers: auth(token), payload: { name: uid('QCat'), short_code: uid('QC') },
  })).body).id

  const brandId = JSON.parse((await app.inject({
    method: 'POST', url: '/api/v1/products/brands',
    headers: auth(token), payload: { name: uid('QBrand'), short_code: uid('QB') },
  })).body).id

  const productId = JSON.parse((await app.inject({
    method: 'POST', url: '/api/v1/products',
    headers: auth(token),
    payload: { code: uid('QPRD'), name: uid('Quote Product'), product_type: 'consumable', category_id: catId, brand_id: brandId },
  })).body).id

  variantId = JSON.parse((await app.inject({
    method: 'POST', url: `/api/v1/products/${productId}/variants`,
    headers: auth(token),
    payload: { sku: uid('QSKU'), name: uid('QVar'), sale_price: 2000000, cost_price: 1500000, warranty_months: 0 },
  })).body).id
})

afterAll(async () => { await closeApp() })

describe('Quotation — tạo và chuyển trạng thái', () => {
  it('Tạo quotation draft', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/quotations',
      headers: auth(token),
      payload: {
        company_id:    customerId,
        warehouse_id:  warehouseId,
        valid_days:    30,
        sections: [{
          title: 'Section 1',
          line_items: [{
            variant_id:  variantId,
            quantity:    5,
            unit_price:  2000000,
            vat_percent: 10,
            is_reserved: false,
          }],
        }],
      },
    })
    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.body)
    expect(body.status).toBe('draft')
    quotationId = body.id
  })

  it('Lấy chi tiết quotation', async () => {
    const res = await app.inject({
      method: 'GET', url: `/api/v1/quotations/${quotationId}`,
      headers: auth(token),
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.id).toBe(quotationId)
    expect(body.sections?.length).toBeGreaterThan(0)
  })

  it('Lấy danh sách quotations', async () => {
    const res = await app.inject({
      method: 'GET', url: '/api/v1/quotations',
      headers: auth(token),
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    const arr = Array.isArray(body) ? body : (body.data ?? [])
    expect(arr.some((q: any) => q.id === quotationId)).toBe(true)
  })

  it('Confirm quotation → confirmed', async () => {
    const res = await app.inject({
      method: 'POST', url: `/api/v1/quotations/${quotationId}/confirm`,
      headers: auth(token),
    })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).status).toBe('confirmed')
  })

  it('Unconfirm quotation về draft', async () => {
    const res = await app.inject({
      method: 'POST', url: `/api/v1/quotations/${quotationId}/unconfirm`,
      headers: auth(token),
    })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).status).toBe('draft')
  })

  it('Confirm lại rồi cancel', async () => {
    await app.inject({
      method: 'POST', url: `/api/v1/quotations/${quotationId}/confirm`,
      headers: auth(token),
    })
    const res = await app.inject({
      method: 'POST', url: `/api/v1/quotations/${quotationId}/cancel`,
      headers: auth(token),
    })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).status).toBe('cancelled')
  })
})
