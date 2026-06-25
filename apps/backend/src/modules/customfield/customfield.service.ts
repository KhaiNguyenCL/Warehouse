import { Knex } from 'knex'
import { CustomFieldRepository } from './customfield.repository'
import { CreateCustomFieldBody, UpdateCustomFieldBody, SetValuesBody } from './customfield.schema'

const PG_UNIQUE_VIOLATION = '23505'
const PG_FOREIGN_KEY_VIOLATION = '23503'

export class CustomFieldService {
  private repo: CustomFieldRepository

  constructor(private db: Knex) {
    this.repo = new CustomFieldRepository(db)
  }

  list(objectType: string) {
    return this.repo.findAll(objectType)
  }

  async create(data: CreateCustomFieldBody) {
    if (data.field_type === 'select' && (!data.options || data.options.length === 0)) {
      throw { statusCode: 400, message: 'field_type "select" bắt buộc phải có options' }
    }
    try {
      const [field] = await this.repo.insert(data)
      return field
    } catch (err: any) {
      if (err.code === PG_UNIQUE_VIOLATION) {
        throw {
          statusCode: 409,
          message: `field_name "${data.field_name}" đã tồn tại cho object_type "${data.object_type}"`,
        }
      }
      throw err
    }
  }

  // Không cho sửa field_name/field_type/object_type sau khi tạo — field_values cũ đã
  // lưu theo field_type này, đổi field_type sẽ làm dữ liệu cũ sai nghĩa (vd "text" → "number").
  async update(id: string, data: UpdateCustomFieldBody) {
    const existing = await this.repo.findById(id)
    if (!existing) throw { statusCode: 404, message: 'Custom field not found' }

    if (existing.field_type === 'select' && data.options !== undefined && data.options.length === 0) {
      throw { statusCode: 400, message: 'field_type "select" bắt buộc phải có options' }
    }

    const [updated] = await this.repo.update(id, data)
    return updated
  }

  async delete(id: string) {
    const existing = await this.repo.findById(id)
    if (!existing) throw { statusCode: 404, message: 'Custom field not found' }
    if (existing.is_system) throw { statusCode: 400, message: 'Không thể xoá custom field hệ thống' }

    try {
      await this.repo.delete(id)
    } catch (err: any) {
      if (err.code === PG_FOREIGN_KEY_VIOLATION) {
        throw { statusCode: 400, message: 'Field này đang có dữ liệu (field_values) — không thể xoá' }
      }
      throw err
    }
  }

  getValues(objectType: string, objectId: string) {
    return this.repo.findValues(objectType, objectId)
  }

  async setValues(objectType: string, objectId: string, values: SetValuesBody['values']) {
    const fieldIds = [...new Set(values.map((v) => v.field_id))]
    const fields = await this.repo.findByIds(fieldIds)
    const fieldById = new Map(fields.map((f) => [f.id, f]))

    for (const v of values) {
      const field = fieldById.get(v.field_id)
      if (!field) throw { statusCode: 400, message: `Field "${v.field_id}" không tồn tại` }
      if (field.object_type !== objectType) {
        throw { statusCode: 400, message: `Field "${field.field_label}" không thuộc object_type "${objectType}"` }
      }
      if (v.value !== null && v.value !== undefined) {
        this.validateValue(field, v.value)
      }
    }

    await this.db.transaction((trx) => this.repo.replaceValues(objectType, objectId, values, trx))
    return this.getValues(objectType, objectId)
  }

  private validateValue(field: { field_type: string; field_label: string; options: string[] | null }, value: string) {
    validateCustomFieldValue(field, value)
  }
}

// Dùng lại ở cả CustomFieldService.setValues() (object_type chính chủ của field) và
// purchaseorder.service.ts (validate custom_field_values theo applies_to_po_line — field
// định nghĩa object_type="variant" nhưng giá trị lưu theo object_type="purchase_order_line").
export function validateCustomFieldValue(
  field: { field_type: string; field_label: string; options: string[] | null },
  value: string,
) {
  switch (field.field_type) {
    case 'number':
      if (Number.isNaN(Number(value))) {
        throw { statusCode: 400, message: `Giá trị "${field.field_label}" phải là số` }
      }
      break
    case 'date':
      if (Number.isNaN(Date.parse(value))) {
        throw { statusCode: 400, message: `Giá trị "${field.field_label}" phải là ngày hợp lệ` }
      }
      break
    case 'boolean':
      if (!['true', 'false'].includes(value)) {
        throw { statusCode: 400, message: `Giá trị "${field.field_label}" phải là true hoặc false` }
      }
      break
    case 'select':
      if (!(field.options ?? []).includes(value)) {
        throw {
          statusCode: 400,
          message: `Giá trị "${value}" không thuộc danh sách lựa chọn của "${field.field_label}"`,
        }
      }
      break
  }
}
