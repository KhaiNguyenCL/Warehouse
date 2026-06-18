import { describe, it, expect, beforeEach } from 'vitest'
import { getApp, createUserWithRole, loginAs } from './helpers'

describe('Delivery', () => {
  let token: string
  let warehouseId: string
  let variantId: string
  let adminUserId: string

  beforeEach(async () => {
    const adminUser = await createUserWithRole('Admin', 'admin@test.local', 'Test@123')
    adminUserId = adminUser.id
    token = await loginAs('admin@test.local', 'Test@123')

    const app = await getApp()
    const [warehouse] = await app
      .db('warehouses')
      .insert({ code: 'WH-DELIVERY-TEST', name: 'Kho test xuất', type: 'physical' })
      .returning('*')
    warehouseId = warehouse.id

    const [product] = await app
      .db('products')
      .insert({ code: 'TEST-SW2', name: 'Test Switch 2', product_type: 'storable' })
      .returning('*')
    const [variant] = await app
      .db('variants')
      .insert({ product_id: product.id, sku: 'TEST-SW2-01', name: 'Test Switch 2-01', unit: 'Cái' })
      .returning('*')
    variantId = variant.id

    // Seed sẵn tồn kho + 10 serial active — delivery test không phụ thuộc vào module
    // receipt còn đúng hay không, tự chuẩn bị data qua DB trực tiếp.
    await app.db('inventory').insert({
      variant_id: variantId,
      warehouse_id: warehouseId,
      qty_on_hand: 10,
      avg_cost: 100000,
    })
    await app.db('serial_numbers').insert(
      Array.from({ length: 10 }, (_, i) => ({
        serial_no: `SEED-SN-${i + 1}`,
        variant_id: variantId,
        warehouse_id: warehouseId,
        status: 'active',
      })),
    )
  })

  async function authedInject(opts: Parameters<Awaited<ReturnType<typeof getApp>>['inject']>[0]) {
    const app = await getApp()
    return app.inject({ ...opts, headers: { authorization: `Bearer ${token}`, ...(opts.headers as object) } })
  }

  it('luồng đầy đủ sale: tạo → submit → approve → complete (kèm serial) → trừ tồn kho + serial sold', async () => {
    const app = await getApp()
    const [company] = await app.db('companies').insert({ code: 'CUST-1', name: 'Khách test' }).returning('*')
    // delivery_orders.quotation_id có FK thật tới quotations — phải tạo 1 quotation
    // thật trong DB, không thể dùng UUID giả (sẽ vi phạm FK và lỗi 500).
    const [quotation] = await app
      .db('quotations')
      .insert({ code: 'QU-TEST-001', company_id: company.id, created_by: adminUserId })
      .returning('*')

    const createRes = await authedInject({
      method: 'POST',
      url: '/api/v1/deliveries',
      payload: {
        code: 'DO-TEST-001',
        export_type: 'sale',
        company_id: company.id,
        quotation_id: quotation.id,
        warehouse_id: warehouseId,
        lines: [{ variant_id: variantId, quantity: 4 }],
      },
    })
    expect(createRes.statusCode).toBe(201)
    const delivery = JSON.parse(createRes.payload)
    const lineId = delivery.lines[0].id

    await authedInject({ method: 'PATCH', url: `/api/v1/deliveries/${delivery.id}/submit` })
    await authedInject({ method: 'PATCH', url: `/api/v1/deliveries/${delivery.id}/approve` })

    const serialsToShip = ['SEED-SN-1', 'SEED-SN-2', 'SEED-SN-3', 'SEED-SN-4']
    const completeRes = await authedInject({
      method: 'PATCH',
      url: `/api/v1/deliveries/${delivery.id}/complete`,
      payload: { lines: [{ line_id: lineId, serials: serialsToShip }] },
    })
    expect(completeRes.statusCode).toBe(200)
    expect(JSON.parse(completeRes.payload).status).toBe('completed')

    const inventory = await app
      .db('inventory')
      .where({ variant_id: variantId, warehouse_id: warehouseId })
      .first()
    expect(inventory.qty_on_hand).toBe(6)   // 10 - 4

    const soldSerials = await app.db('serial_numbers').whereIn('serial_no', serialsToShip)
    expect(soldSerials).toHaveLength(4)
    expect(soldSerials.every((s) => s.status === 'sold' && s.warehouse_id === null)).toBe(true)

    const movement = await app
      .db('stock_movements')
      .where({ ref_document_type: 'delivery_order', ref_document_id: delivery.id })
      .first()
    expect(movement.movement_type).toBe('out')
    expect(movement.quantity).toBe(4)
  })

  it('export_type sale thiếu quotation_id → 400', async () => {
    const app = await getApp()
    const [company] = await app.db('companies').insert({ code: 'CUST-2', name: 'KH 2' }).returning('*')

    const res = await authedInject({
      method: 'POST',
      url: '/api/v1/deliveries',
      payload: {
        code: 'DO-TEST-002',
        export_type: 'sale',
        company_id: company.id,
        warehouse_id: warehouseId,
        lines: [{ variant_id: variantId, quantity: 2 }],
      },
    })
    expect(res.statusCode).toBe(400)
  })

  it('export_type demo_out thiếu company_id → 400', async () => {
    const res = await authedInject({
      method: 'POST',
      url: '/api/v1/deliveries',
      payload: {
        code: 'DO-TEST-003',
        export_type: 'demo_out',
        warehouse_id: warehouseId,
        lines: [{ variant_id: variantId, quantity: 2 }],
      },
    })
    expect(res.statusCode).toBe(400)
  })

  it('xuất nhiều hơn tồn kho hiện có → 400 khi complete', async () => {
    const createRes = await authedInject({
      method: 'POST',
      url: '/api/v1/deliveries',
      payload: {
        code: 'DO-TEST-004',
        export_type: 'internal',
        warehouse_id: warehouseId,
        lines: [{ variant_id: variantId, quantity: 999 }],   // vượt xa 10 tồn kho hiện có
      },
    })
    const delivery = JSON.parse(createRes.payload)
    await authedInject({ method: 'PATCH', url: `/api/v1/deliveries/${delivery.id}/submit` })
    await authedInject({ method: 'PATCH', url: `/api/v1/deliveries/${delivery.id}/approve` })

    const completeRes = await authedInject({ method: 'PATCH', url: `/api/v1/deliveries/${delivery.id}/complete` })
    expect(completeRes.statusCode).toBe(400)
  })

  it('serial không thuộc đúng variant/kho/status → 400, không cho complete', async () => {
    const app = await getApp()
    // Serial của 1 variant KHÁC, đang ở kho KHÁC — không liên quan gì tới delivery này
    const [otherProduct] = await app
      .db('products')
      .insert({ code: 'OTHER-PRODUCT', name: 'Other', product_type: 'storable' })
      .returning('*')
    const [otherVariant] = await app
      .db('variants')
      .insert({ product_id: otherProduct.id, sku: 'OTHER-SKU', name: 'Other variant', unit: 'Cái' })
      .returning('*')
    await app.db('serial_numbers').insert({
      serial_no: 'FOREIGN-SN-1', variant_id: otherVariant.id, warehouse_id: warehouseId, status: 'active',
    })

    const createRes = await authedInject({
      method: 'POST',
      url: '/api/v1/deliveries',
      payload: {
        code: 'DO-TEST-007',
        export_type: 'internal',
        warehouse_id: warehouseId,
        lines: [{ variant_id: variantId, quantity: 1 }],
      },
    })
    const delivery = JSON.parse(createRes.payload)
    const lineId = delivery.lines[0].id
    await authedInject({ method: 'PATCH', url: `/api/v1/deliveries/${delivery.id}/submit` })
    await authedInject({ method: 'PATCH', url: `/api/v1/deliveries/${delivery.id}/approve` })

    // Cố tình dùng serial của variant khác cho dòng hàng của variantId
    const completeRes = await authedInject({
      method: 'PATCH',
      url: `/api/v1/deliveries/${delivery.id}/complete`,
      payload: { lines: [{ line_id: lineId, serials: ['FOREIGN-SN-1'] }] },
    })
    expect(completeRes.statusCode).toBe(400)

    // Đảm bảo serial "ngoại lai" đó không bị đụng tới
    const untouched = await app.db('serial_numbers').where({ serial_no: 'FOREIGN-SN-1' }).first()
    expect(untouched.status).toBe('active')
    expect(untouched.warehouse_id).toBe(warehouseId)
  })

  it('demo_out: serial vẫn active nhưng chuyển sang kho ảo WH-DEMO', async () => {
    const app = await getApp()
    const [company] = await app.db('companies').insert({ code: 'CUST-3', name: 'KH demo' }).returning('*')

    const createRes = await authedInject({
      method: 'POST',
      url: '/api/v1/deliveries',
      payload: {
        code: 'DO-TEST-005',
        export_type: 'demo_out',
        company_id: company.id,
        warehouse_id: warehouseId,
        lines: [{ variant_id: variantId, quantity: 2 }],
      },
    })
    const delivery = JSON.parse(createRes.payload)
    const lineId = delivery.lines[0].id
    await authedInject({ method: 'PATCH', url: `/api/v1/deliveries/${delivery.id}/submit` })
    await authedInject({ method: 'PATCH', url: `/api/v1/deliveries/${delivery.id}/approve` })

    await authedInject({
      method: 'PATCH',
      url: `/api/v1/deliveries/${delivery.id}/complete`,
      payload: { lines: [{ line_id: lineId, serials: ['SEED-SN-5', 'SEED-SN-6'] }] },
    })

    const demoWarehouse = await app.db('warehouses').where({ code: 'WH-DEMO' }).first()
    const movedSerials = await app.db('serial_numbers').whereIn('serial_no', ['SEED-SN-5', 'SEED-SN-6'])
    expect(movedSerials.every((s) => s.status === 'active')).toBe(true)
    expect(movedSerials.every((s) => s.warehouse_id === demoWarehouse.id)).toBe(true)
  })

  it('return_out: serial bị xoá hẳn khỏi database', async () => {
    const app = await getApp()
    const [company] = await app.db('companies').insert({ code: 'SUPPLIER-1', name: 'NCC test' }).returning('*')

    const createRes = await authedInject({
      method: 'POST',
      url: '/api/v1/deliveries',
      payload: {
        code: 'DO-TEST-006',
        export_type: 'return_out',
        company_id: company.id,
        warehouse_id: warehouseId,
        lines: [{ variant_id: variantId, quantity: 1 }],
      },
    })
    const delivery = JSON.parse(createRes.payload)
    const lineId = delivery.lines[0].id
    await authedInject({ method: 'PATCH', url: `/api/v1/deliveries/${delivery.id}/submit` })
    await authedInject({ method: 'PATCH', url: `/api/v1/deliveries/${delivery.id}/approve` })

    await authedInject({
      method: 'PATCH',
      url: `/api/v1/deliveries/${delivery.id}/complete`,
      payload: { lines: [{ line_id: lineId, serials: ['SEED-SN-7'] }] },
    })

    const deleted = await app.db('serial_numbers').where({ serial_no: 'SEED-SN-7' }).first()
    expect(deleted).toBeUndefined()
  })
})
