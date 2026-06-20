export const BITRIX_OBJECTS = ['deal', 'company', 'contact'] as const

export const replaceMappingsSchema = {
  body: {
    type: 'object',
    required: ['mappings'],
    properties: {
      mappings: {
        type: 'array',
        items: {
          type: 'object',
          required: ['quotation_field', 'bitrix_object', 'bitrix_field'],
          properties: {
            quotation_field: { type: 'string', minLength: 1 },
            bitrix_object:   { type: 'string', enum: BITRIX_OBJECTS },
            bitrix_field:    { type: 'string', minLength: 1 },
          },
        },
      },
    },
  },
}

export const syncQuotationSchema = {
  body: {
    type: 'object',
    properties: {
      deal_id: { type: 'string', minLength: 1 },
    },
  },
}

export const importContactSchema = {
  body: {
    type: 'object',
    properties: {
      // Company nội bộ để gắn contact vào — bỏ qua nếu contact.COMPANY_ID bên Bitrix
      // đã resolve được company đã import trước đó (qua bitrix_company_id).
      company_id: { type: 'string', format: 'uuid' },
    },
  },
}

export type BitrixObject = (typeof BITRIX_OBJECTS)[number]

export interface MappingInput {
  quotation_field: string
  bitrix_object: BitrixObject
  bitrix_field: string
}

export interface ReplaceMappingsBody {
  mappings: MappingInput[]
}

export interface SyncQuotationBody {
  deal_id?: string
}

export interface ImportContactBody {
  company_id?: string
}
