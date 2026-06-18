import { Knex } from 'knex'
import { BitrixRepository } from './bitrix.repository'

export class BitrixService {
  private repo: BitrixRepository

  constructor(private db: Knex) {
    this.repo = new BitrixRepository(db)
  }
}
