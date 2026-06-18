import { describe, it, expect, beforeEach } from 'vitest'
import { getApp, createUserWithRole, loginAs } from './helpers'

describe('Inventory', () => {
  let token: string
  let warehouseId: string

  beforeEach(async () => {
    await createUserWithRole('Admin', 'admin@test.local', 'Test@123')
    token = await loginAs('admin@test.local', 'Test@123')

    const app = await getApp()
    const [warehouse] = await app
      .db('warehouses')
      .insert({ code: 'WH-INV-TEST', name: 'Kho test inventory', type: 'physical' })
      .returning('*')
    warehouseId = warehouse.id
  })

  async function authedInject(opts: Parameters<Awaited<ReturnType<typeof getApp>>['inject']>[0]) {
    const app = await getApp()
    return app.inject({ ...opts, headers: { authorization: `Bearer ${token}`, ...(opts.headers as object) } })
  }

  async function seedVariant(app: Awaited<ReturnType<typeof getApp>>, code: string, reorderPoint = 0) {
    const [product] = await app.db('products').insert({ code, name: code, product_type: 'storable' }).returning('*')
    const [variant] = await app
      .db('variants')
      .insert({ product_id: product.id, sku: `${code}-SKU`, name: code, unit: 'Cái', reorder_point: reorderPoint })
      .returning('*')
    return variant
  }

  it('list trả về qty_available tính đúng = qty_on_hand - qty_reserved', async () => {
    const app = await getApp()
    const variant = await seedVariant(app, 'INV-A')
    await app.db('inventory').insert({
      variant_id: variant.id, warehouse_id: warehouseId, qty_on_hand: 10, qty_reserved: 3, avg_cost: 50000,
    })

    const res = await authedInject({ method: 'GET', url: `/api/v1/inventory?variant_id=${variant.id}` })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(body.data).toHaveLength(1)
    expect(body.data[0].qty_on_hand).toBe(10)
    expect(body.data[0].qty_reserved).toBe(3)
    expect(body.data[0].qty_available).toBe(7)
  })

  it('low-stock chỉ trả về variant có tổng tồn kho dưới reorder_point', async () => {
    const app = await getApp()
    const lowVariant = await seedVariant(app, 'INV-LOW', 20)   // reorder_point=20
    const okVariant = await seedVariant(app, 'INV-OK', 5)      // reorder_point=5

    await app.db('inventory').insert([
      { variant_id: lowVariant.id, warehouse_id: warehouseId, qty_on_hand: 3, qty_reserved: 0 },   // 3 < 20 → low
      { variant_id: okVariant.id, warehouse_id: warehouseId, qty_on_hand: 10, qty_reserved: 0 },   // 10 >= 5 → ok
    ])

    const res = await authedInject({ method: 'GET', url: '/api/v1/inventory/low-stock' })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    const skus = body.data.map((r: any) => r.sku)
    expect(skus).toContain('INV-LOW-SKU')
    expect(skus).not.toContain('INV-OK-SKU')
    expect(body.total).toBe(1)
  })

  it('low-stock không trả về variant có reorder_point = 0 (không theo dõi ngưỡng)', async () => {
    const app = await getApp()
    const variant = await seedVariant(app, 'INV-NOTRACK', 0)
    await app.db('inventory').insert({ variant_id: variant.id, warehouse_id: warehouseId, qty_on_hand: 0, qty_reserved: 0 })

    const res = await authedInject({ method: 'GET', url: '/api/v1/inventory/low-stock' })
    const body = JSON.parse(res.payload)
    expect(body.data.map((r: any) => r.sku)).not.toContain('INV-NOTRACK-SKU')
  })

  it('low-stock phân trang đúng limit/page', async () => {
    const app = await getApp()
    for (let i = 0; i < 3; i++) {
      const variant = await seedVariant(app, `INV-PAGE-${i}`, 20)
      await app.db('inventory').insert({ variant_id: variant.id, warehouse_id: warehouseId, qty_on_hand: 1, qty_reserved: 0 })
    }

    const res = await authedInject({ method: 'GET', url: '/api/v1/inventory/low-stock?page=1&limit=2' })
    const body = JSON.parse(res.payload)
    expect(body.data).toHaveLength(2)
    expect(body.total).toBe(3)
    expect(body.page).toBe(1)
    expect(body.limit).toBe(2)
  })

  it('filter theo warehouse_id chỉ trả đúng kho đó', async () => {
    const app = await getApp()
    const [otherWarehouse] = await app
      .db('warehouses')
      .insert({ code: 'WH-INV-TEST-2', name: 'Kho test inventory 2', type: 'physical' })
      .returning('*')
    const variant = await seedVariant(app, 'INV-MULTI')
    await app.db('inventory').insert([
      { variant_id: variant.id, warehouse_id: warehouseId, qty_on_hand: 5, qty_reserved: 0 },
      { variant_id: variant.id, warehouse_id: otherWarehouse.id, qty_on_hand: 8, qty_reserved: 0 },
    ])

    const res = await authedInject({ method: 'GET', url: `/api/v1/inventory?warehouse_id=${warehouseId}` })
    const body = JSON.parse(res.payload)
    expect(body.data).toHaveLength(1)
    expect(body.data[0].qty_on_hand).toBe(5)
  })
})
