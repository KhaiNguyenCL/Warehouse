import { describe, it, expect, beforeEach } from 'vitest'
import { getApp, createUserWithRole, loginAs } from './helpers'

describe('Quotation', () => {
  let token: string
  let adminUserId: string
  let warehouseId: string
  let companyId: string
  let variantId: string       // storable, dùng test trực tiếp (không qua DO)
  let consumableVariantId: string // dùng cho luồng DO end-to-end (không cần serial)
  let serviceVariantId: string
  let bundleVariantId: string
  let bundleItemVariantId: string

  beforeEach(async () => {
    const adminUser = await createUserWithRole('Admin', 'admin@test.local', 'Test@123')
    adminUserId = adminUser.id
    token = await loginAs('admin@test.local', 'Test@123')

    const app = await getApp()
    const [warehouse] = await app
      .db('warehouses')
      .insert({ code: 'WH-QUOTE-TEST', name: 'Kho test báo giá', type: 'physical' })
      .returning('*')
    warehouseId = warehouse.id

    const [company] = await app.db('companies').insert({ code: 'CUST-Q1', name: 'KH báo giá' }).returning('*')
    companyId = company.id

    const [storableProduct] = await app
      .db('products')
      .insert({ code: 'Q-SW', name: 'Q Switch', product_type: 'storable' })
      .returning('*')
    const [variant] = await app
      .db('variants')
      .insert({ product_id: storableProduct.id, sku: 'Q-SW-01', name: 'Q Switch 01', unit: 'Cái' })
      .returning('*')
    variantId = variant.id
    await app.db('inventory').insert({ variant_id: variantId, warehouse_id: warehouseId, qty_on_hand: 20, avg_cost: 100000 })

    const [consumableProduct] = await app
      .db('products')
      .insert({ code: 'Q-CABLE', name: 'Q Cable', product_type: 'consumable' })
      .returning('*')
    const [consumableVariant] = await app
      .db('variants')
      .insert({ product_id: consumableProduct.id, sku: 'Q-CABLE-01', name: 'Q Cable 01', unit: 'Mét' })
      .returning('*')
    consumableVariantId = consumableVariant.id
    await app.db('inventory').insert({ variant_id: consumableVariantId, warehouse_id: warehouseId, qty_on_hand: 50, avg_cost: 5000 })

    const [serviceProduct] = await app
      .db('products')
      .insert({ code: 'Q-SVC', name: 'Q Service', product_type: 'service' })
      .returning('*')
    const [serviceVariant] = await app
      .db('variants')
      .insert({ product_id: serviceProduct.id, sku: 'Q-SVC-01', name: 'Thi công lắp đặt', unit: 'Lần' })
      .returning('*')
    serviceVariantId = serviceVariant.id

    const [bundleProduct] = await app
      .db('products')
      .insert({ code: 'Q-BUNDLE', name: 'Q Bundle', product_type: 'bundle' })
      .returning('*')
    const [bundleVariant] = await app
      .db('variants')
      .insert({ product_id: bundleProduct.id, sku: 'Q-BUNDLE-01', name: 'Combo mạng', unit: 'Bộ' })
      .returning('*')
    bundleVariantId = bundleVariant.id
    bundleItemVariantId = variantId
    await app.db('bundle_items').insert({ bundle_variant_id: bundleVariantId, item_variant_id: bundleItemVariantId, quantity: 2 })
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
      code: 'BG-TEST-001',
      company_id: companyId,
      warehouse_id: warehouseId,
      sections: [
        {
          name: 'Thiết bị',
          line_items: [{ variant_id: variantId, quantity: 5, unit_price: 100000, vat_percent: 10 }],
        },
      ],
      ...overrides,
    }
  }

  it('tính đúng line_total/vat_amount/subtotal/grand_total theo công thức mục 16', async () => {
    const res = await authedInject({
      method: 'POST',
      url: '/api/v1/quotations',
      payload: basePayload({
        discount: 50000,
        sections: [
          {
            name: 'Thiết bị',
            line_items: [
              { variant_id: variantId, quantity: 5, unit_price: 100000, vat_percent: 10 }, // 500000 + 50000 vat
              { description: 'Dây cáp mạng', quantity: 10, unit_price: 20000, vat_percent: 0 }, // 200000 + 0
            ],
          },
        ],
      }),
    })
    expect(res.statusCode).toBe(201)
    const quotation = JSON.parse(res.payload)
    expect(Number(quotation.subtotal)).toBe(700000)
    expect(Number(quotation.vat_total)).toBe(50000)
    expect(Number(quotation.discount)).toBe(50000)
    expect(Number(quotation.grand_total)).toBe(700000 + 50000 - 50000)
  })

  it('dòng bundle hiển thị đúng 1 dòng duy nhất, không bị expand ra sản phẩm con', async () => {
    const res = await authedInject({
      method: 'POST',
      url: '/api/v1/quotations',
      payload: basePayload({
        sections: [
          { name: 'Combo', line_items: [{ bundle_id: bundleVariantId, quantity: 3, unit_price: 500000 }] },
        ],
      }),
    })
    expect(res.statusCode).toBe(201)
    const quotation = JSON.parse(res.payload)
    expect(quotation.sections).toHaveLength(1)
    expect(quotation.sections[0].line_items).toHaveLength(1)
    expect(quotation.sections[0].line_items[0].bundle_id).toBe(bundleVariantId)
  })

  it('dòng service luôn is_reserved=false dù client gửi is_reserved=true', async () => {
    const res = await authedInject({
      method: 'POST',
      url: '/api/v1/quotations',
      payload: basePayload({
        sections: [
          {
            name: 'Dịch vụ',
            line_items: [{ variant_id: serviceVariantId, quantity: 1, unit_price: 1000000, is_reserved: true }],
          },
        ],
      }),
    })
    expect(res.statusCode).toBe(201)
    const quotation = JSON.parse(res.payload)
    expect(quotation.sections[0].line_items[0].is_reserved).toBe(false)
  })

  it('dòng tự do (không variant/bundle) luôn is_reserved=false', async () => {
    const res = await authedInject({
      method: 'POST',
      url: '/api/v1/quotations',
      payload: basePayload({
        sections: [
          { name: 'Khác', line_items: [{ description: 'Phí vận chuyển', quantity: 1, unit_price: 200000 }] },
        ],
      }),
    })
    expect(res.statusCode).toBe(201)
    expect(JSON.parse(res.payload).sections[0].line_items[0].is_reserved).toBe(false)
  })

  it('confirm thành công: tạo reserved_items + tăng qty_reserved đúng số lượng', async () => {
    const createRes = await authedInject({ method: 'POST', url: '/api/v1/quotations', payload: basePayload() })
    const quotation = JSON.parse(createRes.payload)

    const confirmRes = await authedInject({ method: 'PATCH', url: `/api/v1/quotations/${quotation.id}/confirm` })
    expect(confirmRes.statusCode).toBe(200)
    expect(JSON.parse(confirmRes.payload).status).toBe('confirmed')

    const app = await getApp()
    const inventory = await app.db('inventory').where({ variant_id: variantId, warehouse_id: warehouseId }).first()
    expect(inventory.qty_reserved).toBe(5)

    const reserved = await app.db('reserved_items').where({ source_type: 'quotation', source_id: quotation.id })
    expect(reserved).toHaveLength(1)
    expect(reserved[0].variant_id).toBe(variantId)
    expect(reserved[0].quantity).toBe(5)
  })

  it('confirm 400 khi có dòng giữ chỗ nhưng thiếu warehouse_id', async () => {
    const createRes = await authedInject({
      method: 'POST',
      url: '/api/v1/quotations',
      payload: basePayload({ warehouse_id: undefined }),
    })
    const quotation = JSON.parse(createRes.payload)
    const confirmRes = await authedInject({ method: 'PATCH', url: `/api/v1/quotations/${quotation.id}/confirm` })
    expect(confirmRes.statusCode).toBe(400)
  })

  it('confirm 400 khi không đủ tồn kho', async () => {
    const createRes = await authedInject({
      method: 'POST',
      url: '/api/v1/quotations',
      payload: basePayload({
        sections: [
          { name: 'Thiết bị', line_items: [{ variant_id: variantId, quantity: 999, unit_price: 100000 }] },
        ],
      }),
    })
    const quotation = JSON.parse(createRes.payload)
    const confirmRes = await authedInject({ method: 'PATCH', url: `/api/v1/quotations/${quotation.id}/confirm` })
    expect(confirmRes.statusCode).toBe(400)
  })

  it('confirm bundle: expand đúng sản phẩm con theo bundle_items, reserved đúng quantity*bundle_qty', async () => {
    const createRes = await authedInject({
      method: 'POST',
      url: '/api/v1/quotations',
      payload: basePayload({
        sections: [
          { name: 'Combo', line_items: [{ bundle_id: bundleVariantId, quantity: 3, unit_price: 500000 }] },
        ],
      }),
    })
    const quotation = JSON.parse(createRes.payload)
    const bundleLineId = quotation.sections[0].line_items[0].id

    const confirmRes = await authedInject({ method: 'PATCH', url: `/api/v1/quotations/${quotation.id}/confirm` })
    expect(confirmRes.statusCode).toBe(200)

    const app = await getApp()
    const inventory = await app.db('inventory').where({ variant_id: bundleItemVariantId, warehouse_id: warehouseId }).first()
    expect(inventory.qty_reserved).toBe(6) // 3 bundle * 2 mỗi bundle

    const reserved = await app
      .db('reserved_items')
      .where({ source_type: 'quotation', source_id: quotation.id, quotation_line_item_id: bundleLineId })
      .first()
    expect(reserved.variant_id).toBe(bundleItemVariantId)
    expect(reserved.quantity).toBe(6)
  })

  it('cancel khi Draft: chủ báo giá huỷ thành công, không đụng tới inventory', async () => {
    const createRes = await authedInject({ method: 'POST', url: '/api/v1/quotations', payload: basePayload() })
    const quotation = JSON.parse(createRes.payload)

    const cancelRes = await authedInject({ method: 'PATCH', url: `/api/v1/quotations/${quotation.id}/cancel` })
    expect(cancelRes.statusCode).toBe(200)
    expect(JSON.parse(cancelRes.payload).status).toBe('cancelled')
  })

  it('cancel khi Confirmed: giải phóng reserved_items + giảm qty_reserved', async () => {
    const createRes = await authedInject({ method: 'POST', url: '/api/v1/quotations', payload: basePayload() })
    const quotation = JSON.parse(createRes.payload)
    await authedInject({ method: 'PATCH', url: `/api/v1/quotations/${quotation.id}/confirm` })

    const cancelRes = await authedInject({ method: 'PATCH', url: `/api/v1/quotations/${quotation.id}/cancel` })
    expect(cancelRes.statusCode).toBe(200)

    const app = await getApp()
    const inventory = await app.db('inventory').where({ variant_id: variantId, warehouse_id: warehouseId }).first()
    expect(inventory.qty_reserved).toBe(0)
    const reserved = await app.db('reserved_items').where({ source_type: 'quotation', source_id: quotation.id })
    expect(reserved).toHaveLength(0)
  })

  it('cancel: người không phải chủ và không có quyền quotation.confirm bị chặn 403', async () => {
    const createRes = await authedInject({ method: 'POST', url: '/api/v1/quotations', payload: basePayload() })
    const quotation = JSON.parse(createRes.payload)

    await createUserWithRole('Warehouse', 'warehouse@test.local', 'Test@123')
    const warehouseToken = await loginAs('warehouse@test.local', 'Test@123')

    const cancelRes = await authedInject(
      { method: 'PATCH', url: `/api/v1/quotations/${quotation.id}/cancel` },
      warehouseToken,
    )
    expect(cancelRes.statusCode).toBe(403)
  })

  it('cancel: người không phải chủ nhưng có quyền quotation.confirm (Manager) huỷ được', async () => {
    const createRes = await authedInject({ method: 'POST', url: '/api/v1/quotations', payload: basePayload() })
    const quotation = JSON.parse(createRes.payload)

    await createUserWithRole('Manager', 'manager@test.local', 'Test@123')
    const managerToken = await loginAs('manager@test.local', 'Test@123')

    const cancelRes = await authedInject(
      { method: 'PATCH', url: `/api/v1/quotations/${quotation.id}/cancel` },
      managerToken,
    )
    expect(cancelRes.statusCode).toBe(200)
  })

  it('expire: Confirmed → Expired, giải phóng reserved', async () => {
    const createRes = await authedInject({ method: 'POST', url: '/api/v1/quotations', payload: basePayload() })
    const quotation = JSON.parse(createRes.payload)
    await authedInject({ method: 'PATCH', url: `/api/v1/quotations/${quotation.id}/confirm` })

    const expireRes = await authedInject({ method: 'PATCH', url: `/api/v1/quotations/${quotation.id}/expire` })
    expect(expireRes.statusCode).toBe(200)
    expect(JSON.parse(expireRes.payload).status).toBe('expired')

    const app = await getApp()
    const inventory = await app.db('inventory').where({ variant_id: variantId, warehouse_id: warehouseId }).first()
    expect(inventory.qty_reserved).toBe(0)
  })

  it('unconfirm: Confirmed → Draft khi chưa có DO nào, giải phóng reserved', async () => {
    const createRes = await authedInject({ method: 'POST', url: '/api/v1/quotations', payload: basePayload() })
    const quotation = JSON.parse(createRes.payload)
    await authedInject({ method: 'PATCH', url: `/api/v1/quotations/${quotation.id}/confirm` })

    const unconfirmRes = await authedInject({ method: 'PATCH', url: `/api/v1/quotations/${quotation.id}/unconfirm` })
    expect(unconfirmRes.statusCode).toBe(200)
    expect(JSON.parse(unconfirmRes.payload).status).toBe('draft')

    const app = await getApp()
    const inventory = await app.db('inventory').where({ variant_id: variantId, warehouse_id: warehouseId }).first()
    expect(inventory.qty_reserved).toBe(0)
  })

  it('unconfirm 400 khi đã có DO liên quan (đã xuất hoặc đang chờ xử lý)', async () => {
    const createRes = await authedInject({
      method: 'POST',
      url: '/api/v1/quotations',
      payload: basePayload({
        sections: [
          { name: 'Vật tư', line_items: [{ variant_id: consumableVariantId, quantity: 10, unit_price: 5000 }] },
        ],
      }),
    })
    const quotation = JSON.parse(createRes.payload)
    const lineId = quotation.sections[0].line_items[0].id
    await authedInject({ method: 'PATCH', url: `/api/v1/quotations/${quotation.id}/confirm` })

    await authedInject({
      method: 'POST',
      url: '/api/v1/deliveries',
      payload: {
        code: 'DO-Q-001',
        export_type: 'sale',
        company_id: companyId,
        quotation_id: quotation.id,
        warehouse_id: warehouseId,
        lines: [{ variant_id: consumableVariantId, quantity: 4, quotation_line_item_id: lineId }],
      },
    })

    const unconfirmRes = await authedInject({ method: 'PATCH', url: `/api/v1/quotations/${quotation.id}/unconfirm` })
    expect(unconfirmRes.statusCode).toBe(400)
  })

  it('luồng đầy đủ qua DO: exported_qty/remaining_qty cập nhật đúng, giải phóng reserved theo từng phần, và khoá khi remaining_qty=0', async () => {
    const createRes = await authedInject({
      method: 'POST',
      url: '/api/v1/quotations',
      payload: basePayload({
        sections: [
          { name: 'Vật tư', line_items: [{ variant_id: consumableVariantId, quantity: 10, unit_price: 5000 }] },
        ],
      }),
    })
    const quotation = JSON.parse(createRes.payload)
    const lineId = quotation.sections[0].line_items[0].id
    await authedInject({ method: 'PATCH', url: `/api/v1/quotations/${quotation.id}/confirm` })

    const app = await getApp()

    // DO #1: xuất 4/10
    const do1Res = await authedInject({
      method: 'POST',
      url: '/api/v1/deliveries',
      payload: {
        code: 'DO-Q-002',
        export_type: 'sale',
        company_id: companyId,
        quotation_id: quotation.id,
        warehouse_id: warehouseId,
        lines: [{ variant_id: consumableVariantId, quantity: 4, quotation_line_item_id: lineId }],
      },
    })
    expect(do1Res.statusCode).toBe(201)
    const do1 = JSON.parse(do1Res.payload)
    await authedInject({ method: 'PATCH', url: `/api/v1/deliveries/${do1.id}/submit` })
    await authedInject({ method: 'PATCH', url: `/api/v1/deliveries/${do1.id}/approve` })
    await authedInject({ method: 'PATCH', url: `/api/v1/deliveries/${do1.id}/complete`, payload: {} })

    let getRes = await authedInject({ method: 'GET', url: `/api/v1/quotations/${quotation.id}` })
    let line = JSON.parse(getRes.payload).sections[0].line_items[0]
    expect(line.exported_qty).toBe(4)
    expect(line.remaining_qty).toBe(6)

    let inventory = await app.db('inventory').where({ variant_id: consumableVariantId, warehouse_id: warehouseId }).first()
    expect(inventory.qty_reserved).toBe(6) // 10 - 4 đã giải phóng
    expect(inventory.qty_on_hand).toBe(46) // 50 - 4

    // DO #2: xuất tiếp 6/10 còn lại — vừa khít remaining_qty
    const do2Res = await authedInject({
      method: 'POST',
      url: '/api/v1/deliveries',
      payload: {
        code: 'DO-Q-003',
        export_type: 'sale',
        company_id: companyId,
        quotation_id: quotation.id,
        warehouse_id: warehouseId,
        lines: [{ variant_id: consumableVariantId, quantity: 6, quotation_line_item_id: lineId }],
      },
    })
    expect(do2Res.statusCode).toBe(201)
    const do2 = JSON.parse(do2Res.payload)
    await authedInject({ method: 'PATCH', url: `/api/v1/deliveries/${do2.id}/submit` })
    await authedInject({ method: 'PATCH', url: `/api/v1/deliveries/${do2.id}/approve` })
    await authedInject({ method: 'PATCH', url: `/api/v1/deliveries/${do2.id}/complete`, payload: {} })

    getRes = await authedInject({ method: 'GET', url: `/api/v1/quotations/${quotation.id}` })
    line = JSON.parse(getRes.payload).sections[0].line_items[0]
    expect(line.exported_qty).toBe(10)
    expect(line.remaining_qty).toBe(0)

    inventory = await app.db('inventory').where({ variant_id: consumableVariantId, warehouse_id: warehouseId }).first()
    expect(inventory.qty_reserved).toBe(0)

    const reserved = await app.db('reserved_items').where({ source_type: 'quotation', source_id: quotation.id })
    expect(reserved).toHaveLength(0)

    // DO #3: remaining_qty=0 → không cho tạo thêm
    const do3Res = await authedInject({
      method: 'POST',
      url: '/api/v1/deliveries',
      payload: {
        code: 'DO-Q-004',
        export_type: 'sale',
        company_id: companyId,
        quotation_id: quotation.id,
        warehouse_id: warehouseId,
        lines: [{ variant_id: consumableVariantId, quantity: 1, quotation_line_item_id: lineId }],
      },
    })
    expect(do3Res.statusCode).toBe(400)
  })
})
