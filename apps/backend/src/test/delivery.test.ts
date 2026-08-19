// Test Delivery Order: tạo → submit → approve → complete (từ quotation confirmed)
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getApp, closeApp, loginAdmin, auth, uid } from './helpers'
import type { FastifyInstance } from 'fastify'

let app: FastifyInstance
let token: string

let customerId: string
let variantId: string
let warehouseId: string
let quotationId: string
let doId: string

beforeAll(async () => {
  app   = await getApp()
  token = await loginAdmin()

  // Customer
  customerId = JSON.parse((await app.inject({
    method: 'POST', url: '/api/v1/companies',
    headers: auth(token),
    payload: { name: uid('DO Customer'), types: ['customer'] },
  })).body).id

  // Warehouse
  warehouseId = JSON.parse((await app.inject({
    method: 'POST', url: '/api/v1/warehouses',
    headers: auth(token),
    payload: { code: uid('DWH'), name: uid('Delivery WH'), type: 'physical' },
  })).body).id

  // Product + variant (consumable — không cần serial)
  const catId = JSON.parse((await app.inject({
    method: 'POST', url: '/api/v1/products/categories',
    headers: auth(token), payload: { name: uid('DCat'), short_code: uid('DC') },
  })).body).id

  const brandId = JSON.parse((await app.inject({
    method: 'POST', url: '/api/v1/products/brands',
    headers: auth(token), payload: { name: uid('DBrand'), short_code: uid('DB') },
  })).body).id

  const productId = JSON.parse((await app.inject({
    method: 'POST', url: '/api/v1/products',
    headers: auth(token),
    payload: { code: uid('DPRD'), name: uid('DO Product'), product_type: 'consumable', category_id: catId, brand_id: brandId },
  })).body).id

  variantId = JSON.parse((await app.inject({
    method: 'POST', url: `/api/v1/products/${productId}/variants`,
    headers: auth(token),
    payload: { sku: uid('DSKU'), name: uid('DVar'), sale_price: 300000, cost_price: 200000, warranty_months: 0 },
  })).body).id

  // Nhập hàng vào kho trước (để có qty)
  const receiptRes = await app.inject({
    method: 'POST', url: '/api/v1/receipts',
    headers: auth(token),
    payload: {
      import_type: 'purchase', warehouse_id: warehouseId,
      lines: [{ variant_id: variantId, quantity: 20, cost_price: 200000, warranty_months: 0 }],
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

  // Tạo quotation confirmed
  const qtRes = await app.inject({
    method: 'POST', url: '/api/v1/quotations',
    headers: auth(token),
    payload: {
      company_id: customerId, warehouse_id: warehouseId, valid_days: 30,
      sections: [{ title: 'S1', line_items: [{ variant_id: variantId, quantity: 5, unit_price: 300000, vat_percent: 0, is_reserved: false }] }],
    },
  })
  quotationId = JSON.parse(qtRes.body).id
  await app.inject({ method: 'POST', url: `/api/v1/quotations/${quotationId}/confirm`, headers: auth(token) })
})

afterAll(async () => { await closeApp() })

describe('Delivery Order — tạo và chuyển trạng thái', () => {
  it('Tạo DO từ quotation', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/deliveries',
      headers: auth(token),
      payload: {
        quotation_id:  quotationId,
        warehouse_id:  warehouseId,
        export_type:   'sale',
        company_id:    customerId,
        lines: [{ variant_id: variantId, quantity: 3, unit_price: 300000, vat_percent: 0 }],
      },
    })
    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.body)
    expect(body.status).toBe('draft')
    doId = body.id
  })

  it('Lấy chi tiết DO', async () => {
    const res = await app.inject({
      method: 'GET', url: `/api/v1/deliveries/${doId}`,
      headers: auth(token),
    })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).id).toBe(doId)
  })

  it('Submit DO → pending_approval', async () => {
    const res = await app.inject({
      method: 'POST', url: `/api/v1/deliveries/${doId}/submit`,
      headers: auth(token),
    })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).status).toBe('pending_approval')
  })

  it('Approve DO → approved', async () => {
    const res = await app.inject({
      method: 'POST', url: `/api/v1/deliveries/${doId}/approve`,
      headers: auth(token),
    })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).status).toBe('approved')
  })

  it('Complete DO → completed', async () => {
    const detail = await app.inject({
      method: 'GET', url: `/api/v1/deliveries/${doId}`,
      headers: auth(token),
    })
    const lines = JSON.parse(detail.body).lines ?? []

    const res = await app.inject({
      method: 'POST', url: `/api/v1/deliveries/${doId}/complete`,
      headers: auth(token),
      payload: { lines: lines.map((l: any) => ({ line_id: l.id, serials: [] })) },
    })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).status).toBe('completed')
  })
})
