export const TRANSFER_TYPES = ['transfer', 'warranty_in', 'demo_in', 'qc_pass', 'sn_ready'] as const

export const createTransferSchema = {
  body: {
    type: 'object',
    // from_warehouse_id KHÔNG bắt buộc ở schema: với transfer_type khác "transfer"
    // (warranty_in/demo_in/qc_pass/sn_ready), service tự suy ra kho ảo nguồn theo
    // CLAUDE.md mục 10 — chỉ "transfer" thường mới cần client tự chọn from_warehouse_id.
    required: ['code', 'transfer_type', 'to_warehouse_id', 'lines'],
    properties: {
      code:              { type: 'string', minLength: 1 },
      transfer_type:     { type: 'string', enum: TRANSFER_TYPES },
      from_warehouse_id: { type: 'string', format: 'uuid' },
      to_warehouse_id:   { type: 'string', format: 'uuid' },
      note:              { type: 'string' },
      lines: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['variant_id', 'quantity'],
          properties: {
            variant_id: { type: 'string', format: 'uuid' },
            quantity:   { type: 'integer', minimum: 1 },
            line_order: { type: 'integer' },
            note:       { type: 'string' },
          },
        },
      },
    },
  },
}

export const listTransferSchema = {
  querystring: {
    type: 'object',
    properties: {
      status:        { type: 'string' },
      transfer_type: { type: 'string', enum: TRANSFER_TYPES },
      page:          { type: 'integer', minimum: 1, default: 1 },
      limit:         { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    },
  },
}

export const completeTransferSchema = {
  body: {
    type: 'object',
    properties: {
      lines: {
        type: 'array',
        items: {
          type: 'object',
          required: ['line_id'],
          properties: {
            line_id: { type: 'string', format: 'uuid' },
            serials: { type: 'array', items: { type: 'string', minLength: 1 } },
          },
        },
      },
    },
  },
}

export type TransferType = (typeof TRANSFER_TYPES)[number]

export interface CreateTransferBody {
  code: string
  transfer_type: TransferType
  from_warehouse_id?: string
  to_warehouse_id: string
  note?: string
  lines: Array<{
    variant_id: string
    quantity: number
    line_order?: number
    note?: string
  }>
}

export interface ListTransferQuery {
  status?: string
  transfer_type?: TransferType
  page?: number
  limit?: number
}

export interface CompleteTransferBody {
  lines?: Array<{ line_id: string; serials?: string[] }>
}
