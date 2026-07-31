import { Knex } from 'knex'
import { ListTemplateQuery, MappingInput, UpdateTemplateBody } from './template.schema'

export class TemplateRepository {
  constructor(private db: Knex) {}

  async findAll(query: ListTemplateQuery) {
    const { object_type, page = 1, limit = 20 } = query
    const offset = (page - 1) * limit

    const base = this.db('document_templates')
    if (object_type) base.where({ object_type })

    const [data, countResult] = await Promise.all([
      base.clone().orderBy('created_at', 'desc').limit(limit).offset(offset),
      base.clone().clearSelect().count('id as count').first(),
    ])

    return { data, total: Number(countResult?.count ?? 0), page, limit }
  }

  findById(id: string) {
    return this.db('document_templates').where({ id }).first()
  }

  insert(row: Record<string, unknown>) {
    return this.db('document_templates').insert(row).returning('*')
  }

  update(id: string, data: UpdateTemplateBody, trx: Knex.Transaction | Knex = this.db) {
    return trx('document_templates').where({ id }).update({ ...data }).returning('*')
  }

  // Mỗi object_type chỉ nên có 1 template is_default=true (template được chọn sẵn khi
  // xuất, không phải chọn tay mỗi lần) — clear cờ default ở các template khác cùng loại
  // TRƯỚC khi set template hiện tại, giống cơ chế is_primary contact ở company module.
  clearDefaultForObjectType(objectType: string, excludeId: string, trx: Knex.Transaction) {
    return trx('document_templates')
      .where({ object_type: objectType, is_default: true })
      .andWhereNot({ id: excludeId })
      .update({ is_default: false })
  }

  findMappings(templateId: string) {
    return this.db('template_field_mappings').where({ template_id: templateId })
  }

  async delete(id: string) {
    await this.db('template_field_mappings').where({ template_id: id }).del()
    return this.db('document_templates').where({ id }).del()
  }

  async replaceMappings(templateId: string, mappings: MappingInput[], trx: Knex.Transaction) {
    await trx('template_field_mappings').where({ template_id: templateId }).del()
    if (mappings.length === 0) return []
    return trx('template_field_mappings')
      .insert(mappings.map((m) => ({ ...m, template_id: templateId })))
      .returning('*')
  }
}
