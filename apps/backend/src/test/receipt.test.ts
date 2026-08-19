// Test Receipt: tạo → pending_approval → approved → completed (+ status transitions)
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getApp, closeApp, loginAdmin, auth, uid } from './helpers'
import type { FastifyInstance } from 'fastify'

let app: FastifyInstance
let token: string

let warehouseId: string
let variantId: string
let receiptId: string

beforeAll(async () => {
  app   = await getApp()
  token = await loginAdmin()

  // Tạo kho
  const whRes = await app.inject({
    method: 'POST', url: '/api/v1/warehouses',
    headers: auth(token),
    payload: { code: uid('RWH'), name: uid('Receipt WH'), type: 'physical' },
  })
  warehouseId = JSON.parse(whRes.body).id

  // Tạo category → brand → product → variant
  const catId = JSON.parse((await app.inject({
    method: 'POST', url: '/api/v1/products/categories',
    headers: auth(token), payload: { name: uid('RCat'), short_code: uid('RC') },
  })).body).id

  const brandId = JSON.parse((await app.inject({
    method: 'POST', url: '/api/v1/products/brands',
    headers: auth(token), payload: { name: uid('RBrand'), short_code: uid('RB') },
  })).body).id

  const productId = JSON.parse((await app.inject({
    method: 'POST', url: '/api/v1/products',
    headers: auth(token),
    payload: { code: uid('RPROD'), name: uid('Receipt Product'), product_type: 'storable', category_id: catId, brand_id: brandId },
  })).body).id

  variantId = JSON.parse((await app.inject({
    method: 'POST', url: `/api/v1/products/${productId}/variants`,
    headers: auth(token),
    payload: { sku: uid('RSKU'), name: uid('RVariant'), sale_price: 500000, cost_price: 400000, warranty_months: 12 },
  })).body).id
})

afterAll(async () => { await closeApp() })

describe('Receipt — tạo và chuyển trạng thái', () => {
  it('Tạo receipt draft', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/receipts',
      headers: auth(token),
      payload: {
        import_type: 'purchase',
        warehouse_id: warehouseId,
        note: 'Test receipt',
        lines: [{
          variant_id: variantId,
          quantity: 3,
          cost_price: 400000,
          warranty_months: 12,
        }],
      },
    })
    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.body)
    expect(body.status).toBe('draft')
    expect(body.lines).toHaveLength(1)
    receiptId = body.id
  })

  it('Lấy chi tiết receipt', async () => {
    const res = await app.inject({
      method: 'GET', url: `/api/v1/receipts/${receiptId}`,
      headers: auth(token),
    })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).id).toBe(receiptId)
  })

  it('Sửa receipt khi còn draft', async () => {
    const res = await app.inject({
      method: 'PATCH', url: `/api/v1/receipts/${receiptId}`,
      headers: auth(token),
      payload: { note: 'Updated note' },
    })
    expect(res.statusCode).toBe(200)
  })

  it('Submit → pending_approval', async () => {
    const res = await app.inject({
      method: 'POST', url: `/api/v1/receipts/${receiptId}/submit`,
      headers: auth(token),
    })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).status).toBe('pending_approval')
  })

  it('Approve → approved', async () => {
    const res = await app.inject({
      method: 'POST', url: `/api/v1/receipts/${receiptId}/approve`,
      headers: auth(token),
    })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).status).toBe('approved')
  })

  it('Complete receipt → completed (với serial numbers)', async () => {
    const res = await app.inject({
      method: 'POST', url: `/api/v1/receipts/${receiptId}/complete`,
      headers: auth(token),
      payload: {
        lines: [{
          line_id: undefined, // sẽ được lấy từ DB
          serials: ['SN-TEST-001', 'SN-TEST-002', 'SN-TEST-003'],
        }],
      },
    })
    // Nếu không có line_id thì có thể fail — lấy lại receipt để có line_id
    if (res.statusCode !== 200) {
      const detail = await app.inject({
        method: 'GET', url: `/api/v1/receipts/${receiptId}`,
        headers: auth(token),
      })
      const receipt = JSON.parse(detail.body)
      const lineId = receipt.lines?.[0]?.id

      const res2 = await app.inject({
        method: 'POST', url: `/api/v1/receipts/${receiptId}/complete`,
        headers: auth(token),
        payload: {
          lines: [{ line_id: lineId, serials: ['SN-TEST-001', 'SN-TEST-002', 'SN-TEST-003'] }],
        },
      })
      expect(res2.statusCode).toBe(200)
      expect(JSON.parse(res2.body).status).toBe('completed')
    } else {
      expect(JSON.parse(res.body).status).toBe('completed')
    }
  })

  it('Sau complete → inventory tồn kho tăng', async () => {
    const res = await app.inject({
      method: 'GET', url: `/api/v1/inventory?variant_id=${variantId}&warehouse_id=${warehouseId}`,
      headers: auth(token),
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    const arr = Array.isArray(body) ? body : (body.data ?? [body])
    const inv = arr.find((i: any) => i.variant_id === variantId)
    expect(inv).toBeDefined()
    expect(inv.qty_on_hand).toBeGreaterThanOrEqual(3)
  })
})

describe('Receipt — cancel', () => {
  let cancelReceiptId: string

  it('Tạo receipt mới để test cancel', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/receipts',
      headers: auth(token),
      payload: {
        import_type: 'purchase', warehouse_id: warehouseId,
        lines: [{ variant_id: variantId, quantity: 1, cost_price: 400000, warranty_months: 0 }],
      },
    })
    expect(res.statusCode).toBe(201)
    cancelReceiptId = JSON.parse(res.body).id
  })

  it('Cancel receipt draft → cancelled', async () => {
    const res = await app.inject({
      method: 'POST', url: `/api/v1/receipts/${cancelReceiptId}/cancel`,
      headers: auth(token),
    })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).status).toBe('cancelled')
  })
})
