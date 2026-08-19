import { Knex } from 'knex'
import { generateMasterCode } from '../../lib/generateDocumentCode'
import {
  CreateCompanyBody,
  UpdateCompanyBody,
  ListCompanyQuery,
  CreateContactBody,
  UpdateContactBody,
} from './company.schema'

export class CompanyRepository {
  constructor(private db: Knex) {}

  // ─── Companies ─────────────────────────────────────────────────────────

  async findAll(query: ListCompanyQuery) {
    const { type, search, page = 1, limit = 20, sort_by, sort_order } = query
    const offset = (page - 1) * limit

    const SORTABLE: Record<string, string> = {
      code: 'c.code', name: 'c.name', tax_code: 'c.tax_code', created_at: 'c.created_at',
    }
    const sortDir = sort_order === 'asc' ? 'asc' : 'desc'

    const base = this.db('companies as c').where('c.is_active', true)

    if (type) {
      base.whereExists(
        this.db('company_types as ct').whereRaw('ct.company_id = c.id').andWhere('ct.type', type),
      )
    }
    if (search) {
      base.where((qb) => {
        qb.whereILike('c.name', `%${search}%`).orWhereILike('c.code', `%${search}%`).orWhereILike('c.tax_code', `%${search}%`)
      })
    }

    const rowsQuery = base.clone().select('c.*').limit(limit).offset(offset)
    if (sort_by === 'type') {
      rowsQuery.orderByRaw(
        `(SELECT MIN(ct.type) FROM company_types ct WHERE ct.company_id = c.id) ${sortDir}`,
      )
    } else {
      rowsQuery.orderBy(SORTABLE[sort_by ?? ''] ?? 'c.created_at', sortDir)
    }

    const [rows, countResult] = await Promise.all([
      rowsQuery,
      base.clone().clearSelect().count('c.id as count').first(),
    ])

    // Gắn types[] cho từng company bằng 1 query duy nhất (tránh N+1 query/company).
    const ids = rows.map((r: any) => r.id)
    const typeRows = ids.length
      ? await this.db('company_types').whereIn('company_id', ids).select('company_id', 'type')
      : []
    const typesByCompany = new Map<string, string[]>()
    for (const t of typeRows) {
      const arr = typesByCompany.get(t.company_id) ?? []
      arr.push(t.type)
      typesByCompany.set(t.company_id, arr)
    }

    const data = rows.map((r: any) => ({ ...r, types: typesByCompany.get(r.id) ?? [] }))

    return { data, total: Number(countResult?.count ?? 0), page, limit }
  }

  findByBitrixId(bitrixCompanyId: string) {
    return this.db('companies').where({ bitrix_company_id: bitrixCompanyId }).first()
  }

  findByTaxCode(taxCode: string) {
    // Không lọc is_active — Bitrix sync cần dedup kể cả company đã soft-delete,
    // tránh tạo bản ghi trùng khi công ty tạm bị vô hiệu hóa trong WMS.
    return this.db('companies').where({ tax_code: taxCode }).first()
  }

  async findById(id: string) {
    const company = await this.db('companies').where({ id }).first()
    if (!company) return null

    const [types, contacts] = await Promise.all([
      this.db('company_types').where({ company_id: id }).pluck('type'),
      this.db('contacts as c')
        .join('contact_companies as cc', 'cc.contact_id', 'c.id')
        .where('cc.company_id', id)
        .orderBy('cc.is_primary', 'desc')
        .select('c.*', 'cc.is_primary'),
    ])

    return { ...company, types, contacts }
  }

  async create(data: CreateCompanyBody, trx: Knex.Transaction) {
    const { types, ...header } = data
    if (!header.code) header.code = await generateMasterCode(trx, 'company')
    const [company] = await trx('companies').insert(header).returning('*')
    await trx('company_types').insert(types.map((type) => ({ company_id: company.id, type })))
    return { ...company, types }
  }

  async update(id: string, data: UpdateCompanyBody, trx: Knex.Transaction) {
    const { types, ...header } = data
    const [company] = await trx('companies')
      .where({ id })
      .update({ ...header, updated_at: trx.fn.now() })
      .returning('*')

    if (types) {
      await trx('company_types').where({ company_id: id }).del()
      await trx('company_types').insert(types.map((type) => ({ company_id: id, type })))
    }

    return { ...company, types: types ?? undefined }
  }

  // ─── Contacts ──────────────────────────────────────────────────────────

  async findAllContacts(query: { search?: string; company_id?: string; page?: number; limit?: number }) {
    const { search, company_id, page = 1, limit = 50 } = query
    const offset = (page - 1) * limit

    const base = this.db('contacts as c')
      .join('contact_companies as cc', 'cc.contact_id', 'c.id')
      .join('companies as co', 'co.id', 'cc.company_id')

    if (search) {
      base.where((qb) => {
        qb.whereILike('c.full_name', `%${search}%`)
          .orWhereILike('c.phone', `%${search}%`)
          .orWhereILike('c.email', `%${search}%`)
          .orWhereILike('co.name', `%${search}%`)
      })
    }
    if (company_id) base.where('cc.company_id', company_id)

    const [rows, countResult] = await Promise.all([
      base.clone()
        .select('c.*', 'cc.is_primary', 'cc.company_id', 'co.name as company_name', 'co.code as company_code')
        .orderBy([{ column: 'cc.is_primary', order: 'desc' }, { column: 'c.full_name', order: 'asc' }])
        .limit(limit).offset(offset),
      base.clone().clearSelect().count('c.id as count').first(),
    ])

    return { data: rows, total: Number(countResult?.count ?? 0), page, limit }
  }

  findContactById(id: string) {
    return this.db('contacts').where({ id }).first()
  }

  findContactByBitrixId(bitrixContactId: string) {
    return this.db('contacts').where({ bitrix_contact_id: bitrixContactId }).first()
  }

  // Kiểm tra contact có thuộc company không — dùng để validate trước update/delete.
  findContactByIdAndCompany(contactId: string, companyId: string) {
    return this.db('contacts as c')
      .join('contact_companies as cc', 'cc.contact_id', 'c.id')
      .where('c.id', contactId)
      .where('cc.company_id', companyId)
      .select('c.*', 'cc.is_primary')
      .first()
  }

  // Bỏ cờ is_primary của các contact khác trong cùng company — chỉ 1 contact
  // được là primary mỗi company.
  clearPrimaryContact(companyId: string, exceptContactId: string | null, trx: Knex.Transaction) {
    const q = trx('contact_companies').where({ company_id: companyId }).update({ is_primary: false })
    if (exceptContactId) q.whereNot({ contact_id: exceptContactId })
    return q
  }

  async addContact(companyId: string, data: CreateContactBody, trx: Knex.Transaction) {
    const { is_primary, ...contactData } = data
    const [contact] = await trx('contacts').insert(contactData).returning('*')
    await trx('contact_companies').insert({
      contact_id: contact.id,
      company_id: companyId,
      is_primary: is_primary ?? false,
    })
    return { ...contact, is_primary: is_primary ?? false }
  }

  async updateContact(id: string, data: UpdateContactBody, trx: Knex.Transaction) {
    const { is_primary, ...contactData } = data
    if (Object.keys(contactData).length > 0) {
      await trx('contacts').where({ id }).update(contactData)
    }
    if (is_primary !== undefined) {
      await trx('contact_companies').where({ contact_id: id }).update({ is_primary })
    }
    return trx('contacts').where({ id }).first()
  }

  // Upsert link contact ↔ company (idempotent — dùng trong Bitrix sync multi-company).
  async linkContactToCompany(contactId: string, companyId: string, isPrimary: boolean, trx: Knex.Transaction) {
    await trx('contact_companies')
      .insert({ contact_id: contactId, company_id: companyId, is_primary: isPrimary })
      .onConflict(['contact_id', 'company_id'])
      .merge({ is_primary: isPrimary })
  }

  deleteContact(id: string) {
    return this.db('contacts').where({ id }).del()
  }

  deleteCompany(id: string) {
    return this.db('companies').where({ id }).update({ is_active: false, updated_at: this.db.fn.now() })
  }
}
