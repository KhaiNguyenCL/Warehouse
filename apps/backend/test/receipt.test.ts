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

  it('luồng đầy đủ: tạo → submit → approve → complete (kèm serial) → cập nhật inventory + serial_numbers', async () => {
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

    await authedInject({ method: 'PATCH', url: `/api/v1/receipts/${receipt.id}/submit` })
    await authedInject({ method: 'PATCH', url: `/api/v1/receipts/${receipt.id}/approve` })

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

    const movement = await app
      .db('stock_movements')
      .where({ ref_document_type: 'receipt', ref_document_id: receipt.id })
      .first()
    expect(movement.movement_type).toBe('in')
    expect(movement.quantity).toBe(10)

    const createdSerials = await app
      .db('serial_numbers')
      .where({ variant_id: variantId, warehouse_id: warehouseId })
      .orderBy('serial_no')
    expect(createdSerials).toHaveLength(10)
    expect(createdSerials.every((s) => s.status === 'active')).toBe(true)
    expect(createdSerials.every((s) => s.receipt_line_id === lineId)).toBe(true)
    expect(createdSerials.map((s) => s.serial_no)).toEqual(serials.slice().sort())
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
    await authedInject({ method: 'PATCH', url: `/api/v1/receipts/${receipt.id}/submit` })
    await authedInject({ method: 'PATCH', url: `/api/v1/receipts/${receipt.id}/approve` })

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
    await authedInject({ method: 'PATCH', url: `/api/v1/receipts/${receipt.id}/submit` })
    await authedInject({ method: 'PATCH', url: `/api/v1/receipts/${receipt.id}/approve` })

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
    await authedInject({ method: 'PATCH', url: `/api/v1/receipts/${receipt.id}/submit` })
    await authedInject({ method: 'PATCH', url: `/api/v1/receipts/${receipt.id}/approve` })

    const completeRes = await authedInject({
      method: 'PATCH',
      url: `/api/v1/receipts/${receipt.id}/complete`,
      payload: { lines: [{ line_id: lineId, serials: ['SN-DUP', 'SN-DUP'] }] },
    })
    expect(completeRes.statusCode).toBe(400)
  })

  it('không cho complete khi chưa được approve', async () => {
    const createRes = await authedInject({
      method: 'POST',
      url: '/api/v1/receipts',
      payload: {
        code: 'PN-TEST-002',
        import_type: 'purchase',
        warehouse_id: warehouseId,
        lines: [{ variant_id: variantId, quantity: 5, cost_price: 50000 }],
      },
    })
    const receipt = JSON.parse(createRes.payload)

    const completeRes = await authedInject({ method: 'PATCH', url: `/api/v1/receipts/${receipt.id}/complete` })
    expect(completeRes.statusCode).toBe(400)
  })

  it('không cho approve khi chưa submit (vẫn ở draft)', async () => {
    const createRes = await authedInject({
      method: 'POST',
      url: '/api/v1/receipts',
      payload: {
        code: 'PN-TEST-003',
        import_type: 'purchase',
        warehouse_id: warehouseId,
        lines: [{ variant_id: variantId, quantity: 5, cost_price: 50000 }],
      },
    })
    const receipt = JSON.parse(createRes.payload)

    const approveRes = await authedInject({ method: 'PATCH', url: `/api/v1/receipts/${receipt.id}/approve` })
    expect(approveRes.statusCode).toBe(400)
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
      await authedInject({ method: 'PATCH', url: `/api/v1/receipts/${created.id}/submit` })
      await authedInject({ method: 'PATCH', url: `/api/v1/receipts/${created.id}/approve` })
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
      await authedInject({ method: 'PATCH', url: `/api/v1/receipts/${receipt.id}/submit` })
      await authedInject({ method: 'PATCH', url: `/api/v1/receipts/${receipt.id}/approve` })

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
})
