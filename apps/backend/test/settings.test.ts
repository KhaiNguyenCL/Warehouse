import { describe, it, expect, beforeEach } from 'vitest'
import { getApp, createUserWithRole, loginAs } from './helpers'

describe('Settings', () => {
  let token: string

  beforeEach(async () => {
    await createUserWithRole('Admin', 'admin@test.local', 'Test@123')
    token = await loginAs('admin@test.local', 'Test@123')
  })

  async function authedInject(opts: Parameters<Awaited<ReturnType<typeof getApp>>['inject']>[0], overrideToken?: string) {
    const app = await getApp()
    return app.inject({ ...opts, headers: { authorization: `Bearer ${overrideToken ?? token}`, ...(opts.headers as object) } })
  }

  describe('Roles & Permissions', () => {
    it('GET /settings/roles trả về 5 role mặc định đã seed', async () => {
      const res = await authedInject({ method: 'GET', url: '/api/v1/settings/roles' })
      expect(res.statusCode).toBe(200)
      const roles = JSON.parse(res.payload)
      expect(roles.map((r: any) => r.name).sort()).toEqual(['Accounting', 'Admin', 'Manager', 'Sale', 'Warehouse'])
    })

    it('tạo role tuỳ chỉnh kèm permission_keys → role mới có đúng permissions', async () => {
      const res = await authedInject({
        method: 'POST',
        url: '/api/v1/settings/roles',
        payload: { name: 'Kế toán kho', description: 'Xem báo cáo + tồn kho', permission_keys: ['report.inventory', 'report.view'] },
      })
      expect(res.statusCode).toBe(201)
      const role = JSON.parse(res.payload)
      expect(role.is_system).toBe(false)
      expect(role.permissions.map((p: any) => p.key).sort()).toEqual(['report.inventory', 'report.view'])
    })

    it('PUT /:id/permissions replace toàn bộ — permission cũ bị xoá hết', async () => {
      const createRes = await authedInject({
        method: 'POST',
        url: '/api/v1/settings/roles',
        payload: { name: 'Role test', permission_keys: ['report.view'] },
      })
      const role = JSON.parse(createRes.payload)

      const replaceRes = await authedInject({
        method: 'PUT',
        url: `/api/v1/settings/roles/${role.id}/permissions`,
        payload: { permission_keys: ['quotation.view', 'quotation.create'] },
      })
      expect(replaceRes.statusCode).toBe(200)
      const updated = JSON.parse(replaceRes.payload)
      expect(updated.permissions.map((p: any) => p.key).sort()).toEqual(['quotation.create', 'quotation.view'])
    })

    it('PUT /:id/permissions với permission key không tồn tại → 400', async () => {
      const createRes = await authedInject({ method: 'POST', url: '/api/v1/settings/roles', payload: { name: 'Role test 2' } })
      const role = JSON.parse(createRes.payload)

      const res = await authedInject({
        method: 'PUT',
        url: `/api/v1/settings/roles/${role.id}/permissions`,
        payload: { permission_keys: ['khong.ton.tai'] },
      })
      expect(res.statusCode).toBe(400)
    })

    it('không thể đổi tên role hệ thống (Admin/Manager/...) nhưng đổi được description', async () => {
      const app = await getApp()
      const managerRole = await app.db('roles').where({ name: 'Manager' }).first()

      const renameRes = await authedInject({
        method: 'PATCH',
        url: `/api/v1/settings/roles/${managerRole.id}`,
        payload: { name: 'Quản lý mới' },
      })
      expect(renameRes.statusCode).toBe(400)

      const descRes = await authedInject({
        method: 'PATCH',
        url: `/api/v1/settings/roles/${managerRole.id}`,
        payload: { description: 'Mô tả mới' },
      })
      expect(descRes.statusCode).toBe(200)
      expect(JSON.parse(descRes.payload).description).toBe('Mô tả mới')
    })

    it('không thể xoá role hệ thống', async () => {
      const app = await getApp()
      const saleRole = await app.db('roles').where({ name: 'Sale' }).first()
      const res = await authedInject({ method: 'DELETE', url: `/api/v1/settings/roles/${saleRole.id}` })
      expect(res.statusCode).toBe(400)
    })

    it('không thể xoá role tuỳ chỉnh còn user đang dùng', async () => {
      const createRes = await authedInject({ method: 'POST', url: '/api/v1/settings/roles', payload: { name: 'Role có user' } })
      const role = JSON.parse(createRes.payload)
      await authedInject({
        method: 'POST',
        url: '/api/v1/settings/users',
        payload: { full_name: 'Nhân viên test', email: 'staff@test.local', password: 'Test@123', role_id: role.id },
      })

      const res = await authedInject({ method: 'DELETE', url: `/api/v1/settings/roles/${role.id}` })
      expect(res.statusCode).toBe(400)
    })

    it('xoá được role tuỳ chỉnh khi không còn user nào dùng', async () => {
      const createRes = await authedInject({ method: 'POST', url: '/api/v1/settings/roles', payload: { name: 'Role rỗng' } })
      const role = JSON.parse(createRes.payload)

      const res = await authedInject({ method: 'DELETE', url: `/api/v1/settings/roles/${role.id}` })
      expect(res.statusCode).toBe(204)
    })

    it('GET /settings/permissions trả về danh sách đầy đủ permission key đã seed', async () => {
      const res = await authedInject({ method: 'GET', url: '/api/v1/settings/permissions' })
      expect(res.statusCode).toBe(200)
      const keys = JSON.parse(res.payload).map((p: any) => p.key)
      expect(keys).toContain('quotation.confirm')
      expect(keys).toContain('settings.roles')
    })

    it('user không có quyền settings.roles → 403 khi tạo role', async () => {
      await createUserWithRole('Sale', 'sale@test.local', 'Test@123')
      const saleToken = await loginAs('sale@test.local', 'Test@123')
      const res = await authedInject({ method: 'POST', url: '/api/v1/settings/roles', payload: { name: 'X' } }, saleToken)
      expect(res.statusCode).toBe(403)
    })
  })

  describe('Users', () => {
    it('tạo user mới thành công, password được hash (không trả password_hash ra ngoài)', async () => {
      const app = await getApp()
      const role = await app.db('roles').where({ name: 'Sale' }).first()

      const res = await authedInject({
        method: 'POST',
        url: '/api/v1/settings/users',
        payload: { full_name: 'Nguyễn Văn A', email: 'nva@test.local', password: 'Test@123', role_id: role.id },
      })
      expect(res.statusCode).toBe(201)
      const user = JSON.parse(res.payload)
      expect(user.password_hash).toBeUndefined()
      expect(user.role_name).toBe('Sale')

      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'nva@test.local', password: 'Test@123' },
      })
      expect(loginRes.statusCode).toBe(200)
    })

    it('tạo user với email đã tồn tại → 409', async () => {
      const app = await getApp()
      const role = await app.db('roles').where({ name: 'Sale' }).first()
      await authedInject({
        method: 'POST',
        url: '/api/v1/settings/users',
        payload: { full_name: 'A', email: 'dup@test.local', password: 'Test@123', role_id: role.id },
      })
      const res = await authedInject({
        method: 'POST',
        url: '/api/v1/settings/users',
        payload: { full_name: 'B', email: 'dup@test.local', password: 'Test@123', role_id: role.id },
      })
      expect(res.statusCode).toBe(409)
    })

    it('tạo user với role_id không tồn tại → 400', async () => {
      const res = await authedInject({
        method: 'POST',
        url: '/api/v1/settings/users',
        payload: { full_name: 'A', email: 'a@test.local', password: 'Test@123', role_id: '00000000-0000-0000-0000-000000000000' },
      })
      expect(res.statusCode).toBe(400)
    })

    it('PATCH is_active=false khoá tài khoản — user không login được nữa', async () => {
      const app = await getApp()
      const role = await app.db('roles').where({ name: 'Sale' }).first()
      const createRes = await authedInject({
        method: 'POST',
        url: '/api/v1/settings/users',
        payload: { full_name: 'Bị khoá', email: 'locked@test.local', password: 'Test@123', role_id: role.id },
      })
      const user = JSON.parse(createRes.payload)

      const patchRes = await authedInject({
        method: 'PATCH',
        url: `/api/v1/settings/users/${user.id}`,
        payload: { is_active: false },
      })
      expect(patchRes.statusCode).toBe(200)

      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'locked@test.local', password: 'Test@123' },
      })
      expect(loginRes.statusCode).toBe(401)
    })

    it('PATCH password — user login được bằng password mới, không còn login được bằng password cũ', async () => {
      const app = await getApp()
      const role = await app.db('roles').where({ name: 'Sale' }).first()
      const createRes = await authedInject({
        method: 'POST',
        url: '/api/v1/settings/users',
        payload: { full_name: 'Reset PW', email: 'resetpw@test.local', password: 'OldPass@123', role_id: role.id },
      })
      const user = JSON.parse(createRes.payload)

      await authedInject({ method: 'PATCH', url: `/api/v1/settings/users/${user.id}`, payload: { password: 'NewPass@123' } })

      const oldLogin = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: 'resetpw@test.local', password: 'OldPass@123' } })
      expect(oldLogin.statusCode).toBe(401)
      const newLogin = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: 'resetpw@test.local', password: 'NewPass@123' } })
      expect(newLogin.statusCode).toBe(200)
    })

    it('GET /settings/users filter theo role_id', async () => {
      const app = await getApp()
      const saleRole = await app.db('roles').where({ name: 'Sale' }).first()
      await authedInject({
        method: 'POST',
        url: '/api/v1/settings/users',
        payload: { full_name: 'Sale User', email: 'saleuser@test.local', password: 'Test@123', role_id: saleRole.id },
      })

      const res = await authedInject({ method: 'GET', url: `/api/v1/settings/users?role_id=${saleRole.id}` })
      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.payload)
      expect(body.data.every((u: any) => u.role_id === saleRole.id)).toBe(true)
      expect(body.data.some((u: any) => u.email === 'saleuser@test.local')).toBe(true)
    })
  })

  describe('Import / Export Types', () => {
    it('tạo import_type tuỳ chỉnh thành công', async () => {
      const res = await authedInject({
        method: 'POST',
        url: '/api/v1/settings/import-types',
        payload: { key: 'consignment_in', label: 'Nhận hàng ký gửi', requires_company: 'supplier' },
      })
      expect(res.statusCode).toBe(201)
      const row = JSON.parse(res.payload)
      expect(row.is_system).toBe(false)
    })

    it('tạo import_type với key đã tồn tại → 409', async () => {
      const res = await authedInject({
        method: 'POST',
        url: '/api/v1/settings/import-types',
        payload: { key: 'purchase', label: 'Trùng key hệ thống' },
      })
      expect(res.statusCode).toBe(409)
    })

    it('không thể xoá import_type hệ thống (purchase/return_in/adjustment)', async () => {
      const app = await getApp()
      const purchase = await app.db('import_types').where({ key: 'purchase' }).first()
      const res = await authedInject({ method: 'DELETE', url: `/api/v1/settings/import-types/${purchase.id}` })
      expect(res.statusCode).toBe(400)
    })

    it('xoá được import_type tuỳ chỉnh', async () => {
      const createRes = await authedInject({
        method: 'POST',
        url: '/api/v1/settings/import-types',
        payload: { key: 'temp_type', label: 'Tạm' },
      })
      const row = JSON.parse(createRes.payload)
      const res = await authedInject({ method: 'DELETE', url: `/api/v1/settings/import-types/${row.id}` })
      expect(res.statusCode).toBe(204)
    })

    it('tạo export_type tuỳ chỉnh + update label', async () => {
      const createRes = await authedInject({
        method: 'POST',
        url: '/api/v1/settings/export-types',
        payload: { key: 'loan_out', label: 'Cho mượn dài hạn', requires_quotation: false },
      })
      expect(createRes.statusCode).toBe(201)
      const row = JSON.parse(createRes.payload)

      const updateRes = await authedInject({
        method: 'PATCH',
        url: `/api/v1/settings/export-types/${row.id}`,
        payload: { label: 'Cho mượn dài hạn (đã sửa)' },
      })
      expect(updateRes.statusCode).toBe(200)
      expect(JSON.parse(updateRes.payload).label).toBe('Cho mượn dài hạn (đã sửa)')
    })

    it('không thể xoá export_type hệ thống', async () => {
      const app = await getApp()
      const sale = await app.db('export_types').where({ key: 'sale' }).first()
      const res = await authedInject({ method: 'DELETE', url: `/api/v1/settings/export-types/${sale.id}` })
      expect(res.statusCode).toBe(400)
    })
  })
})
