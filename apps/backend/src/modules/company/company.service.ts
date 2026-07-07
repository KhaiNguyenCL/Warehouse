import { Knex } from 'knex'
import { CompanyRepository } from './company.repository'
import {
  CreateCompanyBody,
  UpdateCompanyBody,
  ListCompanyQuery,
  CreateContactBody,
  UpdateContactBody,
} from './company.schema'

// Postgres SQLSTATE codes — map sang lỗi nghiệp vụ dễ hiểu thay vì để lộ lỗi DB thô ra API.
const PG_UNIQUE_VIOLATION = '23505'

function mapDbError(err: any): never {
  if (err.code === PG_UNIQUE_VIOLATION) {
    throw { statusCode: 409, message: 'Mã công ty đã tồn tại' }
  }
  throw err
}

export class CompanyService {
  private repo: CompanyRepository

  constructor(private db: Knex) {
    this.repo = new CompanyRepository(db)
  }

  // ─── Companies ─────────────────────────────────────────────────────────

  list(query: ListCompanyQuery) {
    return this.repo.findAll(query)
  }

  async getById(id: string) {
    const company = await this.repo.findById(id)
    if (!company) throw { statusCode: 404, message: 'Company not found' }
    return company
  }

  async create(data: CreateCompanyBody) {
    try {
      return await this.db.transaction((trx) => this.repo.create(data, trx))
    } catch (err) {
      mapDbError(err)
    }
  }

  async update(id: string, data: UpdateCompanyBody) {
    const existing = await this.repo.findById(id)
    if (!existing) throw { statusCode: 404, message: 'Company not found' }

    try {
      return await this.db.transaction((trx) => this.repo.update(id, data, trx))
    } catch (err) {
      mapDbError(err)
    }
  }

  // ─── Contacts ──────────────────────────────────────────────────────────

  async addContact(companyId: string, data: CreateContactBody) {
    const company = await this.repo.findById(companyId)
    if (!company) throw { statusCode: 404, message: 'Company not found' }

    return this.db.transaction(async (trx) => {
      if (data.is_primary) {
        await this.repo.clearPrimaryContact(companyId, null, trx)
      }
      return this.repo.addContact(companyId, data, trx)
    })
  }

  async updateContact(companyId: string, contactId: string, data: UpdateContactBody) {
    const contact = await this.repo.findContactById(contactId)
    if (!contact || contact.company_id !== companyId) {
      throw { statusCode: 404, message: 'Contact not found' }
    }

    return this.db.transaction(async (trx) => {
      if (data.is_primary) {
        await this.repo.clearPrimaryContact(companyId, contactId, trx)
      }
      return this.repo.updateContact(contactId, data, trx)
    })
  }

  async deleteContact(companyId: string, contactId: string) {
    const contact = await this.repo.findContactById(contactId)
    if (!contact || contact.company_id !== companyId) {
      throw { statusCode: 404, message: 'Contact not found' }
    }
    await this.repo.deleteContact(contactId)
  }

  async deleteCompany(id: string) {
    const existing = await this.repo.findById(id)
    if (!existing) throw { statusCode: 404, message: 'Company not found' }
    await this.repo.deleteCompany(id)
  }
}
