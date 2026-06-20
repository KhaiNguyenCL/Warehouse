import { Knex } from 'knex'
import { CreateCustomFieldBody, UpdateCustomFieldBody } from './customfield.schema'

export class CustomFieldRepository {
  constructor(private db: Knex) {}

  findAll(objectType: string) {
    return this.db('custom_fields').where({ object_type: objectType }).orderBy('sort_order')
  }

  findById(id: string) {
    return this.db('custom_fields').where({ id }).first()
  }

  findByIds(ids: string[]) {
    if (ids.length === 0) return Promise.resolve([])
    return this.db('custom_fields').whereIn('id', ids)
  }

  insert(data: CreateCustomFieldBody) {
    return this.db('custom_fields')
      .insert({ ...data, options: data.options ? JSON.stringify(data.options) : null, is_system: false })
      .returning('*')
  }

  update(id: string, data: UpdateCustomFieldBody) {
    const payload: Record<string, unknown> = { ...data }
    if ('options' in payload) payload.options = data.options ? JSON.stringify(data.options) : null
    return this.db('custom_fields').where({ id }).update(payload).returning('*')
  }

  delete(id: string) {
    return this.db('custom_fields').where({ id }).del()
  }

  findValues(objectType: string, objectId: string) {
    return this.db('field_values as fv')
      .join('custom_fields as cf', 'cf.id', 'fv.field_id')
      .where({ 'fv.object_type': objectType, 'fv.object_id': objectId })
      .select('fv.id', 'fv.field_id', 'fv.value', 'cf.field_name', 'cf.field_label', 'cf.field_type', 'cf.options')
      .orderBy('cf.sort_order')
  }

  // Replace toàn bộ field_values của 1 object instance — cùng pattern với
  // replaceSections/replaceMappings ở các module khác (xoá hết, insert lại theo input mới).
  async replaceValues(
    objectType: string,
    objectId: string,
    values: Array<{ field_id: string; value: string | null | undefined }>,
    trx: Knex.Transaction,
  ) {
    await trx('field_values').where({ object_type: objectType, object_id: objectId }).del()
    const rows = values.filter((v) => v.value !== null && v.value !== undefined)
    if (rows.length === 0) return
    await trx('field_values').insert(
      rows.map((v) => ({ object_type: objectType, object_id: objectId, field_id: v.field_id, value: v.value })),
    )
  }
}
