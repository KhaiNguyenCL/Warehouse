import { describe, it, expect, beforeEach } from 'vitest'
import { getApp, createUserWithRole, loginAs } from './helpers'

describe('Product', () => {
  let token: string
  let productId: string
  let variantId: string
  let companyId: string

  beforeEach(async () => {
    await createUserWithRole('Admin', 'admin@test.local', 'Test@123')
    token = await loginAs('admin@test.local', 'Test@123')

    const app = await getApp()
    const [product] = await app
      .db('products')
      .insert({ code: 'TEST-PRD-1', name: 'Test Switch', product_type: 'storable' })
      .returning('*')
    productId = product.id

    const [variant] = await app
      .db('variants')
      .insert({ product_id: productId, sku: 'TEST-PRD-1-01', name: 'Test Switch 01', unit: 'Cái' })
      .returning('*')
    variantId = variant.id

    const [company] = await app
      .db('companies')
      .insert({ code: 'NCC-TEST', name: 'NCC Test' })
      .returning('*')
    companyId = company.id
  })

  async function authedInject(opts: Parameters<Awaited<ReturnType<typeof getApp>>['inject']>[0]) {
    const app = await getApp()
    return app.inject({ ...opts, headers: { authorization: `Bearer ${token}`, ...(opts.headers as object) } })
  }

  describe('Variant Suppliers', () => {
    it('thêm NCC cho variant thành công', async () => {
      const res = await authedInject({
        method: 'POST',
        url: `/api/v1/products/${productId}/variants/${variantId}/suppliers`,
        payload: { company_id: companyId, supplier_sku: 'NCC-SKU-01', supplier_price: 500000, lead_time_days: 7 },
      })
      expect(res.statusCode).toBe(201)
      const supplier = JSON.parse(res.payload)
      expect(supplier.company_id).toBe(companyId)
      expect(Number(supplier.supplier_price)).toBe(500000)
      expect(supplier.is_preferred).toBe(false)
    })

    it('company_id không tồn tại → 400', async () => {
      const res = await authedInject({
        method: 'POST',
        url: `/api/v1/products/${productId}/variants/${variantId}/suppliers`,
        payload: { company_id: '00000000-0000-0000-0000-000000000000' },
      })
      expect(res.statusCode).toBe(400)
    })

    it('variant không thuộc product → 404', async () => {
      const app = await getApp()
      const [otherProduct] = await app
        .db('products')
        .insert({ code: 'TEST-PRD-2', name: 'Other product', product_type: 'storable' })
        .returning('*')

      const res = await authedInject({
        method: 'POST',
        url: `/api/v1/products/${otherProduct.id}/variants/${variantId}/suppliers`,
        payload: { company_id: companyId },
      })
      expect(res.statusCode).toBe(404)
    })

    it('list trả về tất cả NCC của variant, sắp xếp is_preferred trước', async () => {
      const app = await getApp()
      const [company2] = await app.db('companies').insert({ code: 'NCC-TEST-2', name: 'NCC Test 2' }).returning('*')

      await authedInject({
        method: 'POST',
        url: `/api/v1/products/${productId}/variants/${variantId}/suppliers`,
        payload: { company_id: companyId },
      })
      await authedInject({
        method: 'POST',
        url: `/api/v1/products/${productId}/variants/${variantId}/suppliers`,
        payload: { company_id: company2.id, is_preferred: true },
      })

      const res = await authedInject({
        method: 'GET',
        url: `/api/v1/products/${productId}/variants/${variantId}/suppliers`,
      })
      expect(res.statusCode).toBe(200)
      const list = JSON.parse(res.payload)
      expect(list).toHaveLength(2)
      expect(list[0].company_id).toBe(company2.id)
      expect(list[0].is_preferred).toBe(true)
    })

    it('đặt is_preferred=true cho NCC mới → tự bỏ is_preferred của NCC cũ', async () => {
      const app = await getApp()
      const [company2] = await app.db('companies').insert({ code: 'NCC-TEST-3', name: 'NCC Test 3' }).returning('*')

      const res1 = await authedInject({
        method: 'POST',
        url: `/api/v1/products/${productId}/variants/${variantId}/suppliers`,
        payload: { company_id: companyId, is_preferred: true },
      })
      const supplier1 = JSON.parse(res1.payload)

      await authedInject({
        method: 'POST',
        url: `/api/v1/products/${productId}/variants/${variantId}/suppliers`,
        payload: { company_id: company2.id, is_preferred: true },
      })

      const updated1 = await app.db('variant_suppliers').where({ id: supplier1.id }).first()
      expect(updated1.is_preferred).toBe(false)
    })

    it('sửa NCC: đổi giá + đặt is_preferred', async () => {
      const createRes = await authedInject({
        method: 'POST',
        url: `/api/v1/products/${productId}/variants/${variantId}/suppliers`,
        payload: { company_id: companyId, supplier_price: 500000 },
      })
      const supplier = JSON.parse(createRes.payload)

      const res = await authedInject({
        method: 'PATCH',
        url: `/api/v1/products/${productId}/variants/${variantId}/suppliers/${supplier.id}`,
        payload: { supplier_price: 480000, is_preferred: true },
      })
      expect(res.statusCode).toBe(200)
      const updated = JSON.parse(res.payload)
      expect(Number(updated.supplier_price)).toBe(480000)
      expect(updated.is_preferred).toBe(true)
    })

    it('xoá NCC khỏi variant', async () => {
      const createRes = await authedInject({
        method: 'POST',
        url: `/api/v1/products/${productId}/variants/${variantId}/suppliers`,
        payload: { company_id: companyId },
      })
      const supplier = JSON.parse(createRes.payload)

      const res = await authedInject({
        method: 'DELETE',
        url: `/api/v1/products/${productId}/variants/${variantId}/suppliers/${supplier.id}`,
      })
      expect(res.statusCode).toBe(204)

      const app = await getApp()
      const remaining = await app.db('variant_suppliers').where({ id: supplier.id }).first()
      expect(remaining).toBeUndefined()
    })

    it('sửa/xoá NCC không tồn tại → 404', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000'
      const updateRes = await authedInject({
        method: 'PATCH',
        url: `/api/v1/products/${productId}/variants/${variantId}/suppliers/${fakeId}`,
        payload: { supplier_price: 100 },
      })
      expect(updateRes.statusCode).toBe(404)

      const deleteRes = await authedInject({
        method: 'DELETE',
        url: `/api/v1/products/${productId}/variants/${variantId}/suppliers/${fakeId}`,
      })
      expect(deleteRes.statusCode).toBe(404)
    })
  })
})
