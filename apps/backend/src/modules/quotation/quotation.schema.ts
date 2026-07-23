export const QUOTATION_STATUSES = ['draft', 'confirmed', 'expired', 'cancelled'] as const

const lineItemProperties = {
  variant_id:  { type: 'string', format: 'uuid' },
  bundle_id:   { type: 'string', format: 'uuid' },
  description: { type: 'string' },
  unit:        { type: 'string' },
  quantity:    { type: 'number', exclusiveMinimum: 0 },
  unit_price:  { type: 'number', minimum: 0 },
  warranty:    { type: 'string' },
  vat_percent: { type: 'number', minimum: 0, maximum: 100 },
  is_reserved: { type: 'boolean' },
  line_order:  { type: 'integer' },
  note:        { type: 'string' },
}

export const createQuotationSchema = {
  body: {
    type: 'object',
    required: ['company_id', 'sections'],
    properties: {
      company_id:        { type: 'string', format: 'uuid' },
      contact_id:        { type: 'string', format: 'uuid' },
      quote_number:      { type: 'string' },
      quote_date:        { type: 'string', format: 'date' },
      project_name:      { type: 'string' },
      delivery_location: { type: 'string' },
      warehouse_id:      { type: 'string', format: 'uuid' },
      valid_days:        { type: 'integer', minimum: 1 },
      terms:             { type: 'string' },
      note:              { type: 'string' },
      discount:          { type: 'number', minimum: 0 },
      bitrix_deal_id:    { type: 'string' },
      sections: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['name', 'line_items'],
          properties: {
            name:          { type: 'string', minLength: 1 },
            section_order: { type: 'integer' },
            line_items: {
              type: 'array',
              minItems: 1,
              items: {
                type: 'object',
                required: ['quantity', 'unit_price'],
                properties: lineItemProperties,
              },
            },
          },
        },
      },
    },
  },
}

export const updateQuotationSchema = {
  body: {
    type: 'object',
    properties: {
      company_id:        { type: 'string', format: 'uuid' },
      contact_id:        { type: 'string', format: 'uuid' },
      quote_number:      { type: 'string' },
      quote_date:        { type: 'string', format: 'date' },
      project_name:      { type: 'string' },
      delivery_location: { type: 'string' },
      warehouse_id:      { type: 'string', format: 'uuid' },
      valid_days:        { type: 'integer', minimum: 1 },
      terms:             { type: 'string' },
      note:              { type: 'string' },
      discount:          { type: 'number', minimum: 0 },
      bitrix_deal_id:    { type: 'string' },
      sections: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['name', 'line_items'],
          properties: {
            name:          { type: 'string', minLength: 1 },
            section_order: { type: 'integer' },
            line_items: {
              type: 'array',
              minItems: 1,
              items: {
                type: 'object',
                required: ['quantity', 'unit_price'],
                properties: lineItemProperties,
              },
            },
          },
        },
      },
    },
  },
}

export const listQuotationSchema = {
  querystring: {
    type: 'object',
    properties: {
      status:     { type: 'string', enum: QUOTATION_STATUSES },
      company_id: { type: 'string', format: 'uuid' },
      search:     { type: 'string' },
      page:       { type: 'integer', minimum: 1, default: 1 },
      limit:      { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    },
  },
}

export type QuotationStatus = (typeof QUOTATION_STATUSES)[number]

export interface QuotationLineItemInput {
  variant_id?: string
  bundle_id?: string
  description?: string
  unit?: string
  quantity: number
  unit_price: number
  warranty?: string
  vat_percent?: number
  is_reserved?: boolean
  line_order?: number
  note?: string
}

export interface QuotationSectionInput {
  name: string
  section_order?: number
  line_items: QuotationLineItemInput[]
}

export interface CreateQuotationBody {
  company_id: string
  contact_id?: string
  quote_number?: string
  quote_date?: string
  project_name?: string
  delivery_location?: string
  warehouse_id?: string
  valid_days?: number
  terms?: string
  note?: string
  discount?: number
  bitrix_deal_id?: string
  sections: QuotationSectionInput[]
}

export interface UpdateQuotationBody extends Partial<Omit<CreateQuotationBody, 'sections'>> {
  sections?: QuotationSectionInput[]
}

export interface ListQuotationQuery {
  status?: QuotationStatus
  company_id?: string
  search?: string
  page?: number
  limit?: number
}
