import { Knex } from 'knex'
import { WarehouseRepository } from './warehouse.repository'

export class WarehouseService {
  private repo: WarehouseRepository

  constructor(private db: Knex) {
    this.repo = new WarehouseRepository(db)
  }
}
