export const PO_STATUSES = ['draft', 'confirmed', 'cancelled'] as const

const lineItemProperties = {
  variant_id:      { type: 'string', format: 'uuid' },
  quantity:        { type: 'integer', minimum: 1 },
  unit_price:      { type: 'number', minimum: 0 },
  warranty_months: { type: 'integer', minimum: 0 },
  line_order:      { type: 'integer' },
  note:            { type: 'string' },
}

export const createPurchaseOrderSchema = {
  body: {
    type: 'object',
    required: ['code', 'company_id', 'lines'],
    properties: {
      code:           { type: 'string', minLength: 1 },
      company_id:     { type: 'string', format: 'uuid' },
      contact_id:     { type: 'string', format: 'uuid' },
      bitrix_deal_id: { type: 'string' },
      note:           { type: 'string' },
      lines: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['variant_id', 'quantity', 'unit_price'],
          properties: lineItemProperties,
        },
      },
    },
  },
}

export const updatePurchaseOrderSchema = {
  body: {
    type: 'object',
    properties: {
      company_id:     { type: 'string', format: 'uuid' },
      contact_id:     { type: 'string', format: 'uuid' },
      bitrix_deal_id: { type: 'string' },
      note:           { type: 'string' },
      lines: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['variant_id', 'quantity', 'unit_price'],
          properties: lineItemProperties,
        },
      },
    },
  },
}

export const listPurchaseOrderSchema = {
  querystring: {
    type: 'object',
    properties: {
      status:     { type: 'string', enum: PO_STATUSES },
      company_id: { type: 'string', format: 'uuid' },
      search:     { type: 'string' },
      page:       { type: 'integer', minimum: 1, default: 1 },
      limit:      { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    },
  },
}

export type PurchaseOrderStatus = (typeof PO_STATUSES)[number]

export interface PurchaseOrderLineInput {
  variant_id: string
  quantity: number
  unit_price: number
  warranty_months?: number
  line_order?: number
  note?: string
}

export interface CreatePurchaseOrderBody {
  code: string
  company_id: string
  contact_id?: string
  bitrix_deal_id?: string
  note?: string
  lines: PurchaseOrderLineInput[]
}

export interface UpdatePurchaseOrderBody extends Partial<Omit<CreatePurchaseOrderBody, 'lines'>> {
  lines?: PurchaseOrderLineInput[]
}

export interface ListPurchaseOrderQuery {
  status?: PurchaseOrderStatus
  company_id?: string
  search?: string
  page?: number
  limit?: number
}
