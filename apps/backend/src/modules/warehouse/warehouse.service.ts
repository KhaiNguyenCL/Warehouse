import { Knex } from 'knex'
import { WarehouseRepository } from './warehouse.repository'
import { CreateWarehouseBody, UpdateWarehouseBody, ListWarehouseQuery } from './warehouse.schema'

const PG_UNIQUE_VIOLATION = '23505'

function mapDbError(err: any): never {
  if (err.code === PG_UNIQUE_VIOLATION) {
    throw { statusCode: 409, message: 'Mã kho đã tồn tại' }
  }
  throw err
}

export class WarehouseService {
  private repo: WarehouseRepository

  constructor(private db: Knex) {
    this.repo = new WarehouseRepository(db)
  }

  list(query: ListWarehouseQuery) {
    return this.repo.findAll(query)
  }

  async getById(id: string) {
    const warehouse = await this.repo.findById(id)
    if (!warehouse) throw { statusCode: 404, message: 'Warehouse not found' }
    return warehouse
  }

  async create(data: CreateWarehouseBody) {
    try {
      return await this.repo.createWarehouse(data)
    } catch (err) {
      mapDbError(err)
    }
  }

  async update(id: string, data: UpdateWarehouseBody) {
    const existing = await this.repo.findById(id)
    if (!existing) throw { statusCode: 404, message: 'Warehouse not found' }

    try {
      return await this.repo.updateWarehouse(id, data)
    } catch (err) {
      mapDbError(err)
    }
  }

  async delete(id: string) {
    const existing = await this.repo.findById(id)
    if (!existing) throw { statusCode: 404, message: 'Warehouse not found' }
    const hasStock = await this.repo.hasInventory(id)
    if (hasStock) throw { statusCode: 409, message: 'Kho đang có tồn kho, không thể xóa' }
    await this.repo.deleteWarehouse(id)
  }
}
