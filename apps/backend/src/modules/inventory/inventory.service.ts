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
    if (!query.receipt_line_id && !query.search && !(query.variant_id && query.warehouse_id)) {
      throw { statusCode: 400, message: 'Cần truyền receipt_line_id, search, hoặc variant_id+warehouse_id' }
    }
    return this.repo.findSerials(query)
  }

  async updateSerial(id: string, data: { serial_no?: string; mac_address?: string | null; note?: string | null }) {
    const sn = await this.repo.findSerialById(id)
    if (!sn) throw { statusCode: 404, message: 'Serial number không tồn tại' }
    return this.repo.updateSerial(id, data)
  }

  serialMovements(serialId: string) {
    return this.repo.findMovementsBySerial(serialId)
  }

  lowStock(query: ListLowStockQuery) {
    return this.repo.findLowStock(query)
  }
}
