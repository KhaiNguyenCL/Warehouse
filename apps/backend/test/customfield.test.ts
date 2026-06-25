import { describe, it, expect, beforeEach } from 'vitest'
import { getApp, createUserWithRole, loginAs } from './helpers'

describe('CustomField', () => {
  let token: string
  let companyId: string

  beforeEach(async () => {
    await createUserWithRole('Admin', 'admin@test.local', 'Test@123')
    token = await loginAs('admin@test.local', 'Test@123')

    const app = await getApp()
    const [company] = await app.db('companies').insert({ code: 'CUST-CF', name: 'KH custom field' }).returning('*')
    companyId = company.id
  })

  async function authedInject(opts: Parameters<Awaited<ReturnType<typeof getApp>>['inject']>[0]) {
    const app = await getApp()
    return app.inject({ ...opts, headers: { authorization: `Bearer ${token}`, ...(opts.headers as object) } })
  }

  it('tạo custom field text thành công, list theo object_type', async () => {
    const res = await authedInject({
      method: 'POST',
      url: '/api/v1/custom-fields',
      payload: { field_name: 'tax_code', field_label: 'Mã số thuế', field_type: 'text', object_type: 'company' },
    })
    expect(res.statusCode).toBe(201)

    const listRes = await authedInject({ method: 'GET', url: '/api/v1/custom-fields?object_type=company' })
    expect(listRes.statusCode).toBe(200)
    expect(JSON.parse(listRes.payload)).toHaveLength(1)
  })

  it('tạo custom field cho object_type="variant" (SKU) thành công, lưu/đọc value theo đúng variant_id', async () => {
    const app = await getApp()
    const [product] = await app.db('products').insert({ code: 'CF-PROD', name: 'SP test custom field SKU', product_type: 'storable' }).returning('*')
    const [variant] = await app
      .db('variants')
      .insert({ product_id: product.id, sku: 'CF-PROD-SKU', name: 'SKU test', unit: 'Cái' })
      .returning('*')

    const createRes = await authedInject({
      method: 'POST',
      url: '/api/v1/custom-fields',
      payload: { field_name: 'ram_size', field_label: 'Dung lượng RAM', field_type: 'text', object_type: 'variant' },
    })
    expect(createRes.statusCode).toBe(201)
    const field = JSON.parse(createRes.payload)

    const putRes = await authedInject({
      method: 'PUT',
      url: `/api/v1/custom-fields/values?object_type=variant&object_id=${variant.id}`,
      payload: { values: [{ field_id: field.id, value: '16GB' }] },
    })
    expect(putRes.statusCode).toBe(200)

    const getRes = await authedInject({
      method: 'GET',
      url: `/api/v1/custom-fields/values?object_type=variant&object_id=${variant.id}`,
    })
    const values = JSON.parse(getRes.payload)
    expect(values).toHaveLength(1)
    expect(values[0].value).toBe('16GB')

    // value của variant này không lẫn qua object_type="product" dù field_name khác — đảm
    // bảo 2 cấp Product/Variant tách biệt hoàn toàn theo CLAUDE.md mục 5.
    const productValuesRes = await authedInject({
      method: 'GET',
      url: `/api/v1/custom-fields/values?object_type=product&object_id=${product.id}`,
    })
    expect(JSON.parse(productValuesRes.payload)).toHaveLength(0)
  })

  it('field_type=select thiếu options → 400', async () => {
    const res = await authedInject({
      method: 'POST',
      url: '/api/v1/custom-fields',
      payload: { field_name: 'tier', field_label: 'Hạng KH', field_type: 'select', object_type: 'company' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('field_name trùng trong cùng object_type → 409', async () => {
    await authedInject({
      method: 'POST',
      url: '/api/v1/custom-fields',
      payload: { field_name: 'tax_code', field_label: 'Mã số thuế', field_type: 'text', object_type: 'company' },
    })
    const res = await authedInject({
      method: 'POST',
      url: '/api/v1/custom-fields',
      payload: { field_name: 'tax_code', field_label: 'Mã số thuế 2', field_type: 'text', object_type: 'company' },
    })
    expect(res.statusCode).toBe(409)
  })

  it('field_name trùng nhưng KHÁC object_type → vẫn tạo được (unique theo object_type+field_name)', async () => {
    await authedInject({
      method: 'POST',
      url: '/api/v1/custom-fields',
      payload: { field_name: 'note_extra', field_label: 'Ghi chú thêm', field_type: 'text', object_type: 'company' },
    })
    const res = await authedInject({
      method: 'POST',
      url: '/api/v1/custom-fields',
      payload: { field_name: 'note_extra', field_label: 'Ghi chú thêm', field_type: 'text', object_type: 'quotation' },
    })
    expect(res.statusCode).toBe(201)
  })

  it('update options rỗng cho field select → 400', async () => {
    const createRes = await authedInject({
      method: 'POST',
      url: '/api/v1/custom-fields',
      payload: { field_name: 'tier', field_label: 'Hạng KH', field_type: 'select', object_type: 'company', options: ['Vàng', 'Bạc'] },
    })
    const field = JSON.parse(createRes.payload)

    const res = await authedInject({ method: 'PATCH', url: `/api/v1/custom-fields/${field.id}`, payload: { options: [] } })
    expect(res.statusCode).toBe(400)
  })

  it('không thể xoá field hệ thống (is_system=true)', async () => {
    const app = await getApp()
    const [systemField] = await app
      .db('custom_fields')
      .insert({ field_name: 'sys_field', field_label: 'System field', field_type: 'text', object_type: 'company', is_system: true })
      .returning('*')

    const res = await authedInject({ method: 'DELETE', url: `/api/v1/custom-fields/${systemField.id}` })
    expect(res.statusCode).toBe(400)
  })

  it('xoá field đang có field_values → 400', async () => {
    const createRes = await authedInject({
      method: 'POST',
      url: '/api/v1/custom-fields',
      payload: { field_name: 'tax_code', field_label: 'Mã số thuế', field_type: 'text', object_type: 'company' },
    })
    const field = JSON.parse(createRes.payload)
    await authedInject({
      method: 'PUT',
      url: `/api/v1/custom-fields/values?object_type=company&object_id=${companyId}`,
      payload: { values: [{ field_id: field.id, value: '0123456789' }] },
    })

    const res = await authedInject({ method: 'DELETE', url: `/api/v1/custom-fields/${field.id}` })
    expect(res.statusCode).toBe(400)
  })

  it('xoá field không có dữ liệu thành công', async () => {
    const createRes = await authedInject({
      method: 'POST',
      url: '/api/v1/custom-fields',
      payload: { field_name: 'unused_field', field_label: 'Chưa dùng', field_type: 'text', object_type: 'company' },
    })
    const field = JSON.parse(createRes.payload)
    const res = await authedInject({ method: 'DELETE', url: `/api/v1/custom-fields/${field.id}` })
    expect(res.statusCode).toBe(204)
  })

  describe('Values', () => {
    let textFieldId: string
    let numberFieldId: string
    let dateFieldId: string
    let boolFieldId: string
    let selectFieldId: string

    beforeEach(async () => {
      const fields = [
        { field_name: 'tax_code', field_label: 'Mã số thuế', field_type: 'text' },
        { field_name: 'credit_limit', field_label: 'Hạn mức nợ', field_type: 'number' },
        { field_name: 'contract_date', field_label: 'Ngày ký HĐ', field_type: 'date' },
        { field_name: 'is_vip', field_label: 'Khách VIP', field_type: 'boolean' },
      ]
      const ids: Record<string, string> = {}
      for (const f of fields) {
        const res = await authedInject({ method: 'POST', url: '/api/v1/custom-fields', payload: { ...f, object_type: 'company' } })
        ids[f.field_name] = JSON.parse(res.payload).id
      }
      const selectRes = await authedInject({
        method: 'POST',
        url: '/api/v1/custom-fields',
        payload: { field_name: 'tier', field_label: 'Hạng KH', field_type: 'select', object_type: 'company', options: ['Vàng', 'Bạc'] },
      })
      textFieldId = ids.tax_code
      numberFieldId = ids.credit_limit
      dateFieldId = ids.contract_date
      boolFieldId = ids.is_vip
      selectFieldId = JSON.parse(selectRes.payload).id
    })

    it('set giá trị hợp lệ cho text/number/date/boolean/select cùng lúc', async () => {
      const res = await authedInject({
        method: 'PUT',
        url: `/api/v1/custom-fields/values?object_type=company&object_id=${companyId}`,
        payload: {
          values: [
            { field_id: textFieldId, value: '0312345678' },
            { field_id: numberFieldId, value: '500000000' },
            { field_id: dateFieldId, value: '2026-01-15' },
            { field_id: boolFieldId, value: 'true' },
            { field_id: selectFieldId, value: 'Vàng' },
          ],
        },
      })
      expect(res.statusCode).toBe(200)
      const values = JSON.parse(res.payload)
      expect(values).toHaveLength(5)

      const getRes = await authedInject({ method: 'GET', url: `/api/v1/custom-fields/values?object_type=company&object_id=${companyId}` })
      const got = JSON.parse(getRes.payload)
      const byName = new Map(got.map((v: any) => [v.field_name, v.value]))
      expect(byName.get('tax_code')).toBe('0312345678')
      expect(byName.get('tier')).toBe('Vàng')
    })

    it('giá trị number không hợp lệ → 400', async () => {
      const res = await authedInject({
        method: 'PUT',
        url: `/api/v1/custom-fields/values?object_type=company&object_id=${companyId}`,
        payload: { values: [{ field_id: numberFieldId, value: 'not-a-number' }] },
      })
      expect(res.statusCode).toBe(400)
    })

    it('giá trị select không thuộc options → 400', async () => {
      const res = await authedInject({
        method: 'PUT',
        url: `/api/v1/custom-fields/values?object_type=company&object_id=${companyId}`,
        payload: { values: [{ field_id: selectFieldId, value: 'Kim Cương' }] },
      })
      expect(res.statusCode).toBe(400)
    })

    it('field thuộc object_type khác → 400', async () => {
      const quotationFieldRes = await authedInject({
        method: 'POST',
        url: '/api/v1/custom-fields',
        payload: { field_name: 'po_number', field_label: 'Số PO', field_type: 'text', object_type: 'quotation' },
      })
      const quotationFieldId = JSON.parse(quotationFieldRes.payload).id

      const res = await authedInject({
        method: 'PUT',
        url: `/api/v1/custom-fields/values?object_type=company&object_id=${companyId}`,
        payload: { values: [{ field_id: quotationFieldId, value: 'PO-001' }] },
      })
      expect(res.statusCode).toBe(400)
    })

    it('replace toàn bộ — gọi PUT lần 2 thiếu field nào thì field đó mất giá trị', async () => {
      await authedInject({
        method: 'PUT',
        url: `/api/v1/custom-fields/values?object_type=company&object_id=${companyId}`,
        payload: {
          values: [
            { field_id: textFieldId, value: '0312345678' },
            { field_id: numberFieldId, value: '500000000' },
          ],
        },
      })

      await authedInject({
        method: 'PUT',
        url: `/api/v1/custom-fields/values?object_type=company&object_id=${companyId}`,
        payload: { values: [{ field_id: textFieldId, value: '0312345678' }] },
      })

      const getRes = await authedInject({ method: 'GET', url: `/api/v1/custom-fields/values?object_type=company&object_id=${companyId}` })
      const got = JSON.parse(getRes.payload)
      expect(got).toHaveLength(1)
      expect(got[0].field_name).toBe('tax_code')
    })
  })
})
