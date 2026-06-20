import { describe, it, expect, beforeEach } from 'vitest'
import { getApp, createUserWithRole, loginAs } from './helpers'

describe('Stocktake', () => {
  let token: string
  let warehouseId: string
  let storableVariantId: string
  let consumableXId: string
  let consumableYId: string
  let consumableZId: string
  let categoryId: string

  beforeEach(async () => {
    await createUserWithRole('Admin', 'admin@test.local', 'Test@123')
    token = await loginAs('admin@test.local', 'Test@123')

    const app = await getApp()
    const [warehouse] = await app
      .db('warehouses')
      .insert({ code: 'WH-STOCKTAKE', name: 'Kho test kiểm kê', type: 'physical' })
      .returning('*')
    warehouseId = warehouse.id

    const [category] = await app.db('categories').insert({ name: 'Thiết bị mạng' }).returning('*')
    categoryId = category.id

    const [storableProduct] = await app
      .db('products')
      .insert({ code: 'ST-SW', name: 'ST Switch', product_type: 'storable', category_id: categoryId })
      .returning('*')
    const [storableVariant] = await app
      .db('variants')
      .insert({ product_id: storableProduct.id, sku: 'ST-SW-01', name: 'ST Switch 01', unit: 'Cái' })
      .returning('*')
    storableVariantId = storableVariant.id
    await app.db('inventory').insert({ variant_id: storableVariantId, warehouse_id: warehouseId, qty_on_hand: 5, avg_cost: 100000 })
    await app.db('serial_numbers').insert(
      Array.from({ length: 5 }, (_, i) => ({
        serial_no: `ST-SN-${i + 1}`,
        variant_id: storableVariantId,
        warehouse_id: warehouseId,
        status: 'active',
      })),
    )

    const [consumableProduct] = await app
      .db('products')
      .insert({ code: 'ST-CABLE', name: 'ST Cable', product_type: 'consumable', category_id: categoryId })
      .returning('*')
    const consumables = await app
      .db('variants')
      .insert([
        { product_id: consumableProduct.id, sku: 'ST-CABLE-X', name: 'Cable X', unit: 'Mét' },
        { product_id: consumableProduct.id, sku: 'ST-CABLE-Y', name: 'Cable Y', unit: 'Mét' },
        { product_id: consumableProduct.id, sku: 'ST-CABLE-Z', name: 'Cable Z', unit: 'Mét' },
      ])
      .returning('*')
    ;[consumableXId, consumableYId, consumableZId] = consumables.map((v) => v.id)
    await app.db('inventory').insert([
      { variant_id: consumableXId, warehouse_id: warehouseId, qty_on_hand: 10, avg_cost: 5000 },
      { variant_id: consumableYId, warehouse_id: warehouseId, qty_on_hand: 10, avg_cost: 5000 },
      { variant_id: consumableZId, warehouse_id: warehouseId, qty_on_hand: 10, avg_cost: 5000 },
    ])
  })

  async function authedInject(opts: Parameters<Awaited<ReturnType<typeof getApp>>['inject']>[0], overrideToken?: string) {
    const app = await getApp()
    return app.inject({ ...opts, headers: { authorization: `Bearer ${overrideToken ?? token}`, ...(opts.headers as object) } })
  }

  it('tạo stocktake scope=all: snapshot đúng qty_system từ inventory hiện có', async () => {
    const res = await authedInject({
      method: 'POST',
      url: '/api/v1/stocktakes',
      payload: { code: 'KK-001', warehouse_id: warehouseId },
    })
    expect(res.statusCode).toBe(201)
    const stocktake = JSON.parse(res.payload)
    expect(stocktake.status).toBe('in_progress')
    expect(stocktake.lines).toHaveLength(4) // storable + 3 consumable

    const storableLine = stocktake.lines.find((l: any) => l.variant_id === storableVariantId)
    expect(storableLine.qty_system).toBe(5)
    expect(storableLine.qty_actual).toBeNull()
  })

  it('tạo stocktake scope=by_sku: variant CHƯA có inventory row tại kho này → qty_system=0', async () => {
    const app = await getApp()
    const [otherProduct] = await app.db('products').insert({ code: 'NEW-PROD', name: 'New', product_type: 'consumable' }).returning('*')
    const [otherVariant] = await app.db('variants').insert({ product_id: otherProduct.id, sku: 'NEW-SKU', name: 'New variant', unit: 'Cái' }).returning('*')

    const res = await authedInject({
      method: 'POST',
      url: '/api/v1/stocktakes',
      payload: { code: 'KK-002', warehouse_id: warehouseId, scope_type: 'by_sku', scope_ids: [otherVariant.id] },
    })
    expect(res.statusCode).toBe(201)
    const stocktake = JSON.parse(res.payload)
    expect(stocktake.lines).toHaveLength(1)
    expect(stocktake.lines[0].qty_system).toBe(0)
  })

  it('scope_type khác "all" mà thiếu scope_ids → 400', async () => {
    const res = await authedInject({
      method: 'POST',
      url: '/api/v1/stocktakes',
      payload: { code: 'KK-003', warehouse_id: warehouseId, scope_type: 'by_category' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('scope_type=by_category lấy đúng variant theo category', async () => {
    const res = await authedInject({
      method: 'POST',
      url: '/api/v1/stocktakes',
      payload: { code: 'KK-004', warehouse_id: warehouseId, scope_type: 'by_category', scope_ids: [categoryId] },
    })
    expect(res.statusCode).toBe(201)
    expect(JSON.parse(res.payload).lines).toHaveLength(4)
  })

  it('complete: thiếu qty_actual cho 1 dòng → 400', async () => {
    const createRes = await authedInject({
      method: 'POST',
      url: '/api/v1/stocktakes',
      payload: { code: 'KK-005', warehouse_id: warehouseId, scope_type: 'by_sku', scope_ids: [consumableXId] },
    })
    const stocktake = JSON.parse(createRes.payload)

    const res = await authedInject({
      method: 'PATCH',
      url: `/api/v1/stocktakes/${stocktake.id}/complete`,
      payload: { lines: [] },
    })
    expect(res.statusCode).toBe(400)
  })

  it('complete: tính đúng matched/shortage/surplus, KHÔNG đụng vào inventory.qty_on_hand', async () => {
    const createRes = await authedInject({
      method: 'POST',
      url: '/api/v1/stocktakes',
      payload: { code: 'KK-006', warehouse_id: warehouseId, scope_type: 'by_sku', scope_ids: [consumableXId, consumableYId, consumableZId] },
    })
    const stocktake = JSON.parse(createRes.payload)
    const lineX = stocktake.lines.find((l: any) => l.variant_id === consumableXId)
    const lineY = stocktake.lines.find((l: any) => l.variant_id === consumableYId)
    const lineZ = stocktake.lines.find((l: any) => l.variant_id === consumableZId)

    const completeRes = await authedInject({
      method: 'PATCH',
      url: `/api/v1/stocktakes/${stocktake.id}/complete`,
      payload: {
        lines: [
          { line_id: lineX.id, qty_actual: 10 }, // matched
          { line_id: lineY.id, qty_actual: 7 },  // shortage -3
          { line_id: lineZ.id, qty_actual: 13 }, // surplus +3
        ],
      },
    })
    expect(completeRes.statusCode).toBe(200)
    expect(JSON.parse(completeRes.payload).status).toBe('completed')

    const app = await getApp()
    const result = await app.db('stocktake_results').where({ stocktake_id: stocktake.id }).first()
    expect(result.total_sku).toBe(3)
    expect(result.matched).toBe(1)
    expect(result.shortage).toBe(1)
    expect(result.surplus).toBe(1)

    const inventories = await app.db('inventory').where({ warehouse_id: warehouseId }).whereIn('variant_id', [consumableXId, consumableYId, consumableZId])
    expect(inventories.every((i) => i.qty_on_hand === 10)).toBe(true) // không đổi

    const updatedLines = await app.db('stocktake_lines').where({ stocktake_id: stocktake.id })
    const updatedY = updatedLines.find((l) => l.variant_id === consumableYId)
    expect(updatedY.difference).toBe(-3)
  })

  it('complete: đối chiếu serial đúng found/missing/unexpected cho dòng storable', async () => {
    const app = await getApp()
    // Serial "ngoại lai" — đang active nhưng ở 1 kho KHÁC, lúc kiểm kê lại quét thấy ở kho này
    const [otherWarehouse] = await app.db('warehouses').insert({ code: 'WH-OTHER-ST', name: 'Kho khác', type: 'physical' }).returning('*')
    await app.db('serial_numbers').insert({ serial_no: 'FOREIGN-SN', variant_id: storableVariantId, warehouse_id: otherWarehouse.id, status: 'active' })

    const createRes = await authedInject({
      method: 'POST',
      url: '/api/v1/stocktakes',
      payload: { code: 'KK-007', warehouse_id: warehouseId, scope_type: 'by_sku', scope_ids: [storableVariantId] },
    })
    const stocktake = JSON.parse(createRes.payload)
    const line = stocktake.lines[0]

    // Quét thực tế thấy 4/5 serial hệ thống (thiếu ST-SN-5) + 1 serial lạ (FOREIGN-SN)
    const completeRes = await authedInject({
      method: 'PATCH',
      url: `/api/v1/stocktakes/${stocktake.id}/complete`,
      payload: {
        lines: [
          { line_id: line.id, qty_actual: 5, found_serials: ['ST-SN-1', 'ST-SN-2', 'ST-SN-3', 'ST-SN-4', 'FOREIGN-SN'] },
        ],
      },
    })
    expect(completeRes.statusCode).toBe(200)

    const serialRows = await app
      .db('stocktake_serials as ss')
      .join('serial_numbers as sn', 'sn.id', 'ss.serial_id')
      .where('ss.stocktake_id', stocktake.id)
      .select('sn.serial_no', 'ss.status')

    const byNo = new Map(serialRows.map((r) => [r.serial_no, r.status]))
    expect(byNo.get('ST-SN-1')).toBe('found')
    expect(byNo.get('ST-SN-4')).toBe('found')
    expect(byNo.get('ST-SN-5')).toBe('missing')
    expect(byNo.get('FOREIGN-SN')).toBe('unexpected')
  })

  it('complete chỉ cho phép khi đang In Progress → 400 nếu gọi lại lần 2', async () => {
    const createRes = await authedInject({
      method: 'POST',
      url: '/api/v1/stocktakes',
      payload: { code: 'KK-008', warehouse_id: warehouseId, scope_type: 'by_sku', scope_ids: [consumableXId] },
    })
    const stocktake = JSON.parse(createRes.payload)
    const lineId = stocktake.lines[0].id

    await authedInject({
      method: 'PATCH',
      url: `/api/v1/stocktakes/${stocktake.id}/complete`,
      payload: { lines: [{ line_id: lineId, qty_actual: 10 }] },
    })

    const secondRes = await authedInject({
      method: 'PATCH',
      url: `/api/v1/stocktakes/${stocktake.id}/complete`,
      payload: { lines: [{ line_id: lineId, qty_actual: 10 }] },
    })
    expect(secondRes.statusCode).toBe(400)
  })

  it('cancel: chủ kiểm kê huỷ thành công khi đang In Progress', async () => {
    const createRes = await authedInject({
      method: 'POST',
      url: '/api/v1/stocktakes',
      payload: { code: 'KK-009', warehouse_id: warehouseId, scope_type: 'by_sku', scope_ids: [consumableXId] },
    })
    const stocktake = JSON.parse(createRes.payload)

    const cancelRes = await authedInject({ method: 'PATCH', url: `/api/v1/stocktakes/${stocktake.id}/cancel` })
    expect(cancelRes.statusCode).toBe(200)
    expect(JSON.parse(cancelRes.payload).status).toBe('cancelled')
  })

  it('cancel: người không phải chủ và không có quyền stocktake.complete → 403', async () => {
    const createRes = await authedInject({
      method: 'POST',
      url: '/api/v1/stocktakes',
      payload: { code: 'KK-010', warehouse_id: warehouseId, scope_type: 'by_sku', scope_ids: [consumableXId] },
    })
    const stocktake = JSON.parse(createRes.payload)

    await createUserWithRole('Sale', 'sale@test.local', 'Test@123')
    const saleToken = await loginAs('sale@test.local', 'Test@123')

    const cancelRes = await authedInject({ method: 'PATCH', url: `/api/v1/stocktakes/${stocktake.id}/cancel` }, saleToken)
    expect(cancelRes.statusCode).toBe(403)
  })

  it('cancel: người không phải chủ nhưng có quyền stocktake.complete (Warehouse) huỷ được', async () => {
    const createRes = await authedInject({
      method: 'POST',
      url: '/api/v1/stocktakes',
      payload: { code: 'KK-011', warehouse_id: warehouseId, scope_type: 'by_sku', scope_ids: [consumableXId] },
    })
    const stocktake = JSON.parse(createRes.payload)

    await createUserWithRole('Warehouse', 'warehouse@test.local', 'Test@123')
    const warehouseToken = await loginAs('warehouse@test.local', 'Test@123')

    const cancelRes = await authedInject({ method: 'PATCH', url: `/api/v1/stocktakes/${stocktake.id}/cancel` }, warehouseToken)
    expect(cancelRes.statusCode).toBe(200)
  })

  it('cancel 400 khi kiểm kê đã completed', async () => {
    const createRes = await authedInject({
      method: 'POST',
      url: '/api/v1/stocktakes',
      payload: { code: 'KK-012', warehouse_id: warehouseId, scope_type: 'by_sku', scope_ids: [consumableXId] },
    })
    const stocktake = JSON.parse(createRes.payload)
    const lineId = stocktake.lines[0].id

    await authedInject({
      method: 'PATCH',
      url: `/api/v1/stocktakes/${stocktake.id}/complete`,
      payload: { lines: [{ line_id: lineId, qty_actual: 10 }] },
    })

    const cancelRes = await authedInject({ method: 'PATCH', url: `/api/v1/stocktakes/${stocktake.id}/cancel` })
    expect(cancelRes.statusCode).toBe(400)
  })
})
