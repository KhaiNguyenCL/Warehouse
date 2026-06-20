export const TEMPLATE_OBJECT_TYPES = ['quotation', 'receipt', 'delivery_order'] as const
export const MAPPING_SOURCE_TYPES = ['database', 'bitrix'] as const

export const listTemplateSchema = {
  querystring: {
    type: 'object',
    properties: {
      object_type: { type: 'string', enum: TEMPLATE_OBJECT_TYPES },
      page:        { type: 'integer', minimum: 1, default: 1 },
      limit:       { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    },
  },
}

export const updateTemplateSchema = {
  body: {
    type: 'object',
    properties: {
      name:       { type: 'string', minLength: 1 },
      is_active:  { type: 'boolean' },
      is_default: { type: 'boolean' },
    },
  },
}

export const replaceMappingsSchema = {
  body: {
    type: 'object',
    required: ['mappings'],
    properties: {
      mappings: {
        type: 'array',
        items: {
          type: 'object',
          required: ['template_variable', 'source_type'],
          properties: {
            template_variable: { type: 'string', minLength: 1 },
            source_type:       { type: 'string', enum: MAPPING_SOURCE_TYPES },
            database_field:    { type: 'string' },
            bitrix_field:      { type: 'string' },
            is_required:       { type: 'boolean' },
          },
        },
      },
    },
  },
}

export const exportTemplateSchema = {
  body: {
    type: 'object',
    required: ['object_id'],
    properties: {
      object_id: { type: 'string', format: 'uuid' },
      format:    { type: 'string', enum: ['xlsx', 'pdf'], default: 'xlsx' },
    },
  },
}

export type TemplateObjectType = (typeof TEMPLATE_OBJECT_TYPES)[number]
export type MappingSourceType = (typeof MAPPING_SOURCE_TYPES)[number]

export interface UpdateTemplateBody {
  name?: string
  is_active?: boolean
  is_default?: boolean
}

export interface ListTemplateQuery {
  object_type?: TemplateObjectType
  page?: number
  limit?: number
}

export interface MappingInput {
  template_variable: string
  source_type: MappingSourceType
  database_field?: string
  bitrix_field?: string
  is_required?: boolean
}

export interface ReplaceMappingsBody {
  mappings: MappingInput[]
}

export interface ExportTemplateBody {
  object_id: string
  format?: 'xlsx' | 'pdf'
}

export interface UploadTemplateInput {
  name: string
  object_type: string
  fileBuffer: Buffer
  fileName: string
}
