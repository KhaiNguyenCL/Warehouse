import { describe, it, expect, beforeEach } from 'vitest'
import { getApp, createUserWithRole, loginAs } from './helpers'

describe('Transfer', () => {
  let token: string
  let fromWarehouseId: string
  let toWarehouseId: string
  let variantId: string

  beforeEach(async () => {
    await createUserWithRole('Admin', 'admin@test.local', 'Test@123')
    token = await loginAs('admin@test.local', 'Test@123')

    const app = await getApp()
    const [fromWh] = await app
      .db('warehouses')
      .insert({ code: 'WH-TRANSFER-FROM', name: 'Kho nguồn', type: 'physical' })
      .returning('*')
    const [toWh] = await app
      .db('warehouses')
      .insert({ code: 'WH-TRANSFER-TO', name: 'Kho đích', type: 'physical' })
      .returning('*')
    fromWarehouseId = fromWh.id
    toWarehouseId = toWh.id

    const [product] = await app
      .db('products')
      .insert({ code: 'TEST-SW3', name: 'Test Switch 3', product_type: 'storable' })
      .returning('*')
    const [variant] = await app
      .db('variants')
      .insert({ product_id: product.id, sku: 'TEST-SW3-01', name: 'Test Switch 3-01', unit: 'Cái' })
      .returning('*')
    variantId = variant.id

    await app.db('inventory').insert({
      variant_id: variantId, warehouse_id: fromWarehouseId, qty_on_hand: 10, avg_cost: 100000,
    })
    await app.db('serial_numbers').insert(
      Array.from({ length: 10 }, (_, i) => ({
        serial_no: `TRF-SN-${i + 1}`,
        variant_id: variantId,
        warehouse_id: fromWarehouseId,
        status: 'active',
      })),
    )
  })

  async function authedInject(opts: Parameters<Awaited<ReturnType<typeof getApp>>['inject']>[0]) {
    const app = await getApp()
    return app.inject({ ...opts, headers: { authorization: `Bearer ${token}`, ...(opts.headers as object) } })
  }

  it('luồng đầy đủ: tạo → submit → approve → complete (kèm serial) → kho nguồn -n, kho đích +n', async () => {
    const app = await getApp()

    const createRes = await authedInject({
      method: 'POST',
      url: '/api/v1/transfers',
      payload: {
        code: 'TO-TEST-001',
        transfer_type: 'transfer',
        from_warehouse_id: fromWarehouseId,
        to_warehouse_id: toWarehouseId,
        lines: [{ variant_id: variantId, quantity: 4 }],
      },
    })
    expect(createRes.statusCode).toBe(201)
    const transfer = JSON.parse(createRes.payload)
    const lineId = transfer.lines[0].id

    await authedInject({ method: 'PATCH', url: `/api/v1/transfers/${transfer.id}/submit` })
    await authedInject({ method: 'PATCH', url: `/api/v1/transfers/${transfer.id}/approve` })

    const serialsToMove = ['TRF-SN-1', 'TRF-SN-2', 'TRF-SN-3', 'TRF-SN-4']
    const completeRes = await authedInject({
      method: 'PATCH',
      url: `/api/v1/transfers/${transfer.id}/complete`,
      payload: { lines: [{ line_id: lineId, serials: serialsToMove }] },
    })
    expect(completeRes.statusCode).toBe(200)
    expect(JSON.parse(completeRes.payload).status).toBe('completed')

    const fromInventory = await app
      .db('inventory')
      .where({ variant_id: variantId, warehouse_id: fromWarehouseId })
      .first()
    expect(fromInventory.qty_on_hand).toBe(6)   // 10 - 4

    const toInventory = await app
      .db('inventory')
      .where({ variant_id: variantId, warehouse_id: toWarehouseId })
      .first()
    expect(toInventory.qty_on_hand).toBe(4)
    expect(Number(toInventory.avg_cost)).toBe(100000)   // kế thừa avg_cost từ kho nguồn

    const movedSerials = await app.db('serial_numbers').whereIn('serial_no', serialsToMove)
    expect(movedSerials.every((s) => s.warehouse_id === toWarehouseId && s.status === 'active')).toBe(true)

    const movements = await app
      .db('stock_movements')
      .where({ ref_document_type: 'transfer_order', ref_document_id: transfer.id })
      .orderBy('movement_type')
    expect(movements).toHaveLength(2)
    expect(movements[0].movement_type).toBe('in')
    expect(movements[1].movement_type).toBe('out')
  })

  it('from_warehouse_id trùng to_warehouse_id → 400', async () => {
    const res = await authedInject({
      method: 'POST',
      url: '/api/v1/transfers',
      payload: {
        code: 'TO-TEST-002',
        transfer_type: 'transfer',
        from_warehouse_id: fromWarehouseId,
        to_warehouse_id: fromWarehouseId,
        lines: [{ variant_id: variantId, quantity: 1 }],
      },
    })
    expect(res.statusCode).toBe(400)
  })

  it('chuyển nhiều hơn tồn kho nguồn hiện có → 400 khi complete', async () => {
    const createRes = await authedInject({
      method: 'POST',
      url: '/api/v1/transfers',
      payload: {
        code: 'TO-TEST-003',
        transfer_type: 'transfer',
        from_warehouse_id: fromWarehouseId,
        to_warehouse_id: toWarehouseId,
        lines: [{ variant_id: variantId, quantity: 999 }],
      },
    })
    const transfer = JSON.parse(createRes.payload)
    await authedInject({ method: 'PATCH', url: `/api/v1/transfers/${transfer.id}/submit` })
    await authedInject({ method: 'PATCH', url: `/api/v1/transfers/${transfer.id}/approve` })

    const completeRes = await authedInject({ method: 'PATCH', url: `/api/v1/transfers/${transfer.id}/complete` })
    expect(completeRes.statusCode).toBe(400)
  })

  it('serial đang ở kho đích (không phải kho nguồn) → 400, không cho complete', async () => {
    const app = await getApp()
    // Serial này thuộc đúng variant nhưng đang nằm ở kho ĐÍCH, không phải kho nguồn —
    // không hợp lệ để "chuyển từ kho nguồn" vì nó vốn không ở đó.
    await app.db('serial_numbers').insert({
      serial_no: 'WRONG-WAREHOUSE-SN', variant_id: variantId, warehouse_id: toWarehouseId, status: 'active',
    })

    const createRes = await authedInject({
      method: 'POST',
      url: '/api/v1/transfers',
      payload: {
        code: 'TO-TEST-005',
        transfer_type: 'transfer',
        from_warehouse_id: fromWarehouseId,
        to_warehouse_id: toWarehouseId,
        lines: [{ variant_id: variantId, quantity: 1 }],
      },
    })
    const transfer = JSON.parse(createRes.payload)
    const lineId = transfer.lines[0].id
    await authedInject({ method: 'PATCH', url: `/api/v1/transfers/${transfer.id}/submit` })
    await authedInject({ method: 'PATCH', url: `/api/v1/transfers/${transfer.id}/approve` })

    const completeRes = await authedInject({
      method: 'PATCH',
      url: `/api/v1/transfers/${transfer.id}/complete`,
      payload: { lines: [{ line_id: lineId, serials: ['WRONG-WAREHOUSE-SN'] }] },
    })
    expect(completeRes.statusCode).toBe(400)
  })

  it('avg_cost ở kho đích tính đúng khi đã có sẵn tồn kho trước đó', async () => {
    const app = await getApp()
    // Kho đích đã có sẵn 5 cái giá 200,000 trước khi nhận chuyển kho
    await app.db('inventory').insert({
      variant_id: variantId, warehouse_id: toWarehouseId, qty_on_hand: 5, avg_cost: 200000,
    })

    const createRes = await authedInject({
      method: 'POST',
      url: '/api/v1/transfers',
      payload: {
        code: 'TO-TEST-004',
        transfer_type: 'transfer',
        from_warehouse_id: fromWarehouseId,
        to_warehouse_id: toWarehouseId,
        lines: [{ variant_id: variantId, quantity: 5 }],   // 5 cái giá 100,000 từ kho nguồn
      },
    })
    const transfer = JSON.parse(createRes.payload)
    const lineId = transfer.lines[0].id
    await authedInject({ method: 'PATCH', url: `/api/v1/transfers/${transfer.id}/submit` })
    await authedInject({ method: 'PATCH', url: `/api/v1/transfers/${transfer.id}/approve` })
    await authedInject({
      method: 'PATCH',
      url: `/api/v1/transfers/${transfer.id}/complete`,
      payload: { lines: [{ line_id: lineId, serials: ['TRF-SN-5', 'TRF-SN-6', 'TRF-SN-7', 'TRF-SN-8', 'TRF-SN-9'] }] },
    })

    // avg_cost mới = (5*200,000 + 5*100,000) / 10 = 150,000
    const toInventory = await app
      .db('inventory')
      .where({ variant_id: variantId, warehouse_id: toWarehouseId })
      .first()
    expect(toInventory.qty_on_hand).toBe(10)
    expect(Number(toInventory.avg_cost)).toBe(150000)
  })

  it('demo_in: tự suy from_warehouse_id = kho ảo WH-DEMO, không cần client truyền lên', async () => {
    const app = await getApp()
    const demoWarehouse = await app.db('warehouses').where({ code: 'WH-DEMO' }).first()

    const createRes = await authedInject({
      method: 'POST',
      url: '/api/v1/transfers',
      payload: {
        code: 'TO-TEST-006',
        transfer_type: 'demo_in',
        to_warehouse_id: toWarehouseId,
        lines: [{ variant_id: variantId, quantity: 1 }],
      },
    })
    expect(createRes.statusCode).toBe(201)
    const transfer = JSON.parse(createRes.payload)
    expect(transfer.from_warehouse_id).toBe(demoWarehouse.id)
  })

  it('demo_in: client cố truyền from_warehouse_id khác → bị bỏ qua, vẫn dùng kho ảo WH-DEMO', async () => {
    const app = await getApp()
    const demoWarehouse = await app.db('warehouses').where({ code: 'WH-DEMO' }).first()

    const createRes = await authedInject({
      method: 'POST',
      url: '/api/v1/transfers',
      payload: {
        code: 'TO-TEST-007',
        transfer_type: 'demo_in',
        from_warehouse_id: fromWarehouseId,
        to_warehouse_id: toWarehouseId,
        lines: [{ variant_id: variantId, quantity: 1 }],
      },
    })
    expect(createRes.statusCode).toBe(201)
    expect(JSON.parse(createRes.payload).from_warehouse_id).toBe(demoWarehouse.id)
  })

  it('transfer_type="transfer" thiếu from_warehouse_id → 400', async () => {
    const res = await authedInject({
      method: 'POST',
      url: '/api/v1/transfers',
      payload: {
        code: 'TO-TEST-008',
        transfer_type: 'transfer',
        to_warehouse_id: toWarehouseId,
        lines: [{ variant_id: variantId, quantity: 1 }],
      },
    })
    expect(res.statusCode).toBe(400)
  })
})
