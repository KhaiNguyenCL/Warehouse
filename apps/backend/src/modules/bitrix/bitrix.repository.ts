import { Knex } from 'knex'
import { MappingInput } from './bitrix.schema'

export class BitrixRepository {
  constructor(private db: Knex) {}

  findMappings() {
    return this.db('bitrix_field_mappings')
  }

  async replaceMappings(mappings: MappingInput[], trx: Knex.Transaction) {
    await trx('bitrix_field_mappings').del()
    if (mappings.length === 0) return []
    return trx('bitrix_field_mappings').insert(mappings).returning('*')
  }

  findQuotationById(id: string) {
    return this.db('quotations').where({ id }).first()
  }

  updateQuotation(id: string, data: Record<string, unknown>) {
    return this.db('quotations').where({ id }).update({ ...data, updated_at: this.db.fn.now() }).returning('*')
  }
}
