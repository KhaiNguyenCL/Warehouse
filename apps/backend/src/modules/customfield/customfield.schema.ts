export const FIELD_TYPES = ['text', 'number', 'date', 'select', 'boolean'] as const
export const CUSTOM_FIELD_OBJECT_TYPES = ['quotation', 'receipt', 'delivery_order', 'product', 'company'] as const

export const createCustomFieldSchema = {
  body: {
    type: 'object',
    required: ['field_name', 'field_label', 'field_type', 'object_type'],
    properties: {
      // field_name là machine key dùng trong form động — bắt buộc snake_case để tránh
      // lẫn với field_label (tên hiển thị, tự do).
      field_name:  { type: 'string', minLength: 1, pattern: '^[a-z][a-z0-9_]*$' },
      field_label: { type: 'string', minLength: 1 },
      field_type:  { type: 'string', enum: FIELD_TYPES },
      object_type: { type: 'string', enum: CUSTOM_FIELD_OBJECT_TYPES },
      options:     { type: 'array', items: { type: 'string', minLength: 1 } },
      sort_order:  { type: 'integer' },
    },
  },
}

export const updateCustomFieldSchema = {
  body: {
    type: 'object',
    properties: {
      field_label: { type: 'string', minLength: 1 },
      options:     { type: 'array', items: { type: 'string', minLength: 1 } },
      sort_order:  { type: 'integer' },
      is_active:   { type: 'boolean' },
    },
  },
}

export const listCustomFieldSchema = {
  querystring: {
    type: 'object',
    required: ['object_type'],
    properties: {
      object_type: { type: 'string', enum: CUSTOM_FIELD_OBJECT_TYPES },
    },
  },
}

export const getValuesSchema = {
  querystring: {
    type: 'object',
    required: ['object_type', 'object_id'],
    properties: {
      object_type: { type: 'string', enum: CUSTOM_FIELD_OBJECT_TYPES },
      object_id:   { type: 'string', format: 'uuid' },
    },
  },
}

export const setValuesSchema = {
  querystring: {
    type: 'object',
    required: ['object_type', 'object_id'],
    properties: {
      object_type: { type: 'string', enum: CUSTOM_FIELD_OBJECT_TYPES },
      object_id:   { type: 'string', format: 'uuid' },
    },
  },
  body: {
    type: 'object',
    required: ['values'],
    properties: {
      values: {
        type: 'array',
        items: {
          type: 'object',
          required: ['field_id'],
          properties: {
            field_id: { type: 'string', format: 'uuid' },
            value:    { type: ['string', 'null'] },
          },
        },
      },
    },
  },
}

export type FieldType = (typeof FIELD_TYPES)[number]
export type CustomFieldObjectType = (typeof CUSTOM_FIELD_OBJECT_TYPES)[number]

export interface CreateCustomFieldBody {
  field_name: string
  field_label: string
  field_type: FieldType
  object_type: CustomFieldObjectType
  options?: string[]
  sort_order?: number
}

export interface UpdateCustomFieldBody {
  field_label?: string
  options?: string[]
  sort_order?: number
  is_active?: boolean
}

export interface ListCustomFieldQuery {
  object_type: CustomFieldObjectType
}

export interface GetValuesQuery {
  object_type: CustomFieldObjectType
  object_id: string
}

export interface SetValuesQuery {
  object_type: CustomFieldObjectType
  object_id: string
}

export interface SetValuesBody {
  values: Array<{ field_id: string; value: string | null }>
}
