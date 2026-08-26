export const createShipmentSchema = {
  body: {
    type: 'object',
    required: ['warehouse_id', 'lines'],
    properties: {
      po_id:         { type: 'string', format: 'uuid' },
      supplier_id:   { type: 'string', format: 'uuid' },
      warehouse_id:  { type: 'string', format: 'uuid' },
      expected_date: { type: 'string', format: 'date-time' },
      notes:         { type: 'string' },
      attachments:   { type: 'array', items: { type: 'object' } },
      lines: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['variant_id', 'qty_expected'],
          properties: {
            variant_id:   { type: 'string', format: 'uuid' },
            po_line_id:   { type: 'string', format: 'uuid' },
            qty_expected: { type: 'integer', minimum: 1 },
            qty_received: { type: 'integer', minimum: 0 },
            condition:    { type: 'string', enum: ['good', 'damaged', 'missing'] },
            notes:        { type: 'string' },
            attachments:  { type: 'array', items: { type: 'object' } },
            line_order:   { type: 'integer' },
          },
        },
      },
    },
  },
}

export const updateShipmentSchema = {
  body: {
    type: 'object',
    properties: {
      supplier_id:   { type: 'string', format: 'uuid' },
      warehouse_id:  { type: 'string', format: 'uuid' },
      expected_date: { type: 'string', format: 'date-time' },
      notes:         { type: 'string' },
      attachments:   { type: 'array', items: { type: 'object' } },
    },
  },
}

export const receiveShipmentSchema = {
  body: {
    type: 'object',
    properties: {
      received_date: { type: 'string', format: 'date-time' },
      notes:         { type: 'string' },
      attachments:   { type: 'array', items: { type: 'object' } },
      lines: {
        type: 'array',
        items: {
          type: 'object',
          required: ['line_id'],
          properties: {
            line_id:      { type: 'string', format: 'uuid' },
            qty_received: { type: 'integer', minimum: 0 },
            condition:    { type: 'string', enum: ['good', 'damaged', 'missing'] },
            notes:        { type: 'string' },
            attachments:  { type: 'array', items: { type: 'object' } },
          },
        },
      },
    },
  },
}

export const listShipmentSchema = {
  querystring: {
    type: 'object',
    properties: {
      status:       { type: 'string' },
      po_id:        { type: 'string', format: 'uuid' },
      supplier_id:  { type: 'string', format: 'uuid' },
      warehouse_id: { type: 'string', format: 'uuid' },
      search:       { type: 'string' },
      sort_by:      { type: 'string' },
      sort_order:   { type: 'string', enum: ['asc', 'desc'] },
      page:         { type: 'integer', minimum: 1, default: 1 },
      limit:        { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    },
  },
}

export interface CreateShipmentBody {
  po_id?: string
  supplier_id?: string
  warehouse_id: string
  expected_date?: string
  notes?: string
  attachments?: object[]
  lines: Array<{
    variant_id: string
    po_line_id?: string
    qty_expected: number
    qty_received?: number
    condition?: 'good' | 'damaged' | 'missing'
    notes?: string
    attachments?: object[]
    line_order?: number
  }>
}

export interface UpdateShipmentBody {
  supplier_id?: string
  warehouse_id?: string
  expected_date?: string
  notes?: string
  attachments?: object[]
}

export interface ReceiveShipmentBody {
  received_date?: string
  notes?: string
  attachments?: object[]
  lines?: Array<{
    line_id: string
    qty_received?: number
    condition?: 'good' | 'damaged' | 'missing'
    notes?: string
    attachments?: object[]
  }>
}

export interface ListShipmentQuery {
  status?: string
  po_id?: string
  supplier_id?: string
  warehouse_id?: string
  search?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  page?: number
  limit?: number
}
