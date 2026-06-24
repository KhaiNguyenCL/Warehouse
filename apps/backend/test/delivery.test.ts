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

    // storable → 1 dòng stock_movements RIÊNG cho từng serial (quantity=1, serial_id gắn
    // đúng SN đó), không phải 1 dòng tổng quantity=4.
    const movements = await app
      .db('stock_movements')
      .where({ ref_document_type: 'delivery_order', ref_document_id: delivery.id })
      .orderBy('serial_id')
    expect(movements).toHaveLength(4)
    expect(movements.every((m) => m.movement_type === 'out' && m.quantity === 1)).toBe(true)
    expect(movements.map((m) => m.serial_id).sort()).toEqual(soldSerials.map((s) => s.id).sort())
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

    const completeRes = await authedInject({
      method: 'PATCH',
      url: `/api/v1/deliveries/${delivery.id}/complete`,
      payload: { lines: [{ line_id: lineId, serials: ['SEED-SN-7'] }] },
    })
    expect(completeRes.statusCode).toBe(200)

    const deleted = await app.db('serial_numbers').where({ serial_no: 'SEED-SN-7' }).first()
    expect(deleted).toBeUndefined()

    // stock_movements vẫn giữ được dòng audit (quantity, ref_document...) sau khi serial
    // gốc đã hard-delete — chỉ serial_id tự null hoá qua ON DELETE SET NULL (migration
    // 20260624000000), không bị mất nguyên dòng hay lỗi FK lúc insert.
    const movement = await app
      .db('stock_movements')
      .where({ ref_document_type: 'delivery_order', ref_document_id: delivery.id })
      .first()
    expect(movement.movement_type).toBe('out')
    expect(movement.quantity).toBe(1)
    expect(movement.serial_id).toBeNull()
  })

  describe('export_type=adjustment liên kết Stocktake Result', () => {
    async function createStocktakeResult() {
      const app = await getApp()
      const [stocktake] = await app
        .db('stocktakes')
        .insert({ code: 'ST-ADJ-OUT-001', warehouse_id: warehouseId, status: 'completed', created_by: adminUserId })
        .returning('*')
      const [result] = await app
        .db('stocktake_results')
        .insert({ stocktake_id: stocktake.id, total_sku: 1, matched: 0, shortage: 1, surplus: 0 })
        .returning('*')
      return result
    }

    it('thiếu ref_document_type/ref_document_id → 400', async () => {
      const res = await authedInject({
        method: 'POST',
        url: '/api/v1/deliveries',
        payload: {
          code: 'PX-ADJ-001',
          export_type: 'adjustment',
          warehouse_id: warehouseId,
          lines: [{ variant_id: variantId, quantity: 1 }],
        },
      })
      expect(res.statusCode).toBe(400)
    })

    it('ref_document_id tham chiếu tới stocktake_result không tồn tại → 400', async () => {
      const res = await authedInject({
        method: 'POST',
        url: '/api/v1/deliveries',
        payload: {
          code: 'PX-ADJ-002',
          export_type: 'adjustment',
          warehouse_id: warehouseId,
          ref_document_type: 'stocktake_result',
          ref_document_id: '00000000-0000-0000-0000-000000000000',
          lines: [{ variant_id: variantId, quantity: 1 }],
        },
      })
      expect(res.statusCode).toBe(400)
    })

    it('ref_document_type/ref_document_id hợp lệ → tạo thành công', async () => {
      const result = await createStocktakeResult()
      const res = await authedInject({
        method: 'POST',
        url: '/api/v1/deliveries',
        payload: {
          code: 'PX-ADJ-003',
          export_type: 'adjustment',
          warehouse_id: warehouseId,
          ref_document_type: 'stocktake_result',
          ref_document_id: result.id,
          lines: [{ variant_id: variantId, quantity: 1 }],
        },
      })
      expect(res.statusCode).toBe(201)
      const delivery = JSON.parse(res.payload)
      expect(delivery.ref_document_type).toBe('stocktake_result')
      expect(delivery.ref_document_id).toBe(result.id)
    })
  })

  describe('export_type không hardcode — đọc trực tiếp từ bảng export_types', () => {
    it('export_type không tồn tại trong export_types → 400', async () => {
      const res = await authedInject({
        method: 'POST',
        url: '/api/v1/deliveries',
        payload: {
          code: 'DO-BADTYPE-001',
          export_type: 'khong_ton_tai',
          warehouse_id: warehouseId,
          lines: [{ variant_id: variantId, quantity: 1 }],
        },
      })
      expect(res.statusCode).toBe(400)
    })

    it('export_type bị tắt (is_active=false) → 400 dù key có tồn tại', async () => {
      const app = await getApp()
      await app
        .db('export_types')
        .insert({ key: 'internal_disabled', label: 'Ngừng dùng', parent_key: 'internal', requires_company: 'none', is_active: false })

      const res = await authedInject({
        method: 'POST',
        url: '/api/v1/deliveries',
        payload: {
          code: 'DO-DISABLED-001',
          export_type: 'internal_disabled',
          warehouse_id: warehouseId,
          lines: [{ variant_id: variantId, quantity: 1 }],
        },
      })
      expect(res.statusCode).toBe(400)
    })

    it('export_type tự thêm qua Settings với parent_key="demo_out" → tự kế thừa hành vi xử lý serial của demo_out', async () => {
      const app = await getApp()
      const [company] = await app.db('companies').insert({ code: 'CUST-VIP', name: 'KH VIP' }).returning('*')
      await app
        .db('export_types')
        .insert({ key: 'demo_out_vip', label: 'Demo khách VIP', parent_key: 'demo_out', requires_company: 'customer', requires_quotation: false })

      const createRes = await authedInject({
        method: 'POST',
        url: '/api/v1/deliveries',
        payload: {
          code: 'DO-VIP-001',
          export_type: 'demo_out_vip',
          company_id: company.id,
          warehouse_id: warehouseId,
          lines: [{ variant_id: variantId, quantity: 1 }],
        },
      })
      expect(createRes.statusCode).toBe(201)
      const delivery = JSON.parse(createRes.payload)
      const lineId = delivery.lines[0].id
      await authedInject({ method: 'PATCH', url: `/api/v1/deliveries/${delivery.id}/submit` })
      await authedInject({ method: 'PATCH', url: `/api/v1/deliveries/${delivery.id}/approve` })
      await authedInject({
        method: 'PATCH',
        url: `/api/v1/deliveries/${delivery.id}/complete`,
        payload: { lines: [{ line_id: lineId, serials: ['SEED-SN-8'] }] },
      })

      const demoWarehouse = await app.db('warehouses').where({ code: 'WH-DEMO' }).first()
      const serial = await app.db('serial_numbers').where({ serial_no: 'SEED-SN-8' }).first()
      expect(serial.status).toBe('active')
      expect(serial.warehouse_id).toBe(demoWarehouse.id)
    })

    it('thiếu company_id cho export_type tự thêm có requires_company≠"none" → 400 (đọc từ DB, không phải hardcode)', async () => {
      const app = await getApp()
      await app
        .db('export_types')
        .insert({ key: 'demo_out_vip2', label: 'Demo VIP 2', parent_key: 'demo_out', requires_company: 'customer' })

      const res = await authedInject({
        method: 'POST',
        url: '/api/v1/deliveries',
        payload: {
          code: 'DO-VIP-002',
          export_type: 'demo_out_vip2',
          warehouse_id: warehouseId,
          lines: [{ variant_id: variantId, quantity: 1 }],
        },
      })
      expect(res.statusCode).toBe(400)
    })
  })

  describe('receipt_lines.qty_remaining (FIFO) — trừ lô khi Complete', () => {
    it('serial-driven: xuất đúng serial nào, trừ đúng receipt_line (lô) của serial đó (không phải FIFO đoán)', async () => {
      const app = await getApp()
      const receiptRes = await authedInject({
        method: 'POST',
        url: '/api/v1/receipts',
        payload: {
          code: 'PN-FOR-DO-001',
          import_type: 'purchase',
          warehouse_id: warehouseId,
          lines: [{ variant_id: variantId, quantity: 2, cost_price: 90000 }],
        },
      })
      const receipt = JSON.parse(receiptRes.payload)
      const receiptLineId = receipt.lines[0].id
      await authedInject({ method: 'PATCH', url: `/api/v1/receipts/${receipt.id}/submit` })
      await authedInject({ method: 'PATCH', url: `/api/v1/receipts/${receipt.id}/approve` })
      await authedInject({
        method: 'PATCH',
        url: `/api/v1/receipts/${receipt.id}/complete`,
        payload: { lines: [{ line_id: receiptLineId, serials: ['BATCH-SN-1', 'BATCH-SN-2'] }] },
      })
      const lineBefore = await app.db('receipt_lines').where({ id: receiptLineId }).first()
      expect(lineBefore.qty_remaining).toBe(2)

      const createRes = await authedInject({
        method: 'POST',
        url: '/api/v1/deliveries',
        payload: {
          code: 'DO-BATCH-001',
          export_type: 'internal',
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
        payload: { lines: [{ line_id: lineId, serials: ['BATCH-SN-1'] }] },
      })

      const lineAfter = await app.db('receipt_lines').where({ id: receiptLineId }).first()
      expect(lineAfter.qty_remaining).toBe(1)   // 2 -> 1, chỉ trừ đúng serial đã xuất, BATCH-SN-2 chưa đụng tới
    })

    it('FIFO: dòng consumable (không serial) trừ lô cũ nhất (receipts.completed_at) trước', async () => {
      const app = await getApp()
      const [consumableProduct] = await app
        .db('products')
        .insert({ code: 'CABLE-1', name: 'Cáp mạng', product_type: 'consumable' })
        .returning('*')
      const [consumableVariant] = await app
        .db('variants')
        .insert({ product_id: consumableProduct.id, sku: 'CABLE-1-01', name: 'Cáp mạng 1', unit: 'Cuộn' })
        .returning('*')

      // Nhập 2 lô qua Receipt thật (qty_on_hand tự cộng dồn, không cần seed tay) — ép
      // completed_at để kiểm soát đúng thứ tự FIFO trong test (thực tế đủ khác biệt tự nhiên).
      async function receiveBatch(code: string, quantity: number, costPrice: number, completedAt: string) {
        const createRes = await authedInject({
          method: 'POST',
          url: '/api/v1/receipts',
          payload: { code, import_type: 'purchase', warehouse_id: warehouseId, lines: [{ variant_id: consumableVariant.id, quantity, cost_price: costPrice }] },
        })
        const receipt = JSON.parse(createRes.payload)
        await authedInject({ method: 'PATCH', url: `/api/v1/receipts/${receipt.id}/submit` })
        await authedInject({ method: 'PATCH', url: `/api/v1/receipts/${receipt.id}/approve` })
        await authedInject({ method: 'PATCH', url: `/api/v1/receipts/${receipt.id}/complete`, payload: {} })
        await app.db('receipts').where({ id: receipt.id }).update({ completed_at: completedAt })
        return receipt.lines[0].id as string
      }

      const oldLineId = await receiveBatch('PN-FIFO-OLD', 10, 40000, '2026-01-01')
      const newLineId = await receiveBatch('PN-FIFO-NEW', 10, 60000, '2026-06-01')

      const createRes = await authedInject({
        method: 'POST',
        url: '/api/v1/deliveries',
        payload: {
          code: 'DO-FIFO-001',
          export_type: 'internal',
          warehouse_id: warehouseId,
          lines: [{ variant_id: consumableVariant.id, quantity: 12 }],
        },
      })
      const delivery = JSON.parse(createRes.payload)
      await authedInject({ method: 'PATCH', url: `/api/v1/deliveries/${delivery.id}/submit` })
      await authedInject({ method: 'PATCH', url: `/api/v1/deliveries/${delivery.id}/approve` })
      // payload: {} bắt buộc — schema completeDeliverySchema yêu cầu body type object,
      // bỏ trống hẳn payload (không phải {}) làm Fastify trả 400 "body must be object"
      // trước khi tới được handler.
      await authedInject({ method: 'PATCH', url: `/api/v1/deliveries/${delivery.id}/complete`, payload: {} })

      const oldAfter = await app.db('receipt_lines').where({ id: oldLineId }).first()
      const newAfter = await app.db('receipt_lines').where({ id: newLineId }).first()
      expect(oldAfter.qty_remaining).toBe(0)   // lấy hết lô cũ trước: 10 -> 0
      expect(newAfter.qty_remaining).toBe(8)    // còn thiếu 2, lấy tiếp lô mới: 10 -> 8
    })

    it('export_type=adjustment (storable, không quét serial) cũng trừ FIFO từ receipt_lines', async () => {
      const app = await getApp()
      const receiptRes = await authedInject({
        method: 'POST',
        url: '/api/v1/receipts',
        payload: {
          code: 'PN-FOR-ADJ-001',
          import_type: 'purchase',
          warehouse_id: warehouseId,
          lines: [{ variant_id: variantId, quantity: 1, cost_price: 80000 }],
        },
      })
      const receipt = JSON.parse(receiptRes.payload)
      const receiptLineId = receipt.lines[0].id
      await authedInject({ method: 'PATCH', url: `/api/v1/receipts/${receipt.id}/submit` })
      await authedInject({ method: 'PATCH', url: `/api/v1/receipts/${receipt.id}/approve` })
      await authedInject({
        method: 'PATCH',
        url: `/api/v1/receipts/${receipt.id}/complete`,
        payload: { lines: [{ line_id: receiptLineId, serials: ['ADJ-SN-1'] }] },
      })

      const [stocktake] = await app
        .db('stocktakes')
        .insert({ code: 'ST-ADJ-FIFO-001', warehouse_id: warehouseId, status: 'completed', created_by: adminUserId })
        .returning('*')
      const [stocktakeResult] = await app
        .db('stocktake_results')
        .insert({ stocktake_id: stocktake.id, total_sku: 1, matched: 0, shortage: 1, surplus: 0 })
        .returning('*')

      const createRes = await authedInject({
        method: 'POST',
        url: '/api/v1/deliveries',
        payload: {
          code: 'DO-ADJ-FIFO-001',
          export_type: 'adjustment',
          warehouse_id: warehouseId,
          ref_document_type: 'stocktake_result',
          ref_document_id: stocktakeResult.id,
          lines: [{ variant_id: variantId, quantity: 1 }],
        },
      })
      const delivery = JSON.parse(createRes.payload)
      await authedInject({ method: 'PATCH', url: `/api/v1/deliveries/${delivery.id}/submit` })
      await authedInject({ method: 'PATCH', url: `/api/v1/deliveries/${delivery.id}/approve` })
      await authedInject({ method: 'PATCH', url: `/api/v1/deliveries/${delivery.id}/complete`, payload: {} })

      const lineAfter = await app.db('receipt_lines').where({ id: receiptLineId }).first()
      expect(lineAfter.qty_remaining).toBe(0)
    })
  })
})
