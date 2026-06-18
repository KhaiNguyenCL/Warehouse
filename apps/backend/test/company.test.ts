import { describe, it, expect, beforeEach } from 'vitest'
import { getApp, createUserWithRole, loginAs } from './helpers'

describe('Company', () => {
  let token: string

  beforeEach(async () => {
    await createUserWithRole('Admin', 'admin@test.local', 'Test@123')
    token = await loginAs('admin@test.local', 'Test@123')
  })

  async function authedInject(opts: Parameters<Awaited<ReturnType<typeof getApp>>['inject']>[0]) {
    const app = await getApp()
    return app.inject({ ...opts, headers: { authorization: `Bearer ${token}`, ...(opts.headers as object) } })
  }

  it('tạo company với nhiều types (vừa KH vừa NCC) thành công', async () => {
    const res = await authedInject({
      method: 'POST',
      url: '/api/v1/companies',
      payload: { code: 'CTY-A', name: 'Công ty A', types: ['customer', 'supplier'] },
    })
    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.payload)
    expect(body.code).toBe('CTY-A')
    expect(body.types.sort()).toEqual(['customer', 'supplier'])
  })

  it('trùng code company trả về 409', async () => {
    await authedInject({
      method: 'POST',
      url: '/api/v1/companies',
      payload: { code: 'CTY-DUP', name: 'Công ty Dup', types: ['customer'] },
    })
    const res = await authedInject({
      method: 'POST',
      url: '/api/v1/companies',
      payload: { code: 'CTY-DUP', name: 'Công ty Dup 2', types: ['supplier'] },
    })
    expect(res.statusCode).toBe(409)
  })

  it('thiếu types trả về 400 (schema validation)', async () => {
    const res = await authedInject({
      method: 'POST',
      url: '/api/v1/companies',
      payload: { code: 'CTY-NOTYPE', name: 'Công ty thiếu type' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('filter ?type=supplier chỉ trả về company có type đó', async () => {
    await authedInject({
      method: 'POST',
      url: '/api/v1/companies',
      payload: { code: 'CTY-CUST', name: 'Chỉ là KH', types: ['customer'] },
    })
    await authedInject({
      method: 'POST',
      url: '/api/v1/companies',
      payload: { code: 'CTY-SUPP', name: 'Chỉ là NCC', types: ['supplier'] },
    })

    const res = await authedInject({ method: 'GET', url: '/api/v1/companies?type=supplier' })
    const body = JSON.parse(res.payload)
    const codes = body.data.map((c: any) => c.code)
    expect(codes).toContain('CTY-SUPP')
    expect(codes).not.toContain('CTY-CUST')
  })

  it('update đổi types từ customer sang cả 2 loại', async () => {
    const created = JSON.parse(
      (
        await authedInject({
          method: 'POST',
          url: '/api/v1/companies',
          payload: { code: 'CTY-UPD', name: 'Công ty update', types: ['customer'] },
        })
      ).payload,
    )

    const res = await authedInject({
      method: 'PATCH',
      url: `/api/v1/companies/${created.id}`,
      payload: { types: ['customer', 'supplier'] },
    })
    expect(JSON.parse(res.payload).types.sort()).toEqual(['customer', 'supplier'])

    const getRes = await authedInject({ method: 'GET', url: `/api/v1/companies/${created.id}` })
    expect(JSON.parse(getRes.payload).types.sort()).toEqual(['customer', 'supplier'])
  })

  it('GET /:id với id không tồn tại trả về 404', async () => {
    const res = await authedInject({
      method: 'GET',
      url: '/api/v1/companies/00000000-0000-0000-0000-000000000000',
    })
    expect(res.statusCode).toBe(404)
  })

  it('thêm contact cho company, GET /:id trả về contacts kèm theo', async () => {
    const company = JSON.parse(
      (
        await authedInject({
          method: 'POST',
          url: '/api/v1/companies',
          payload: { code: 'CTY-CONTACT', name: 'Công ty có contact', types: ['customer'] },
        })
      ).payload,
    )

    const contactRes = await authedInject({
      method: 'POST',
      url: `/api/v1/companies/${company.id}/contacts`,
      payload: { full_name: 'Nguyễn Văn B', phone: '0900000000', is_primary: true },
    })
    expect(contactRes.statusCode).toBe(201)

    const getRes = await authedInject({ method: 'GET', url: `/api/v1/companies/${company.id}` })
    const body = JSON.parse(getRes.payload)
    expect(body.contacts).toHaveLength(1)
    expect(body.contacts[0].full_name).toBe('Nguyễn Văn B')
    expect(body.contacts[0].is_primary).toBe(true)
  })

  it('thêm contact thứ 2 là primary → contact cũ tự bỏ cờ primary', async () => {
    const company = JSON.parse(
      (
        await authedInject({
          method: 'POST',
          url: '/api/v1/companies',
          payload: { code: 'CTY-PRIMARY', name: 'Công ty primary', types: ['customer'] },
        })
      ).payload,
    )

    await authedInject({
      method: 'POST',
      url: `/api/v1/companies/${company.id}/contacts`,
      payload: { full_name: 'Contact 1', is_primary: true },
    })
    const contact2 = JSON.parse(
      (
        await authedInject({
          method: 'POST',
          url: `/api/v1/companies/${company.id}/contacts`,
          payload: { full_name: 'Contact 2', is_primary: true },
        })
      ).payload,
    )

    const getRes = await authedInject({ method: 'GET', url: `/api/v1/companies/${company.id}` })
    const body = JSON.parse(getRes.payload)
    const primaryContacts = body.contacts.filter((c: any) => c.is_primary)
    expect(primaryContacts).toHaveLength(1)
    expect(primaryContacts[0].id).toBe(contact2.id)
  })

  it('update contact với company_id sai (contact không thuộc company đó) → 404', async () => {
    const companyA = JSON.parse(
      (
        await authedInject({
          method: 'POST',
          url: '/api/v1/companies',
          payload: { code: 'CTY-X', name: 'Công ty X', types: ['customer'] },
        })
      ).payload,
    )
    const companyB = JSON.parse(
      (
        await authedInject({
          method: 'POST',
          url: '/api/v1/companies',
          payload: { code: 'CTY-Y', name: 'Công ty Y', types: ['customer'] },
        })
      ).payload,
    )
    const contact = JSON.parse(
      (
        await authedInject({
          method: 'POST',
          url: `/api/v1/companies/${companyA.id}/contacts`,
          payload: { full_name: 'Contact A' },
        })
      ).payload,
    )

    const res = await authedInject({
      method: 'PATCH',
      url: `/api/v1/companies/${companyB.id}/contacts/${contact.id}`,
      payload: { full_name: 'Contact A renamed' },
    })
    expect(res.statusCode).toBe(404)
  })
})
