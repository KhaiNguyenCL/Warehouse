// Bitrix module gọi ra Internet thật (crm.deal.get,...) — test KHÔNG gọi mạng thật,
// mock global fetch để giả lập response của Bitrix REST API theo từng method.
process.env.BITRIX_WEBHOOK_URL = 'https://test.bitrix24.vn/rest/1/testkey'

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getApp, createUserWithRole, loginAs } from './helpers'

describe('Bitrix', () => {
  let token: string
  let companyId: string
  let mockResults: Record<string, unknown>

  beforeEach(async () => {
    await createUserWithRole('Admin', 'admin@test.local', 'Test@123')
    token = await loginAs('admin@test.local', 'Test@123')

    const app = await getApp()
    const [company] = await app.db('companies').insert({ code: 'CUST-BX', name: 'KH bitrix' }).returning('*')
    companyId = company.id

    mockResults = {}
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        const method = new URL(url).pathname.split('/').pop()
        const result = mockResults[method as string]
        if (result === undefined) {
          return { json: async () => ({ error: 'METHOD_NOT_MOCKED', error_description: `chưa mock ${method}` }) }
        }
        return { json: async () => ({ result }) }
      }),
    )
  })

  async function authedInject(opts: Parameters<Awaited<ReturnType<typeof getApp>>['inject']>[0]) {
    const app = await getApp()
    return app.inject({ ...opts, headers: { authorization: `Bearer ${token}`, ...(opts.headers as object) } })
  }

  async function createDraftQuotation() {
    const res = await authedInject({
      method: 'POST',
      url: '/api/v1/quotations',
      payload: {
        code: 'BG-BX-001',
        company_id: companyId,
        sections: [{ name: 'A', line_items: [{ description: 'Phí dịch vụ', quantity: 1, unit_price: 1000 }] }],
      },
    })
    return JSON.parse(res.payload)
  }

  it('PUT /bitrix/mappings: replace thành công với quotation_field hợp lệ', async () => {
    const res = await authedInject({
      method: 'PUT',
      url: '/api/v1/bitrix/mappings',
      payload: { mappings: [{ quotation_field: 'project_name', bitrix_object: 'deal', bitrix_field: 'TITLE' }] },
    })
    expect(res.statusCode).toBe(200)

    const app = await getApp()
    const rows = await app.db('bitrix_field_mappings')
    expect(rows).toHaveLength(1)
    expect(rows[0].quotation_field).toBe('project_name')
  })

  it('PUT /bitrix/mappings: chặn quotation_field không nằm trong whitelist → 400', async () => {
    const res = await authedInject({
      method: 'PUT',
      url: '/api/v1/bitrix/mappings',
      payload: { mappings: [{ quotation_field: 'grand_total', bitrix_object: 'deal', bitrix_field: 'OPPORTUNITY' }] },
    })
    expect(res.statusCode).toBe(400)
  })

  it('GET /bitrix/deals/:dealId: proxy đọc deal từ Bitrix', async () => {
    mockResults['crm.deal.get'] = { ID: '55', TITLE: 'Deal ABC' }
    const res = await authedInject({ method: 'GET', url: '/api/v1/bitrix/deals/55' })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.payload)).toEqual({ ID: '55', TITLE: 'Deal ABC' })
  })

  it('GET /bitrix/deals/:dealId: Bitrix trả lỗi → 502', async () => {
    mockResults['crm.deal.get'] = undefined
    const res = await authedInject({ method: 'GET', url: '/api/v1/bitrix/deals/999' })
    expect(res.statusCode).toBe(502)
  })

  it('sync: chặn khi quotation không còn Draft → 400', async () => {
    const quotation = await createDraftQuotation()
    const app = await getApp()
    await app.db('quotations').where({ id: quotation.id }).update({ status: 'confirmed' })

    const res = await authedInject({
      method: 'POST',
      url: `/api/v1/bitrix/quotations/${quotation.id}/sync`,
      payload: { deal_id: '77' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('sync: thiếu deal_id và quotation chưa từng sync trước đó → 400', async () => {
    const quotation = await createDraftQuotation()
    const res = await authedInject({
      method: 'POST',
      url: `/api/v1/bitrix/quotations/${quotation.id}/sync`,
      payload: {},
    })
    expect(res.statusCode).toBe(400)
  })

  it('sync: ghi đè project_name/terms từ deal, lưu bitrix_deal_id + bitrix_synced_at', async () => {
    await authedInject({
      method: 'PUT',
      url: '/api/v1/bitrix/mappings',
      payload: {
        mappings: [
          { quotation_field: 'project_name', bitrix_object: 'deal', bitrix_field: 'TITLE' },
          { quotation_field: 'terms', bitrix_object: 'deal', bitrix_field: 'OPPORTUNITY' },
        ],
      },
    })
    const quotation = await createDraftQuotation()
    mockResults['crm.deal.get'] = { ID: '77', TITLE: 'Deal Big', OPPORTUNITY: '5000000' }

    const res = await authedInject({
      method: 'POST',
      url: `/api/v1/bitrix/quotations/${quotation.id}/sync`,
      payload: { deal_id: '77' },
    })
    expect(res.statusCode).toBe(200)
    const updated = JSON.parse(res.payload)
    expect(updated.project_name).toBe('Deal Big')
    expect(updated.terms).toBe('5000000')
    expect(updated.bitrix_deal_id).toBe('77')
    expect(updated.bitrix_synced_at).not.toBeNull()
    expect(updated.bitrix_deal_url).toContain('77')
  })

  it('sync: mapping bitrix_object=company → fetch thêm company theo deal.COMPANY_ID', async () => {
    await authedInject({
      method: 'PUT',
      url: '/api/v1/bitrix/mappings',
      payload: { mappings: [{ quotation_field: 'delivery_location', bitrix_object: 'company', bitrix_field: 'ADDRESS' }] },
    })
    const quotation = await createDraftQuotation()
    mockResults['crm.deal.get'] = { ID: '88', COMPANY_ID: '99' }
    mockResults['crm.company.get'] = { ID: '99', ADDRESS: '123 Bitrix St' }

    const res = await authedInject({
      method: 'POST',
      url: `/api/v1/bitrix/quotations/${quotation.id}/sync`,
      payload: { deal_id: '88' },
    })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.payload).delivery_location).toBe('123 Bitrix St')
  })

  it('sync lại không cần gửi deal_id nếu quotation đã có bitrix_deal_id từ lần trước', async () => {
    await authedInject({
      method: 'PUT',
      url: '/api/v1/bitrix/mappings',
      payload: { mappings: [{ quotation_field: 'project_name', bitrix_object: 'deal', bitrix_field: 'TITLE' }] },
    })
    const quotation = await createDraftQuotation()
    mockResults['crm.deal.get'] = { ID: '101', TITLE: 'Lần 1' }
    await authedInject({
      method: 'POST',
      url: `/api/v1/bitrix/quotations/${quotation.id}/sync`,
      payload: { deal_id: '101' },
    })

    mockResults['crm.deal.get'] = { ID: '101', TITLE: 'Lần 2 — đã đổi tên ở Bitrix' }
    const res = await authedInject({
      method: 'POST',
      url: `/api/v1/bitrix/quotations/${quotation.id}/sync`,
      payload: {},
    })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.payload).project_name).toBe('Lần 2 — đã đổi tên ở Bitrix')
  })

  describe('Import Company/Contact', () => {
    it('import company mới → tạo company local, types theo COMPANY_TYPE', async () => {
      mockResults['crm.company.get'] = { ID: '56', TITLE: 'Tech Horizon Corp', COMPANY_TYPE: 'SUPPLIER', PHONE: [{ VALUE: '0285431' }], EMAIL: [{ VALUE: 'info@th.com' }] }

      const res = await authedInject({ method: 'POST', url: '/api/v1/bitrix/companies/56/import' })
      expect(res.statusCode).toBe(201)
      const company = JSON.parse(res.payload)
      expect(company.name).toBe('Tech Horizon Corp')
      expect(company.types).toEqual(['supplier'])
      expect(company.bitrix_company_id).toBe('56')
      expect(company.phone).toBe('0285431')
      expect(company.email).toBe('info@th.com')

      const app = await getApp()
      const rows = await app.db('companies').where({ bitrix_company_id: '56' })
      expect(rows).toHaveLength(1)
    })

    it('import company lần 2 (đã tồn tại theo bitrix_company_id) → update, không tạo trùng', async () => {
      mockResults['crm.company.get'] = { ID: '56', TITLE: 'Tech Horizon Corp', COMPANY_TYPE: 'SUPPLIER' }
      await authedInject({ method: 'POST', url: '/api/v1/bitrix/companies/56/import' })

      mockResults['crm.company.get'] = { ID: '56', TITLE: 'Tech Horizon Corp (đổi tên)', COMPANY_TYPE: 'SUPPLIER' }
      const res = await authedInject({ method: 'POST', url: '/api/v1/bitrix/companies/56/import' })
      expect(res.statusCode).toBe(201)
      expect(JSON.parse(res.payload).name).toBe('Tech Horizon Corp (đổi tên)')

      const app = await getApp()
      const rows = await app.db('companies').where({ bitrix_company_id: '56' })
      expect(rows).toHaveLength(1)
    })

    it('import contact: company chưa import và không truyền company_id → 400', async () => {
      mockResults['crm.contact.get'] = { ID: '49', NAME: 'Vịnh', LAST_NAME: 'Lê', COMPANY_ID: '999' }
      const res = await authedInject({ method: 'POST', url: '/api/v1/bitrix/contacts/49/import', payload: {} })
      expect(res.statusCode).toBe(400)
    })

    it('import contact: tự resolve company qua COMPANY_ID đã import trước đó', async () => {
      mockResults['crm.company.get'] = { ID: '56', TITLE: 'Tech Horizon Corp', COMPANY_TYPE: 'SUPPLIER' }
      const companyRes = await authedInject({ method: 'POST', url: '/api/v1/bitrix/companies/56/import' })
      const importedCompany = JSON.parse(companyRes.payload)

      mockResults['crm.contact.get'] = { ID: '49', NAME: 'Vịnh', LAST_NAME: 'Lê', POST: 'Account Manager', COMPANY_ID: '56' }
      const res = await authedInject({ method: 'POST', url: '/api/v1/bitrix/contacts/49/import', payload: {} })
      expect(res.statusCode).toBe(201)
      const contact = JSON.parse(res.payload)
      expect(contact.company_id).toBe(importedCompany.id)
      expect(contact.full_name).toBe('Vịnh Lê')
      expect(contact.position).toBe('Account Manager')
    })

    it('import contact: truyền company_id trực tiếp, không cần company đã import', async () => {
      mockResults['crm.contact.get'] = { ID: '49', NAME: 'Vịnh', LAST_NAME: 'Lê' }
      const res = await authedInject({
        method: 'POST',
        url: '/api/v1/bitrix/contacts/49/import',
        payload: { company_id: companyId },
      })
      expect(res.statusCode).toBe(201)
      expect(JSON.parse(res.payload).company_id).toBe(companyId)
    })

    it('import contact lần 2 → update, không tạo trùng', async () => {
      mockResults['crm.contact.get'] = { ID: '49', NAME: 'Vịnh', LAST_NAME: 'Lê' }
      await authedInject({ method: 'POST', url: '/api/v1/bitrix/contacts/49/import', payload: { company_id: companyId } })

      mockResults['crm.contact.get'] = { ID: '49', NAME: 'Vịnh (đổi)', LAST_NAME: 'Lê' }
      const res = await authedInject({ method: 'POST', url: '/api/v1/bitrix/contacts/49/import', payload: { company_id: companyId } })
      expect(res.statusCode).toBe(201)
      expect(JSON.parse(res.payload).full_name).toBe('Vịnh (đổi) Lê')

      const app = await getApp()
      const rows = await app.db('contacts').where({ bitrix_contact_id: '49' })
      expect(rows).toHaveLength(1)
    })
  })
})
