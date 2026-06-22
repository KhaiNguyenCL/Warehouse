import { Knex } from 'knex'
import { InventoryRepository } from './inventory.repository'
import { ListInventoryQuery, ListLowStockQuery, ListLotsQuery, ListSerialsQuery } from './inventory.schema'

export class InventoryService {
  private repo: InventoryRepository

  constructor(private db: Knex) {
    this.repo = new InventoryRepository(db)
  }

  list(query: ListInventoryQuery) {
    return this.repo.findAll(query)
  }

  lots(query: ListLotsQuery) {
    return this.repo.findLots(query)
  }

  serials(query: ListSerialsQuery) {
    return this.repo.findSerials(query)
  }

  lowStock(query: ListLowStockQuery) {
    return this.repo.findLowStock(query)
  }
}
