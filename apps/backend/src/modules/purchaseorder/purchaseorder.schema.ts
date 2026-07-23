export const PO_STATUSES = ['draft', 'confirmed', 'cancelled'] as const

const lineItemProperties = {
  variant_id:                    { type: 'string', format: 'uuid' },
  quantity:                      { type: 'integer', minimum: 1 },
  unit_price:                    { type: 'number', minimum: 0 },
  vat_percent:                   { type: 'number', minimum: 0, maximum: 100 },
  manufacturer_warranty_months:  { type: 'integer', minimum: 0 },
  customer_warranty_months:      { type: 'integer', minimum: 0 },
  line_order:      { type: 'integer' },
  note:            { type: 'string' },
  // Giá trị custom field (object_type="variant", applies_to_po_line=true) lưu riêng theo
  // dòng PO này — không lẫn với giá trị mặc định trên variant (xem
  // customfield.schema.ts::applies_to_po_line).
  custom_field_values: {
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
}

export const createPurchaseOrderSchema = {
  body: {
    type: 'object',
    required: ['company_id', 'lines'],
    properties: {
      company_id:       { type: 'string', format: 'uuid' },
      contact_id:       { type: 'string', format: 'uuid' },
      bitrix_deal_id:   { type: 'string' },
      bitrix_deal_url:  { type: 'string' },
      deal_title:       { type: 'string' },
      deal_amount:      { type: 'number', minimum: 0 },
      contract_number:    { type: 'string' },
      region:             { type: 'string' },
      delivery_location:  { type: 'string' },
      start_date:         { type: 'string', format: 'date' },
      end_date:           { type: 'string', format: 'date' },
      note:               { type: 'string' },
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
      company_id:       { type: 'string', format: 'uuid' },
      contact_id:       { type: 'string', format: 'uuid' },
      bitrix_deal_id:   { type: 'string' },
      bitrix_deal_url:  { type: 'string' },
      deal_title:       { type: 'string' },
      deal_amount:      { type: 'number', minimum: 0 },
      contract_number:    { type: 'string' },
      region:             { type: 'string' },
      delivery_location:  { type: 'string' },
      start_date:         { type: 'string', format: 'date' },
      end_date:           { type: 'string', format: 'date' },
      note:               { type: 'string' },
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
  vat_percent?: number
  manufacturer_warranty_months?: number
  customer_warranty_months?: number
  line_order?: number
  note?: string
  custom_field_values?: Array<{ field_id: string; value: string | null }>
}

export interface CreatePurchaseOrderBody {
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
