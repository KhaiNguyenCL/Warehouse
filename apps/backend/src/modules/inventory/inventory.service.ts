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
    if (!query.receipt_line_id && !query.search) {
      throw { statusCode: 400, message: 'Cần truyền receipt_line_id hoặc search' }
    }
    return this.repo.findSerials(query)
  }

  serialMovements(serialId: string) {
    return this.repo.findMovementsBySerial(serialId)
  }

  lowStock(query: ListLowStockQuery) {
    return this.repo.findLowStock(query)
  }
}
