import { describe, it, expect, beforeEach } from 'vitest'
import { getApp, createUserWithRole, loginAs } from './helpers'

describe('Receipt', () => {
  let token: string
  let warehouseId: string
  let variantId: string

  beforeEach(async () => {
    await createUserWithRole('Admin', 'admin@test.local', 'Test@123')
    token = await loginAs('admin@test.local', 'Test@123')

    const app = await getApp()
    // WH-DEMO là kho ảo seed sẵn trong migration — dùng lại thay vì tạo kho mới
    const warehouse = await app.db('warehouses').where({ code: 'WH-DEMO' }).first()
    warehouseId = warehouse.id

    const [product] = await app
      .db('products')
      .insert({ code: 'TEST-SW', name: 'Test Switch', product_type: 'storable' })
      .returning('*')
    const [variant] = await app
      .db('variants')
      .insert({ product_id: product.id, sku: 'TEST-SW-01', name: 'Test Switch 01', unit: 'Cái' })
      .returning('*')
    variantId = variant.id
  })

  async function authedInject(opts: Parameters<Awaited<ReturnType<typeof getApp>>['inject']>[0]) {
    const app = await getApp()
    return app.inject({ ...opts, headers: { authorization: `Bearer ${token}`, ...(opts.headers as object) } })
  }

  function genSerials(prefix: string, count: number) {
    return Array.from({ length: count }, (_, i) => `${prefix}-${i + 1}`)
  }

  it('luồng đầy đủ: tạo → complete (kèm serial) → cập nhật inventory + serial_numbers', async () => {
    const app = await getApp()

    const createRes = await authedInject({
      method: 'POST',
      url: '/api/v1/receipts',
      payload: {
        code: 'PN-TEST-001',
        import_type: 'purchase',
        warehouse_id: warehouseId,
        lines: [{ variant_id: variantId, quantity: 10, cost_price: 100000 }],
      },
    })
    expect(createRes.statusCode).toBe(201)
    const receipt = JSON.parse(createRes.payload)
    expect(receipt.status).toBe('draft')
    const lineId = receipt.lines[0].id   // repository.create() trả luôn line id để dùng ở bước complete


    const serials = genSerials('SN-001', 10)
    const completeRes = await authedInject({
      method: 'PATCH',
      url: `/api/v1/receipts/${receipt.id}/complete`,
      payload: { lines: [{ line_id: lineId, serials }] },
    })
    expect(JSON.parse(completeRes.payload).status).toBe('completed')

    const inventory = await app
      .db('inventory')
      .where({ variant_id: variantId, warehouse_id: warehouseId })
      .first()
    expect(inventory.qty_on_hand).toBe(10)
    expect(Number(inventory.avg_cost)).toBe(100000)

    const createdSerials = await app
      .db('serial_numbers')
      .where({ variant_id: variantId, warehouse_id: warehouseId })
      .orderBy('serial_no')
    expect(createdSerials).toHaveLength(10)
    expect(createdSerials.every((s) => s.status === 'active')).toBe(true)
    expect(createdSerials.every((s) => s.receipt_line_id === lineId)).toBe(true)
    expect(createdSerials.map((s) => s.serial_no)).toEqual(serials.slice().sort())

    // storable → 1 dòng stock_movements RIÊNG cho từng serial (quantity=1, serial_id gắn
    // đúng SN đó), không phải 1 dòng tổng quantity=10 — để có lịch sử di chuyển theo từng SN.
    const movements = await app
      .db('stock_movements')
      .where({ ref_document_type: 'receipt', ref_document_id: receipt.id })
      .orderBy('serial_id')
    expect(movements).toHaveLength(10)
    expect(movements.every((m) => m.movement_type === 'in' && m.quantity === 1)).toBe(true)
    expect(movements.map((m) => m.serial_id).sort()).toEqual(createdSerials.map((s) => s.id).sort())
  })

  it('warranty_months trên receipt_line → tính đúng serial_numbers.warranty_end = completed_at + N tháng', async () => {
    const app = await getApp()
    const createRes = await authedInject({
      method: 'POST',
      url: '/api/v1/receipts',
      payload: {
        code: 'PN-WARRANTY-001',
        import_type: 'purchase',
        warehouse_id: warehouseId,
        lines: [{ variant_id: variantId, quantity: 2, cost_price: 100000, manufacturer_warranty_months: 24 }],
      },
    })
    const receipt = JSON.parse(createRes.payload)
    const lineId = receipt.lines[0].id
    expect(receipt.lines[0].manufacturer_warranty_months).toBe(24)

    const serials = genSerials('SN-WTY', 2)
    await authedInject({
      method: 'PATCH',
      url: `/api/v1/receipts/${receipt.id}/complete`,
      payload: { lines: [{ line_id: lineId, serials }] },
    })

    const createdSerials = await app.db('serial_numbers').whereIn('serial_no', serials)
    expect(createdSerials).toHaveLength(2)
    for (const s of createdSerials) {
      expect(s.manufacturer_warranty_end).not.toBeNull()
      const expected = new Date()
      expected.setMonth(expected.getMonth() + 24)
      const diffDays = Math.abs((new Date(s.manufacturer_warranty_end).getTime() - expected.getTime()) / 86400000)
      expect(diffDays).toBeLessThan(2) // sai lệch nhỏ do thời điểm chạy test khác completed_at vài ms
    }
  })

  it('không có warranty_months → serial_numbers.warranty_end vẫn NULL (không lỗi)', async () => {
    const app = await getApp()
    const createRes = await authedInject({
      method: 'POST',
      url: '/api/v1/receipts',
      payload: {
        code: 'PN-NO-WARRANTY-001',
        import_type: 'purchase',
        warehouse_id: warehouseId,
        lines: [{ variant_id: variantId, quantity: 1, cost_price: 100000 }],
      },
    })
    const receipt = JSON.parse(createRes.payload)
    const lineId = receipt.lines[0].id
    const serials = genSerials('SN-NOWTY', 1)
    await authedInject({
      method: 'PATCH',
      url: `/api/v1/receipts/${receipt.id}/complete`,
      payload: { lines: [{ line_id: lineId, serials }] },
    })

    const created = await app.db('serial_numbers').where({ serial_no: serials[0] }).first()
    expect(created.manufacturer_warranty_end).toBeNull()
  })

  // Trước đây findAll() thiếu .clearSelect() trước .count() — Postgres lỗi 500 "column
  // must appear in GROUP BY" mỗi khi gọi GET /receipts (phát hiện qua browser smoke test,
  // không phải unit test, vì trước đó CHƯA có test nào gọi list — chỉ test :id).
  it('GET / (list) trả về 200 kèm total, không lỗi GROUP BY khi có nhiều receipt', async () => {
    await authedInject({
      method: 'POST',
      url: '/api/v1/receipts',
      payload: {
        code: 'PN-LIST-001',
        import_type: 'purchase',
        warehouse_id: warehouseId,
        lines: [{ variant_id: variantId, quantity: 1, cost_price: 10000 }],
      },
    })
    const res = await authedInject({ method: 'GET', url: '/api/v1/receipts' })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(body.total).toBeGreaterThan(0)
    expect(Array.isArray(body.data)).toBe(true)
  })

  it('thiếu serial cho dòng storable → 400, không tạo serial_numbers nào', async () => {
    const app = await getApp()
    const createRes = await authedInject({
      method: 'POST',
      url: '/api/v1/receipts',
      payload: {
        code: 'PN-TEST-005',
        import_type: 'purchase',
        warehouse_id: warehouseId,
        lines: [{ variant_id: variantId, quantity: 5, cost_price: 50000 }],
      },
    })
    const receipt = JSON.parse(createRes.payload)

    // Không truyền body lines — thiếu serial cho dòng storable
    const completeRes = await authedInject({ method: 'PATCH', url: `/api/v1/receipts/${receipt.id}/complete` })
    expect(completeRes.statusCode).toBe(400)

    const inventory = await app
      .db('inventory')
      .where({ variant_id: variantId, warehouse_id: warehouseId })
      .first()
    expect(inventory).toBeUndefined()   // validate fail trước transaction — không có gì được ghi
  })

  it('số serial không khớp quantity → 400', async () => {
    const createRes = await authedInject({
      method: 'POST',
      url: '/api/v1/receipts',
      payload: {
        code: 'PN-TEST-006',
        import_type: 'purchase',
        warehouse_id: warehouseId,
        lines: [{ variant_id: variantId, quantity: 5, cost_price: 50000 }],
      },
    })
    const receipt = JSON.parse(createRes.payload)
    const lineId = receipt.lines[0].id

    const completeRes = await authedInject({
      method: 'PATCH',
      url: `/api/v1/receipts/${receipt.id}/complete`,
      payload: { lines: [{ line_id: lineId, serials: genSerials('SN-X', 3) }] },   // chỉ 3, cần 5
    })
    expect(completeRes.statusCode).toBe(400)
  })

  it('serial trùng nhau trong cùng request → 400 (không phải lỗi 500 từ unique constraint)', async () => {
    const createRes = await authedInject({
      method: 'POST',
      url: '/api/v1/receipts',
      payload: {
        code: 'PN-TEST-009',
        import_type: 'purchase',
        warehouse_id: warehouseId,
        lines: [{ variant_id: variantId, quantity: 2, cost_price: 50000 }],
      },
    })
    const receipt = JSON.parse(createRes.payload)
    const lineId = receipt.lines[0].id

    const completeRes = await authedInject({
      method: 'PATCH',
      url: `/api/v1/receipts/${receipt.id}/complete`,
      payload: { lines: [{ line_id: lineId, serials: ['SN-DUP', 'SN-DUP'] }] },
    })
    expect(completeRes.statusCode).toBe(400)
  })

  it('complete consumable (không storable) từ draft thành công — không cần serial', async () => {
    const app = await getApp()
    const consumableVariant = await app.db('variants').join('products', 'products.id', 'variants.product_id').where('products.product_type', 'consumable').first()
    if (!consumableVariant) return
    const createRes = await authedInject({
      method: 'POST',
      url: '/api/v1/receipts',
      payload: {
        code: 'PN-CONSM-001',
        import_type: 'purchase',
        warehouse_id: warehouseId,
        lines: [{ variant_id: consumableVariant.id, quantity: 5, cost_price: 50000 }],
      },
    })
    const receipt = JSON.parse(createRes.payload)
    expect(receipt.status).toBe('draft')
    const completeRes = await authedInject({ method: 'PATCH', url: `/api/v1/receipts/${receipt.id}/complete` })
    expect(completeRes.statusCode).toBe(200)
    expect(JSON.parse(completeRes.payload).status).toBe('completed')
  })

  // Test này bảo vệ công thức avg_cost ở CLAUDE.md mục 16 — dễ bị code sau sửa sai
  // (ví dụ quên trừ đi qty cũ trước khi cộng, hoặc tính sai thứ tự nhân/chia).
  it('avg_cost tính đúng khi nhập 2 lần với giá khác nhau', async () => {
    const app = await getApp()

    async function completeReceipt(code: string, quantity: number, cost_price: number, serialPrefix: string) {
      const created = JSON.parse(
        (
          await authedInject({
            method: 'POST',
            url: '/api/v1/receipts',
            payload: {
              code,
              import_type: 'purchase',
              warehouse_id: warehouseId,
              lines: [{ variant_id: variantId, quantity, cost_price }],
            },
          })
        ).payload,
      )
      const lineId = created.lines[0].id
      await authedInject({
        method: 'PATCH',
        url: `/api/v1/receipts/${created.id}/complete`,
        payload: { lines: [{ line_id: lineId, serials: genSerials(serialPrefix, quantity) }] },
      })
    }

    await completeReceipt('PN-A', 10, 100_000, 'SN-A')
    await completeReceipt('PN-B', 10, 200_000, 'SN-B')

    // avg_cost mới = (10*100,000 + 10*200,000) / 20 = 150,000
    const inventory = await app
      .db('inventory')
      .where({ variant_id: variantId, warehouse_id: warehouseId })
      .first()
    expect(inventory.qty_on_hand).toBe(20)
    expect(Number(inventory.avg_cost)).toBe(150_000)

    const allSerials = await app.db('serial_numbers').where({ variant_id: variantId })
    expect(allSerials).toHaveLength(20)
  })

  it('huỷ phiếu draft thành công, nhưng không huỷ được phiếu đã completed', async () => {
    const created = JSON.parse(
      (
        await authedInject({
          method: 'POST',
          url: '/api/v1/receipts',
          payload: {
            code: 'PN-TEST-004',
            import_type: 'purchase',
            warehouse_id: warehouseId,
            lines: [{ variant_id: variantId, quantity: 5, cost_price: 50000 }],
          },
        })
      ).payload,
    )

    const cancelRes = await authedInject({ method: 'PATCH', url: `/api/v1/receipts/${created.id}/cancel` })
    expect(JSON.parse(cancelRes.payload).status).toBe('cancelled')

    const cancelAgainRes = await authedInject({ method: 'PATCH', url: `/api/v1/receipts/${created.id}/cancel` })
    expect(cancelAgainRes.statusCode).toBe(400)
  })

  it('người KHÔNG phải chủ phiếu và KHÔNG có quyền approve → không huỷ được (403)', async () => {
    const created = JSON.parse(
      (
        await authedInject({
          method: 'POST',
          url: '/api/v1/receipts',
          payload: {
            code: 'PN-TEST-007',
            import_type: 'purchase',
            warehouse_id: warehouseId,
            lines: [{ variant_id: variantId, quantity: 5, cost_price: 50000 }],
          },
        })
      ).payload,
    )

    // Sale không có quyền receipt.approve (xem seed role_permissions) và không phải người tạo
    await createUserWithRole('Sale', 'sale@test.local', 'Test@123')
    const saleToken = await loginAs('sale@test.local', 'Test@123')

    const app = await getApp()
    const cancelRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/receipts/${created.id}/cancel`,
      headers: { authorization: `Bearer ${saleToken}` },
    })
    expect(cancelRes.statusCode).toBe(403)
  })

  it('người KHÔNG phải chủ phiếu nhưng CÓ quyền approve (Manager) → huỷ được', async () => {
    const created = JSON.parse(
      (
        await authedInject({
          method: 'POST',
          url: '/api/v1/receipts',
          payload: {
            code: 'PN-TEST-008',
            import_type: 'purchase',
            warehouse_id: warehouseId,
            lines: [{ variant_id: variantId, quantity: 5, cost_price: 50000 }],
          },
        })
      ).payload,
    )

    await createUserWithRole('Manager', 'manager@test.local', 'Test@123')
    const managerToken = await loginAs('manager@test.local', 'Test@123')

    const app = await getApp()
    const cancelRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/receipts/${created.id}/cancel`,
      headers: { authorization: `Bearer ${managerToken}` },
    })
    expect(cancelRes.statusCode).toBe(200)
    expect(JSON.parse(cancelRes.payload).status).toBe('cancelled')
  })

  describe('import_type=adjustment liên kết Stocktake Result', () => {
    async function createStocktakeResult() {
      const app = await getApp()
      const admin = await app.db('users').where({ email: 'admin@test.local' }).first()
      const [stocktake] = await app
        .db('stocktakes')
        .insert({ code: 'ST-ADJ-001', warehouse_id: warehouseId, status: 'completed', created_by: admin.id })
        .returning('*')
      const [result] = await app
        .db('stocktake_results')
        .insert({ stocktake_id: stocktake.id, total_sku: 1, matched: 0, shortage: 0, surplus: 1 })
        .returning('*')
      return result
    }

    it('thiếu ref_document_type/ref_document_id → 400', async () => {
      const res = await authedInject({
        method: 'POST',
        url: '/api/v1/receipts',
        payload: {
          code: 'PN-ADJ-001',
          import_type: 'adjustment',
          warehouse_id: warehouseId,
          lines: [{ variant_id: variantId, quantity: 2, cost_price: 0 }],
        },
      })
      expect(res.statusCode).toBe(400)
    })

    it('ref_document_id tham chiếu tới stocktake_result không tồn tại → 400', async () => {
      const res = await authedInject({
        method: 'POST',
        url: '/api/v1/receipts',
        payload: {
          code: 'PN-ADJ-002',
          import_type: 'adjustment',
          warehouse_id: warehouseId,
          ref_document_type: 'stocktake_result',
          ref_document_id: '00000000-0000-0000-0000-000000000000',
          lines: [{ variant_id: variantId, quantity: 2, cost_price: 0 }],
        },
      })
      expect(res.statusCode).toBe(400)
    })

    it('ref_document_type/ref_document_id hợp lệ → tạo thành công', async () => {
      const result = await createStocktakeResult()
      const res = await authedInject({
        method: 'POST',
        url: '/api/v1/receipts',
        payload: {
          code: 'PN-ADJ-003',
          import_type: 'adjustment',
          warehouse_id: warehouseId,
          ref_document_type: 'stocktake_result',
          ref_document_id: result.id,
          lines: [{ variant_id: variantId, quantity: 2, cost_price: 0 }],
        },
      })
      expect(res.statusCode).toBe(201)
      const receipt = JSON.parse(res.payload)
      expect(receipt.ref_document_type).toBe('stocktake_result')
      expect(receipt.ref_document_id).toBe(result.id)
    })
  })

  describe('import_type không hardcode — đọc trực tiếp từ bảng import_types', () => {
    it('import_type không tồn tại trong import_types → 400', async () => {
      const res = await authedInject({
        method: 'POST',
        url: '/api/v1/receipts',
        payload: {
          code: 'PN-BADTYPE-001',
          import_type: 'khong_ton_tai',
          warehouse_id: warehouseId,
          lines: [{ variant_id: variantId, quantity: 1, cost_price: 1000 }],
        },
      })
      expect(res.statusCode).toBe(400)
    })

    it('import_type tự thêm qua Settings (chưa từng có trong code) dùng được ngay, không cần sửa code', async () => {
      const app = await getApp()
      await app
        .db('import_types')
        .insert({ key: 'purchase_urgent', label: 'Mua hàng gấp', requires_company: 'none', requires_ref_document: 'none' })

      const res = await authedInject({
        method: 'POST',
        url: '/api/v1/receipts',
        payload: {
          code: 'PN-CUSTOM-001',
          import_type: 'purchase_urgent',
          warehouse_id: warehouseId,
          lines: [{ variant_id: variantId, quantity: 1, cost_price: 1000 }],
        },
      })
      expect(res.statusCode).toBe(201)
    })

    it('import_type bị tắt (is_active=false) → 400 dù key có tồn tại', async () => {
      const app = await getApp()
      await app
        .db('import_types')
        .insert({ key: 'purchase_disabled', label: 'Ngừng dùng', requires_company: 'none', requires_ref_document: 'none', is_active: false })

      const res = await authedInject({
        method: 'POST',
        url: '/api/v1/receipts',
        payload: {
          code: 'PN-DISABLED-001',
          import_type: 'purchase_disabled',
          warehouse_id: warehouseId,
          lines: [{ variant_id: variantId, quantity: 1, cost_price: 1000 }],
        },
      })
      expect(res.statusCode).toBe(400)
    })
  })

  describe('import_type=return_in liên kết Quotation', () => {
    async function createQuotation() {
      const app = await getApp()
      const admin = await app.db('users').where({ email: 'admin@test.local' }).first()
      const [company] = await app.db('companies').insert({ code: 'CUST-RETURN', name: 'KH trả hàng' }).returning('*')
      const [quotation] = await app
        .db('quotations')
        .insert({ code: 'QU-RETURN-001', company_id: company.id, created_by: admin.id })
        .returning('*')
      return quotation
    }

    it('thiếu ref_document_type/ref_document_id → 400', async () => {
      const res = await authedInject({
        method: 'POST',
        url: '/api/v1/receipts',
        payload: {
          code: 'PN-RETURN-001',
          import_type: 'return_in',
          warehouse_id: warehouseId,
          lines: [{ variant_id: variantId, quantity: 1, cost_price: 0 }],
        },
      })
      expect(res.statusCode).toBe(400)
    })

    it('ref_document_type sai (vd "stocktake_result" thay vì "quotation") → 400', async () => {
      const quotation = await createQuotation()
      const res = await authedInject({
        method: 'POST',
        url: '/api/v1/receipts',
        payload: {
          code: 'PN-RETURN-002',
          import_type: 'return_in',
          warehouse_id: warehouseId,
          ref_document_type: 'stocktake_result',
          ref_document_id: quotation.id,
          lines: [{ variant_id: variantId, quantity: 1, cost_price: 0 }],
        },
      })
      expect(res.statusCode).toBe(400)
    })

    it('ref_document_id tham chiếu tới quotation không tồn tại → 400', async () => {
      const res = await authedInject({
        method: 'POST',
        url: '/api/v1/receipts',
        payload: {
          code: 'PN-RETURN-003',
          import_type: 'return_in',
          warehouse_id: warehouseId,
          ref_document_type: 'quotation',
          ref_document_id: '00000000-0000-0000-0000-000000000000',
          lines: [{ variant_id: variantId, quantity: 1, cost_price: 0 }],
        },
      })
      expect(res.statusCode).toBe(400)
    })

    it('ref_document_type/ref_document_id hợp lệ → tạo thành công', async () => {
      const quotation = await createQuotation()
      const res = await authedInject({
        method: 'POST',
        url: '/api/v1/receipts',
        payload: {
          code: 'PN-RETURN-004',
          import_type: 'return_in',
          warehouse_id: warehouseId,
          ref_document_type: 'quotation',
          ref_document_id: quotation.id,
          lines: [{ variant_id: variantId, quantity: 1, cost_price: 0 }],
        },
      })
      expect(res.statusCode).toBe(201)
      const receipt = JSON.parse(res.payload)
      expect(receipt.ref_document_type).toBe('quotation')
      expect(receipt.ref_document_id).toBe(quotation.id)
    })
  })

  describe('receipt_lines.qty_remaining (FIFO) — set lúc Complete', () => {
    it('complete set qty_remaining = quantity cho dòng hàng (1 receipt_line = 1 lô)', async () => {
      const app = await getApp()
      const createRes = await authedInject({
        method: 'POST',
        url: '/api/v1/receipts',
        payload: {
          code: 'PN-BATCH-001',
          import_type: 'purchase',
          warehouse_id: warehouseId,
          lines: [{ variant_id: variantId, quantity: 3, cost_price: 75000 }],
        },
      })
      const receipt = JSON.parse(createRes.payload)
      const lineId = receipt.lines[0].id

      // Trước Complete: qty_remaining phải là NULL — hàng chưa thật vào kho.
      const beforeComplete = await app.db('receipt_lines').where({ id: lineId }).first()
      expect(beforeComplete.qty_remaining).toBeNull()

      const serials = genSerials('SN-BATCH', 3)
      await authedInject({
        method: 'PATCH',
        url: `/api/v1/receipts/${receipt.id}/complete`,
        payload: { lines: [{ line_id: lineId, serials }] },
      })

      const line = await app.db('receipt_lines').where({ id: lineId }).first()
      expect(line.quantity).toBe(3)
      expect(line.qty_remaining).toBe(3)
      expect(Number(line.cost_price)).toBe(75000)

      const createdSerials = await app.db('serial_numbers').whereIn('serial_no', serials)
      expect(createdSerials.every((s) => s.receipt_line_id === lineId)).toBe(true)
    })
  })

  describe('po_id/po_line_id — Receipt nhận hàng theo Purchase Order', () => {
    let companyId: string

    beforeEach(async () => {
      const app = await getApp()
      const [company] = await app.db('companies').insert({ code: 'PO-RCPT-NCC', name: 'NCC PO Receipt' }).returning('*')
      companyId = company.id
    })

    async function createConfirmedPO(quantity: number) {
      const createRes = await authedInject({
        method: 'POST',
        url: '/api/v1/purchase-orders',
        payload: {
          code: 'PO-RCPT-001',
          company_id: companyId,
          lines: [{ variant_id: variantId, quantity, unit_price: 900000 }],
        },
      })
      const po = JSON.parse(createRes.payload)
      await authedInject({ method: 'PATCH', url: `/api/v1/purchase-orders/${po.id}/confirm` })
      return { po, poLineId: po.lines[0].id }
    }

    it('tạo Receipt link po_id/po_line_id thành công khi PO đã Confirmed', async () => {
      const { po, poLineId } = await createConfirmedPO(10)

      const res = await authedInject({
        method: 'POST',
        url: '/api/v1/receipts',
        payload: {
          code: 'PN-PO-OK-001',
          import_type: 'purchase',
          warehouse_id: warehouseId,
          po_id: po.id,
          lines: [{ variant_id: variantId, quantity: 6, cost_price: 950000, po_line_id: poLineId }],
        },
      })
      expect(res.statusCode).toBe(201)
      const receipt = JSON.parse(res.payload)
      expect(receipt.po_id).toBe(po.id)
      expect(receipt.lines[0].po_line_id).toBe(poLineId)

      const getPoRes = await authedInject({ method: 'GET', url: `/api/v1/purchase-orders/${po.id}` })
      const poDetail = JSON.parse(getPoRes.payload)
      expect(poDetail.lines[0].pending_qty).toBe(6)
      expect(poDetail.lines[0].remaining_qty).toBe(4)
    })

    it('400 khi PO chưa Confirmed (còn Draft)', async () => {
      const createPoRes = await authedInject({
        method: 'POST',
        url: '/api/v1/purchase-orders',
        payload: {
          code: 'PO-RCPT-DRAFT',
          company_id: companyId,
          lines: [{ variant_id: variantId, quantity: 10, unit_price: 900000 }],
        },
      })
      const po = JSON.parse(createPoRes.payload)

      const res = await authedInject({
        method: 'POST',
        url: '/api/v1/receipts',
        payload: {
          code: 'PN-PO-DRAFT-001',
          import_type: 'purchase',
          warehouse_id: warehouseId,
          po_id: po.id,
          lines: [{ variant_id: variantId, quantity: 5, cost_price: 950000, po_line_id: po.lines[0].id }],
        },
      })
      expect(res.statusCode).toBe(400)
    })

    it('400 khi variant_id của dòng receipt không khớp với po_line', async () => {
      const { po, poLineId } = await createConfirmedPO(10)

      const app = await getApp()
      const [otherProduct] = await app
        .db('products')
        .insert({ code: 'PO-RCPT-OTHER', name: 'Other', product_type: 'storable' })
        .returning('*')
      const [otherVariant] = await app
        .db('variants')
        .insert({ product_id: otherProduct.id, sku: 'PO-RCPT-OTHER-01', name: 'Other 01', unit: 'Cái' })
        .returning('*')

      const res = await authedInject({
        method: 'POST',
        url: '/api/v1/receipts',
        payload: {
          code: 'PN-PO-MISMATCH-001',
          import_type: 'purchase',
          warehouse_id: warehouseId,
          po_id: po.id,
          lines: [{ variant_id: otherVariant.id, quantity: 5, cost_price: 950000, po_line_id: poLineId }],
        },
      })
      expect(res.statusCode).toBe(400)
    })

    it('400 khi quantity vượt remaining_qty của po_line', async () => {
      const { po, poLineId } = await createConfirmedPO(10)

      const res = await authedInject({
        method: 'POST',
        url: '/api/v1/receipts',
        payload: {
          code: 'PN-PO-OVER-001',
          import_type: 'purchase',
          warehouse_id: warehouseId,
          po_id: po.id,
          lines: [{ variant_id: variantId, quantity: 11, cost_price: 950000, po_line_id: poLineId }],
        },
      })
      expect(res.statusCode).toBe(400)
    })

    it('Receipt bị cancelled không tính vào remaining_qty — nhận lại đủ số lượng', async () => {
      const { po, poLineId } = await createConfirmedPO(10)

      const firstRes = await authedInject({
        method: 'POST',
        url: '/api/v1/receipts',
        payload: {
          code: 'PN-PO-CANCEL-001',
          import_type: 'purchase',
          warehouse_id: warehouseId,
          po_id: po.id,
          lines: [{ variant_id: variantId, quantity: 10, cost_price: 950000, po_line_id: poLineId }],
        },
      })
      const firstReceipt = JSON.parse(firstRes.payload)
      await authedInject({ method: 'PATCH', url: `/api/v1/receipts/${firstReceipt.id}/cancel` })

      const secondRes = await authedInject({
        method: 'POST',
        url: '/api/v1/receipts',
        payload: {
          code: 'PN-PO-CANCEL-002',
          import_type: 'purchase',
          warehouse_id: warehouseId,
          po_id: po.id,
          lines: [{ variant_id: variantId, quantity: 10, cost_price: 950000, po_line_id: poLineId }],
        },
      })
      expect(secondRes.statusCode).toBe(201)
    })
  })
})
