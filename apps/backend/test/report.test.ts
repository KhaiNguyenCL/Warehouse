import { describe, it, expect, beforeEach } from 'vitest'
import { getApp, createUserWithRole, loginAs } from './helpers'

describe('Report', () => {
  let adminToken: string
  let warehouseId: string
  let categoryId: string
  let companyId: string
  let consumableAId: string
  let consumableBId: string

  beforeEach(async () => {
    await createUserWithRole('Admin', 'admin@test.local', 'Test@123')
    adminToken = await loginAs('admin@test.local', 'Test@123')

    const app = await getApp()
    const [warehouse] = await app.db('warehouses').insert({ code: 'WH-REPORT', name: 'Kho test báo cáo', type: 'physical' }).returning('*')
    warehouseId = warehouse.id
    const [category] = await app.db('categories').insert({ name: 'Vật tư mạng' }).returning('*')
    categoryId = category.id
    const [company] = await app.db('companies').insert({ code: 'CUST-RPT', name: 'KH report' }).returning('*')
    companyId = company.id

    const [productA] = await app.db('products').insert({ code: 'RPT-A', name: 'Cable A', product_type: 'consumable', category_id: categoryId }).returning('*')
    const [variantA] = await app.db('variants').insert({ product_id: productA.id, sku: 'RPT-A-01', name: 'Cable A 01', unit: 'Mét' }).returning('*')
    consumableAId = variantA.id
    await app.db('inventory').insert({ variant_id: consumableAId, warehouse_id: warehouseId, qty_on_hand: 50, qty_reserved: 5, avg_cost: 10000 })

    const [productB] = await app.db('products').insert({ code: 'RPT-B', name: 'Connector B', product_type: 'consumable', category_id: categoryId }).returning('*')
    const [variantB] = await app.db('variants').insert({ product_id: productB.id, sku: 'RPT-B-01', name: 'Connector B 01', unit: 'Cái' }).returning('*')
    consumableBId = variantB.id
    await app.db('inventory').insert({ variant_id: consumableBId, warehouse_id: warehouseId, qty_on_hand: 20, qty_reserved: 0, avg_cost: 2000 })
  })

  async function authedInject(opts: Parameters<Awaited<ReturnType<typeof getApp>>['inject']>[0], overrideToken?: string) {
    const app = await getApp()
    return app.inject({ ...opts, headers: { authorization: `Bearer ${overrideToken ?? adminToken}`, ...(opts.headers as object) } })
  }

  describe('Inventory report', () => {
    it('GET /reports/inventory/summary tính đúng tổng qty_on_hand/qty_reserved/total_value', async () => {
      const res = await authedInject({ method: 'GET', url: `/api/v1/reports/inventory/summary?warehouse_id=${warehouseId}` })
      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.payload)
      expect(body.total_skus).toBe(2)
      expect(body.total_qty_on_hand).toBe(70) // 50 + 20
      expect(body.total_qty_reserved).toBe(5)
      expect(Number(body.total_value)).toBe(50 * 10000 + 20 * 2000) // 540000
    })

    it('GET /reports/inventory/by-category group đúng theo category', async () => {
      const res = await authedInject({ method: 'GET', url: `/api/v1/reports/inventory/by-category?warehouse_id=${warehouseId}` })
      expect(res.statusCode).toBe(200)
      const rows = JSON.parse(res.payload)
      expect(rows).toHaveLength(1)
      expect(rows[0].category_id).toBe(categoryId)
      expect(rows[0].total_skus).toBe(2)
    })

    it('user không có quyền report.inventory → 403', async () => {
      await createUserWithRole('Sale', 'sale-noinv@test.local', 'Test@123')
      // Sale role CÓ report.inventory theo seed — dùng role không có quyền gì liên quan report:
      // tạo trực tiếp 1 role rỗng để chắc chắn không có report.inventory.
      const app = await getApp()
      const [emptyRole] = await app.db('roles').insert({ name: 'No Report Role' }).returning('*')
      const bcrypt = await import('bcrypt')
      const password_hash = await bcrypt.hash('Test@123', 10)
      await app.db('users').insert({ full_name: 'No Report', email: 'noreport@test.local', password_hash, role_id: emptyRole.id })
      const noReportToken = await loginAs('noreport@test.local', 'Test@123')

      const res = await authedInject({ method: 'GET', url: '/api/v1/reports/inventory/summary' }, noReportToken)
      expect(res.statusCode).toBe(403)
    })
  })

  describe('Revenue report', () => {
    async function shipViaQuotation(variantId: string, quotedQty: number, unitPrice: number, shippedQty: number, exportType: 'sale' | 'internal' = 'sale') {
      const doPayload: any = {
        code: `DO-RPT-${Math.random().toString(36).slice(2, 8)}`,
        export_type: exportType,
        warehouse_id: warehouseId,
        lines: [{ variant_id: variantId, quantity: shippedQty }],
      }

      // export_type='internal' không liên quan gì tới Quotation — chỉ 'sale' mới cần
      // tạo + confirm báo giá rồi gắn quotation_line_item_id vào dòng DO.
      if (exportType === 'sale') {
        const qRes = await authedInject({
          method: 'POST',
          url: '/api/v1/quotations',
          payload: {
            code: `BG-RPT-${Math.random().toString(36).slice(2, 8)}`,
            company_id: companyId,
            warehouse_id: warehouseId,
            sections: [{ name: 'A', line_items: [{ variant_id: variantId, quantity: quotedQty, unit_price: unitPrice }] }],
          },
        })
        const quotation = JSON.parse(qRes.payload)
        const lineId = quotation.sections[0].line_items[0].id
        await authedInject({ method: 'PATCH', url: `/api/v1/quotations/${quotation.id}/confirm` })
        doPayload.company_id = companyId
        doPayload.quotation_id = quotation.id
        doPayload.lines[0].quotation_line_item_id = lineId
      }

      const doRes = await authedInject({ method: 'POST', url: '/api/v1/deliveries', payload: doPayload })
      const delivery = JSON.parse(doRes.payload)
      await authedInject({ method: 'PATCH', url: `/api/v1/deliveries/${delivery.id}/submit` })
      await authedInject({ method: 'PATCH', url: `/api/v1/deliveries/${delivery.id}/approve` })
      await authedInject({ method: 'PATCH', url: `/api/v1/deliveries/${delivery.id}/complete`, payload: {} })
      return delivery
    }

    it('tính đúng doanh thu từ DO sale completed có quotation_line_item_id', async () => {
      await shipViaQuotation(consumableAId, 10, 5000, 4, 'sale') // 4*5000 = 20000

      const res = await authedInject({ method: 'GET', url: '/api/v1/reports/revenue/summary' }, undefined)
      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.payload)
      expect(Number(body.total_revenue)).toBe(20000)
      expect(body.total_orders).toBe(1)
      expect(body.total_qty).toBe(4)
    })

    it('KHÔNG tính DO export_type=internal (không có quotation_line_item_id) vào doanh thu', async () => {
      await shipViaQuotation(consumableAId, 10, 5000, 4, 'sale') // tính: 20000
      await shipViaQuotation(consumableBId, 0, 0, 3, 'internal') // không tính

      const res = await authedInject({ method: 'GET', url: '/api/v1/reports/revenue/summary' })
      const body = JSON.parse(res.payload)
      expect(Number(body.total_revenue)).toBe(20000)
      expect(body.total_orders).toBe(1)
    })

    it('top-products xếp đúng theo doanh thu giảm dần', async () => {
      await shipViaQuotation(consumableAId, 10, 5000, 2, 'sale') // 10000
      await shipViaQuotation(consumableBId, 10, 2000, 8, 'sale') // 16000

      const res = await authedInject({ method: 'GET', url: '/api/v1/reports/revenue/top-products' })
      expect(res.statusCode).toBe(200)
      const rows = JSON.parse(res.payload)
      expect(rows[0].variant_id).toBe(consumableBId)
      expect(Number(rows[0].total_revenue)).toBe(16000)
      expect(rows[1].variant_id).toBe(consumableAId)
      expect(Number(rows[1].total_revenue)).toBe(10000)
    })

    it('user không có quyền report.revenue → 403', async () => {
      await createUserWithRole('Warehouse', 'wh-noRev@test.local', 'Test@123')
      const whToken = await loginAs('wh-noRev@test.local', 'Test@123')
      const res = await authedInject({ method: 'GET', url: '/api/v1/reports/revenue/summary' }, whToken)
      expect(res.statusCode).toBe(403)
    })
  })

  describe('Dashboard', () => {
    it('trả về đúng số liệu pending/active/expiring', async () => {
      await authedInject({
        method: 'POST',
        url: '/api/v1/receipts',
        payload: { code: 'PN-RPT-001', import_type: 'purchase', warehouse_id: warehouseId, lines: [{ variant_id: consumableAId, quantity: 5, cost_price: 1000 }] },
      }).then((r) => authedInject({ method: 'PATCH', url: `/api/v1/receipts/${JSON.parse(r.payload).id}/submit` }))

      await authedInject({
        method: 'POST',
        url: '/api/v1/deliveries',
        payload: { code: 'DO-RPT-001', export_type: 'internal', warehouse_id: warehouseId, lines: [{ variant_id: consumableAId, quantity: 1 }] },
      }).then((r) => authedInject({ method: 'PATCH', url: `/api/v1/deliveries/${JSON.parse(r.payload).id}/submit` }))

      await authedInject({
        method: 'POST',
        url: '/api/v1/stocktakes',
        payload: { code: 'KK-RPT-001', warehouse_id: warehouseId, scope_type: 'by_sku', scope_ids: [consumableAId] },
      })

      const qRes = await authedInject({
        method: 'POST',
        url: '/api/v1/quotations',
        payload: {
          code: 'BG-RPT-EXPIRE',
          company_id: companyId,
          warehouse_id: warehouseId,
          valid_days: 3,
          quote_date: new Date().toISOString().slice(0, 10),
          sections: [{ name: 'A', line_items: [{ description: 'Phí', quantity: 1, unit_price: 1000 }] }],
        },
      })
      await authedInject({ method: 'PATCH', url: `/api/v1/quotations/${JSON.parse(qRes.payload).id}/confirm` })

      const res = await authedInject({ method: 'GET', url: '/api/v1/reports/dashboard' })
      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.payload)
      expect(body.pending_receipts).toBe(1)
      expect(body.pending_deliveries).toBe(1)
      expect(body.active_stocktakes).toBe(1)
      expect(body.quotations_expiring_soon).toBe(1)
      expect(body.total_companies).toBeGreaterThanOrEqual(1)
    })

    it('user không có quyền report.view → 403', async () => {
      await createUserWithRole('Sale', 'sale-noview@test.local', 'Test@123')
      const saleToken = await loginAs('sale-noview@test.local', 'Test@123')
      const res = await authedInject({ method: 'GET', url: '/api/v1/reports/dashboard' }, saleToken)
      expect(res.statusCode).toBe(403)
    })
  })
})
