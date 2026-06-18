import { Knex } from 'knex'
import { CompanyRepository } from './company.repository'

export class CompanyService {
  private repo: CompanyRepository

  constructor(private db: Knex) {
    this.repo = new CompanyRepository(db)
  }
}
