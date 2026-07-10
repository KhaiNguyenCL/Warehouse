import { Knex } from 'knex'
import { CreateWarehouseBody, UpdateWarehouseBody, ListWarehouseQuery } from './warehouse.schema'

export class WarehouseRepository {
  constructor(private db: Knex) {}

  findAll(query: ListWarehouseQuery) {
    const { type, is_active, search } = query
    const base = this.db('warehouses').select('*')

    if (type) base.where('type', type)
    base.where('is_active', is_active ?? true)
    if (search) {
      base.where((qb) => {
        qb.whereILike('name', `%${search}%`).orWhereILike('code', `%${search}%`)
      })
    }

    return base.orderBy('code')
  }

  findById(id: string) {
    return this.db('warehouses').where({ id }).first()
  }

  createWarehouse(data: CreateWarehouseBody) {
    return this.db('warehouses').insert(data).returning('*').then(([row]) => row)
  }

  async updateWarehouse(id: string, data: UpdateWarehouseBody) {
    return this.db.transaction(async (trx) => {
      // Chỉ 1 kho được là default — nếu set is_default=true cho kho này thì bỏ kho cũ
      if (data.is_default) {
        await trx('warehouses').where('is_default', true).update({ is_default: false })
      }
      const [row] = await trx('warehouses')
        .where({ id })
        .update({ ...data, updated_at: trx.fn.now() })
        .returning('*')
      return row
    })
  }

  deleteWarehouse(id: string) {
    return this.db('warehouses').where({ id }).update({ is_active: false, updated_at: this.db.fn.now() })
  }

  hasInventory(id: string) {
    return this.db('inventory').where({ warehouse_id: id }).where('qty_on_hand', '>', 0).first()
  }
}
