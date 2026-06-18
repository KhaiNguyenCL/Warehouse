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
})
