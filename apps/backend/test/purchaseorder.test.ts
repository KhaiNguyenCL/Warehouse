import { describe, it, expect, beforeEach } from 'vitest'
import { getApp, createUserWithRole, loginAs } from './helpers'

describe('PurchaseOrder', () => {
  let token: string
  let companyId: string
  let variantId: string

  beforeEach(async () => {
    await createUserWithRole('Admin', 'admin@test.local', 'Test@123')
    token = await loginAs('admin@test.local', 'Test@123')

    const app = await getApp()
    const [company] = await app.db('companies').insert({ code: 'PO-NCC-1', name: 'NCC Test' }).returning('*')
    companyId = company.id

    const [product] = await app
      .db('products')
      .insert({ code: 'PO-SW', name: 'PO Switch', product_type: 'storable' })
      .returning('*')
    const [variant] = await app
      .db('variants')
      .insert({ product_id: product.id, sku: 'PO-SW-01', name: 'PO Switch 01', unit: 'Cái' })
      .returning('*')
    variantId = variant.id
  })

  async function authedInject(
    opts: Parameters<Awaited<ReturnType<typeof getApp>>['inject']>[0],
    overrideToken?: string,
  ) {
    const app = await getApp()
    return app.inject({
      ...opts,
      headers: { authorization: `Bearer ${overrideToken ?? token}`, ...(opts.headers as object) },
    })
  }

  function basePayload(overrides: Record<string, unknown> = {}) {
    return {
      code: 'PO-TEST-001',
      company_id: companyId,
      lines: [{ variant_id: variantId, quantity: 10, unit_price: 1000000, manufacturer_warranty_months: 24 }],
      ...overrides,
    }
  }

  it('tạo PO thành công ở trạng thái draft, lưu đúng field từng dòng', async () => {
    const res = await authedInject({ method: 'POST', url: '/api/v1/purchase-orders', payload: basePayload() })
    expect(res.statusCode).toBe(201)
    const po = JSON.parse(res.payload)
    expect(po.status).toBe('draft')
    expect(po.lines).toHaveLength(1)
    expect(po.lines[0].variant_id).toBe(variantId)
    expect(Number(po.lines[0].quantity)).toBe(10)
    expect(Number(po.lines[0].unit_price)).toBe(1000000)
    expect(po.lines[0].manufacturer_warranty_months).toBe(24)
  })

  it('GET /:id trả về remaining_qty = quantity khi chưa có Receipt nào', async () => {
    const createRes = await authedInject({ method: 'POST', url: '/api/v1/purchase-orders', payload: basePayload() })
    const po = JSON.parse(createRes.payload)

    const getRes = await authedInject({ method: 'GET', url: `/api/v1/purchase-orders/${po.id}` })
    const detail = JSON.parse(getRes.payload)
    expect(detail.lines[0].received_qty).toBe(0)
    expect(detail.lines[0].pending_qty).toBe(0)
    expect(detail.lines[0].remaining_qty).toBe(10)
  })

  it('sửa được lines khi còn Draft (full replace)', async () => {
    const createRes = await authedInject({ method: 'POST', url: '/api/v1/purchase-orders', payload: basePayload() })
    const po = JSON.parse(createRes.payload)

    const updateRes = await authedInject({
      method: 'PATCH',
      url: `/api/v1/purchase-orders/${po.id}`,
      payload: { lines: [{ variant_id: variantId, quantity: 20, unit_price: 900000 }] },
    })
    expect(updateRes.statusCode).toBe(200)
    const updated = JSON.parse(updateRes.payload)
    expect(updated.lines).toHaveLength(1)
    expect(Number(updated.lines[0].quantity)).toBe(20)
  })

  it('confirm: draft → confirmed', async () => {
    const createRes = await authedInject({ method: 'POST', url: '/api/v1/purchase-orders', payload: basePayload() })
    const po = JSON.parse(createRes.payload)

    const confirmRes = await authedInject({ method: 'PATCH', url: `/api/v1/purchase-orders/${po.id}/confirm` })
    expect(confirmRes.statusCode).toBe(200)
    expect(JSON.parse(confirmRes.payload).status).toBe('confirmed')
  })

  it('sửa lines bị chặn 400 sau khi đã Confirm', async () => {
    const createRes = await authedInject({ method: 'POST', url: '/api/v1/purchase-orders', payload: basePayload() })
    const po = JSON.parse(createRes.payload)
    await authedInject({ method: 'PATCH', url: `/api/v1/purchase-orders/${po.id}/confirm` })

    const updateRes = await authedInject({
      method: 'PATCH',
      url: `/api/v1/purchase-orders/${po.id}`,
      payload: { lines: [{ variant_id: variantId, quantity: 5, unit_price: 100 }] },
    })
    expect(updateRes.statusCode).toBe(400)
  })

  it('unconfirm: confirmed → draft khi chưa có Receipt nào liên quan', async () => {
    const createRes = await authedInject({ method: 'POST', url: '/api/v1/purchase-orders', payload: basePayload() })
    const po = JSON.parse(createRes.payload)
    await authedInject({ method: 'PATCH', url: `/api/v1/purchase-orders/${po.id}/confirm` })

    const unconfirmRes = await authedInject({ method: 'PATCH', url: `/api/v1/purchase-orders/${po.id}/unconfirm` })
    expect(unconfirmRes.statusCode).toBe(200)
    expect(JSON.parse(unconfirmRes.payload).status).toBe('draft')
  })

  it('unconfirm 400 khi đã có Receipt liên quan (đang chờ xử lý)', async () => {
    const app = await getApp()
    const createRes = await authedInject({ method: 'POST', url: '/api/v1/purchase-orders', payload: basePayload() })
    const po = JSON.parse(createRes.payload)
    await authedInject({ method: 'PATCH', url: `/api/v1/purchase-orders/${po.id}/confirm` })

    const warehouse = await app.db('warehouses').where({ code: 'WH-DEMO' }).first()
    await authedInject({
      method: 'POST',
      url: '/api/v1/receipts',
      payload: {
        code: 'PN-PO-001',
        import_type: 'purchase',
        warehouse_id: warehouse.id,
        po_id: po.id,
        lines: [{ variant_id: variantId, quantity: 4, cost_price: 950000, po_line_id: po.lines[0].id }],
      },
    })

    const unconfirmRes = await authedInject({ method: 'PATCH', url: `/api/v1/purchase-orders/${po.id}/unconfirm` })
    expect(unconfirmRes.statusCode).toBe(400)
  })

  it('cancel khi Draft: chủ PO huỷ thành công', async () => {
    const createRes = await authedInject({ method: 'POST', url: '/api/v1/purchase-orders', payload: basePayload() })
    const po = JSON.parse(createRes.payload)

    const cancelRes = await authedInject({ method: 'PATCH', url: `/api/v1/purchase-orders/${po.id}/cancel` })
    expect(cancelRes.statusCode).toBe(200)
    expect(JSON.parse(cancelRes.payload).status).toBe('cancelled')
  })

  it('cancel: người không phải chủ và không có quyền purchase_order.confirm bị chặn 403', async () => {
    const createRes = await authedInject({ method: 'POST', url: '/api/v1/purchase-orders', payload: basePayload() })
    const po = JSON.parse(createRes.payload)

    await createUserWithRole('Sale', 'sale@test.local', 'Test@123')
    const saleToken = await loginAs('sale@test.local', 'Test@123')

    const cancelRes = await authedInject(
      { method: 'PATCH', url: `/api/v1/purchase-orders/${po.id}/cancel` },
      saleToken,
    )
    expect(cancelRes.statusCode).toBe(403)
  })

  it('cancel: người không phải chủ nhưng có quyền purchase_order.confirm (Manager) huỷ được', async () => {
    const createRes = await authedInject({ method: 'POST', url: '/api/v1/purchase-orders', payload: basePayload() })
    const po = JSON.parse(createRes.payload)

    await createUserWithRole('Manager', 'manager@test.local', 'Test@123')
    const managerToken = await loginAs('manager@test.local', 'Test@123')

    const cancelRes = await authedInject(
      { method: 'PATCH', url: `/api/v1/purchase-orders/${po.id}/cancel` },
      managerToken,
    )
    expect(cancelRes.statusCode).toBe(200)
  })

  it('cancel 400 khi PO Confirmed đã có Receipt liên quan', async () => {
    const app = await getApp()
    const createRes = await authedInject({ method: 'POST', url: '/api/v1/purchase-orders', payload: basePayload() })
    const po = JSON.parse(createRes.payload)
    await authedInject({ method: 'PATCH', url: `/api/v1/purchase-orders/${po.id}/confirm` })

    const warehouse = await app.db('warehouses').where({ code: 'WH-DEMO' }).first()
    await authedInject({
      method: 'POST',
      url: '/api/v1/receipts',
      payload: {
        code: 'PN-PO-002',
        import_type: 'purchase',
        warehouse_id: warehouse.id,
        po_id: po.id,
        lines: [{ variant_id: variantId, quantity: 4, cost_price: 950000, po_line_id: po.lines[0].id }],
      },
    })

    const cancelRes = await authedInject({ method: 'PATCH', url: `/api/v1/purchase-orders/${po.id}/cancel` })
    expect(cancelRes.statusCode).toBe(400)
  })

  it('list trả về danh sách PO kèm company_name', async () => {
    await authedInject({ method: 'POST', url: '/api/v1/purchase-orders', payload: basePayload() })
    const listRes = await authedInject({ method: 'GET', url: '/api/v1/purchase-orders' })
    expect(listRes.statusCode).toBe(200)
    const list = JSON.parse(listRes.payload)
    expect(list.data.length).toBeGreaterThan(0)
    expect(list.data[0].company_name).toBe('NCC Test')
  })

  describe('Custom field theo PO line (applies_to_po_line)', () => {
    let poLineFieldId: string
    let variantOnlyFieldId: string

    beforeEach(async () => {
      const poLineFieldRes = await authedInject({
        method: 'POST',
        url: '/api/v1/custom-fields',
        payload: {
          field_name: 'import_lot',
          field_label: 'Số lô nhập',
          field_type: 'text',
          object_type: 'variant',
          applies_to_po_line: true,
        },
      })
      poLineFieldId = JSON.parse(poLineFieldRes.payload).id

      const variantOnlyFieldRes = await authedInject({
        method: 'POST',
        url: '/api/v1/custom-fields',
        payload: { field_name: 'ram_size', field_label: 'RAM', field_type: 'text', object_type: 'variant' },
      })
      variantOnlyFieldId = JSON.parse(variantOnlyFieldRes.payload).id
    })

    it('tạo PO với custom_field_values cho field applies_to_po_line=true → lưu đúng theo line', async () => {
      const res = await authedInject({
        method: 'POST',
        url: '/api/v1/purchase-orders',
        payload: basePayload({
          lines: [
            {
              variant_id: variantId,
              quantity: 10,
              unit_price: 1000000,
              custom_field_values: [{ field_id: poLineFieldId, value: 'LOT-001' }],
            },
          ],
        }),
      })
      expect(res.statusCode).toBe(201)
      const po = JSON.parse(res.payload)
      expect(po.lines[0].custom_field_values).toHaveLength(1)
      expect(po.lines[0].custom_field_values[0].value).toBe('LOT-001')

      const getRes = await authedInject({ method: 'GET', url: `/api/v1/purchase-orders/${po.id}` })
      const detail = JSON.parse(getRes.payload)
      expect(detail.lines[0].custom_field_values[0].field_name).toBe('import_lot')
      expect(detail.lines[0].custom_field_values[0].value).toBe('LOT-001')
    })

    it('custom_field_values dùng field KHÔNG có applies_to_po_line=true → 400', async () => {
      const res = await authedInject({
        method: 'POST',
        url: '/api/v1/purchase-orders',
        payload: basePayload({
          lines: [
            {
              variant_id: variantId,
              quantity: 10,
              unit_price: 1000000,
              custom_field_values: [{ field_id: variantOnlyFieldId, value: '16GB' }],
            },
          ],
        }),
      })
      expect(res.statusCode).toBe(400)
    })

    it('sửa PO (replaceLines): giá trị custom field theo line cũ không lẫn qua dòng mới, set lại đúng giá trị mới', async () => {
      const createRes = await authedInject({
        method: 'POST',
        url: '/api/v1/purchase-orders',
        payload: basePayload({
          lines: [
            {
              variant_id: variantId,
              quantity: 10,
              unit_price: 1000000,
              custom_field_values: [{ field_id: poLineFieldId, value: 'LOT-001' }],
            },
          ],
        }),
      })
      const po = JSON.parse(createRes.payload)
      const oldLineId = po.lines[0].id

      const updateRes = await authedInject({
        method: 'PATCH',
        url: `/api/v1/purchase-orders/${po.id}`,
        payload: {
          lines: [
            {
              variant_id: variantId,
              quantity: 20,
              unit_price: 900000,
              custom_field_values: [{ field_id: poLineFieldId, value: 'LOT-002' }],
            },
          ],
        },
      })
      expect(updateRes.statusCode).toBe(200)
      const updated = JSON.parse(updateRes.payload)
      const newLineId = updated.lines[0].id
      expect(newLineId).not.toBe(oldLineId)
      expect(updated.lines[0].custom_field_values[0].value).toBe('LOT-002')

      const app = await getApp()
      const orphanedValues = await app
        .db('field_values')
        .where({ object_type: 'purchase_order_line', object_id: oldLineId })
      expect(orphanedValues).toHaveLength(0)
    })
  })
})
