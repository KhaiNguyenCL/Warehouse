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

  it('GET /lots trả về breakdown từng lô (giá/bảo hành/qty_remaining riêng), sắp theo completed_at', async () => {
    const app = await getApp()
    const variant = await seedVariant(app, 'INV-LOT')
    const [company] = await app.db('companies').insert({ code: 'INV-LOT-NCC', name: 'NCC Lô Test' }).returning('*')
    const [user] = await app.db('users').select('id').limit(1)

    const [oldReceipt] = await app
      .db('receipts')
      .insert({
        code: 'PN-LOT-OLD', import_type: 'purchase', company_id: company.id, warehouse_id: warehouseId,
        status: 'completed', completed_at: '2026-01-01', created_by: user.id,
      })
      .returning('*')
    const [newReceipt] = await app
      .db('receipts')
      .insert({
        code: 'PN-LOT-NEW', import_type: 'purchase', company_id: company.id, warehouse_id: warehouseId,
        status: 'completed', completed_at: '2026-06-01', created_by: user.id,
      })
      .returning('*')
    const [po] = await app
      .db('purchase_orders')
      .insert({ code: 'PO-LOT-001', company_id: company.id, status: 'confirmed', created_by: user.id })
      .returning('*')
    const [poLine] = await app
      .db('purchase_order_lines')
      .insert({ purchase_order_id: po.id, variant_id: variant.id, quantity: 10, unit_price: 900000 })
      .returning('*')

    await app.db('receipt_lines').insert([
      {
        receipt_id: oldReceipt.id, variant_id: variant.id, quantity: 10, qty_remaining: 4,
        cost_price: 900000, warranty_months: 12, po_line_id: poLine.id,
      },
      { receipt_id: newReceipt.id, variant_id: variant.id, quantity: 5, qty_remaining: 5, cost_price: 950000, warranty_months: 24 },
    ])

    const res = await authedInject({
      method: 'GET',
      url: `/api/v1/inventory/lots?variant_id=${variant.id}&warehouse_id=${warehouseId}`,
    })
    expect(res.statusCode).toBe(200)
    const lots = JSON.parse(res.payload)
    expect(lots).toHaveLength(2)
    expect(lots[0].receipt_code).toBe('PN-LOT-OLD')
    expect(Number(lots[0].cost_price)).toBe(900000)
    expect(lots[0].warranty_months).toBe(12)
    expect(lots[0].qty_remaining).toBe(4)
    expect(lots[0].company_name).toBe('NCC Lô Test')
    // Lô đến từ Receipt có po_line_id → trả kèm po_code (liên kết PO tuỳ chọn, mục 9
    // CLAUDE.md) — lô không qua PO chính thức (newReceipt) thì po_code phải là null.
    expect(lots[0].po_code).toBe('PO-LOT-001')
    expect(lots[1].receipt_code).toBe('PN-LOT-NEW')
    expect(Number(lots[1].cost_price)).toBe(950000)
    expect(lots[1].po_code).toBeNull()
  })

  it('GET /serials trả về đúng các SN thuộc 1 receipt_line, không lẫn SN của lô khác', async () => {
    const app = await getApp()
    const variant = await seedVariant(app, 'INV-SN')
    const [user] = await app.db('users').select('id').limit(1)
    const [receipt] = await app
      .db('receipts')
      .insert({
        code: 'PN-SN-001', import_type: 'purchase', warehouse_id: warehouseId,
        status: 'completed', completed_at: '2026-01-01', created_by: user.id,
      })
      .returning('*')
    const [lineA, lineB] = await app
      .db('receipt_lines')
      .insert([
        { receipt_id: receipt.id, variant_id: variant.id, quantity: 2, cost_price: 100000 },
        { receipt_id: receipt.id, variant_id: variant.id, quantity: 1, cost_price: 100000 },
      ])
      .returning('*')
    await app.db('serial_numbers').insert([
      { serial_no: 'INV-SN-A1', variant_id: variant.id, warehouse_id: warehouseId, receipt_line_id: lineA.id, warranty_end: '2027-01-01' },
      { serial_no: 'INV-SN-A2', variant_id: variant.id, warehouse_id: warehouseId, receipt_line_id: lineA.id },
      { serial_no: 'INV-SN-B1', variant_id: variant.id, warehouse_id: warehouseId, receipt_line_id: lineB.id },
    ])

    const res = await authedInject({ method: 'GET', url: `/api/v1/inventory/serials?receipt_line_id=${lineA.id}` })
    expect(res.statusCode).toBe(200)
    const serials = JSON.parse(res.payload)
    expect(serials).toHaveLength(2)
    expect(serials.map((s: any) => s.serial_no)).toEqual(['INV-SN-A1', 'INV-SN-A2'])
    expect(serials[0].warranty_end).not.toBeNull()
    expect(serials[1].warranty_end).toBeNull()
  })

  it('GET /serials/:id/movements trả về đúng lịch sử di chuyển của 1 SN, sắp theo created_at', async () => {
    const app = await getApp()
    const variant = await seedVariant(app, 'INV-MOVES')
    const [user] = await app.db('users').select('id').limit(1)
    const [otherWarehouse] = await app
      .db('warehouses')
      .insert({ code: 'WH-INV-MOVES', name: 'Kho test movements', type: 'physical' })
      .returning('*')
    const [sn] = await app
      .db('serial_numbers')
      .insert({ serial_no: 'INV-MOVES-001', variant_id: variant.id, warehouse_id: otherWarehouse.id })
      .returning('*')
    await app.db('stock_movements').insert([
      {
        variant_id: variant.id, warehouse_id: warehouseId, serial_id: sn.id,
        movement_type: 'in', quantity: 1, unit_cost: 100000,
        ref_document_type: 'receipt', ref_document_id: app.db.raw('gen_random_uuid()'),
        created_by: user.id, created_at: '2026-01-01',
      },
      {
        variant_id: variant.id, warehouse_id: otherWarehouse.id, serial_id: sn.id,
        movement_type: 'in', quantity: 1, unit_cost: 100000,
        ref_document_type: 'transfer_order', ref_document_id: app.db.raw('gen_random_uuid()'),
        created_by: user.id, created_at: '2026-01-02',
      },
    ])

    const res = await authedInject({ method: 'GET', url: `/api/v1/inventory/serials/${sn.id}/movements` })
    expect(res.statusCode).toBe(200)
    const movements = JSON.parse(res.payload)
    expect(movements).toHaveLength(2)
    expect(movements[0].ref_document_type).toBe('receipt')
    expect(movements[0].warehouse_name).not.toBeNull()
    expect(movements[1].ref_document_type).toBe('transfer_order')
  })

  it('GET /serials?search tra ngược đúng 1 SN theo serial_no, không cần biết trước receipt_line_id', async () => {
    const app = await getApp()
    const variant = await seedVariant(app, 'INV-SEARCH')
    const [user] = await app.db('users').select('id').limit(1)
    const [receipt] = await app
      .db('receipts')
      .insert({
        code: 'PN-SEARCH-001', import_type: 'purchase', warehouse_id: warehouseId,
        status: 'completed', completed_at: '2026-01-01', created_by: user.id,
      })
      .returning('*')
    const [line] = await app
      .db('receipt_lines')
      .insert({ receipt_id: receipt.id, variant_id: variant.id, quantity: 1, cost_price: 100000 })
      .returning('*')
    await app.db('serial_numbers').insert({
      serial_no: 'INV-SEARCH-UNIQUE-001', variant_id: variant.id, warehouse_id: warehouseId, receipt_line_id: line.id,
    })

    const res = await authedInject({ method: 'GET', url: '/api/v1/inventory/serials?search=SEARCH-UNIQUE' })
    expect(res.statusCode).toBe(200)
    const serials = JSON.parse(res.payload)
    expect(serials).toHaveLength(1)
    expect(serials[0].serial_no).toBe('INV-SEARCH-UNIQUE-001')
    expect(serials[0].sku).toBe(variant.sku)
    expect(serials[0].receipt_code).toBe('PN-SEARCH-001')
  })

  it('GET /serials thiếu cả receipt_line_id và search → 400', async () => {
    const res = await authedInject({ method: 'GET', url: '/api/v1/inventory/serials' })
    expect(res.statusCode).toBe(400)
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
