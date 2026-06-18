import { Knex } from 'knex'
import { QuotationRepository } from './quotation.repository'

export class QuotationService {
  private repo: QuotationRepository

  constructor(private db: Knex) {
    this.repo = new QuotationRepository(db)
  }
}
