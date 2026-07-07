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
    const { type, search, page = 1, limit = 20 } = query
    const offset = (page - 1) * limit

    const base = this.db('companies as c').where('c.is_active', true)

    if (type) {
      base.whereExists(
        this.db('company_types as ct').whereRaw('ct.company_id = c.id').andWhere('ct.type', type),
      )
    }
    if (search) {
      base.where((qb) => {
        qb.whereILike('c.name', `%${search}%`).orWhereILike('c.code', `%${search}%`)
      })
    }

    const [rows, countResult] = await Promise.all([
      base.clone().select('c.*').orderBy('c.created_at', 'desc').limit(limit).offset(offset),
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

  async findById(id: string) {
    const company = await this.db('companies').where({ id }).first()
    if (!company) return null

    const [types, contacts] = await Promise.all([
      this.db('company_types').where({ company_id: id }).pluck('type'),
      this.db('contacts').where({ company_id: id }).orderBy('is_primary', 'desc'),
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

  findContactById(id: string) {
    return this.db('contacts').where({ id }).first()
  }

  findContactByBitrixId(bitrixContactId: string) {
    return this.db('contacts').where({ bitrix_contact_id: bitrixContactId }).first()
  }

  // Bỏ cờ is_primary của các contact khác trong cùng company — chỉ 1 contact
  // được là primary mỗi company.
  clearPrimaryContact(companyId: string, exceptContactId: string | null, trx: Knex.Transaction) {
    const q = trx('contacts').where({ company_id: companyId }).update({ is_primary: false })
    if (exceptContactId) q.whereNot({ id: exceptContactId })
    return q
  }

  async addContact(companyId: string, data: CreateContactBody, trx: Knex.Transaction) {
    const [contact] = await trx('contacts')
      .insert({ ...data, company_id: companyId })
      .returning('*')
    return contact
  }

  async updateContact(id: string, data: UpdateContactBody, trx: Knex.Transaction) {
    const [contact] = await trx('contacts').where({ id }).update(data).returning('*')
    return contact
  }

  deleteContact(id: string) {
    return this.db('contacts').where({ id }).del()
  }

  deleteCompany(id: string) {
    return this.db('companies').where({ id }).update({ is_active: false, updated_at: this.db.fn.now() })
  }
}
