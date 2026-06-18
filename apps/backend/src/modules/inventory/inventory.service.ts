import { Knex } from 'knex'
import { InventoryRepository } from './inventory.repository'

export class InventoryService {
  private repo: InventoryRepository

  constructor(private db: Knex) {
    this.repo = new InventoryRepository(db)
  }
}
