export const STOCKTAKE_STATUSES = ['in_progress', 'completed', 'cancelled'] as const
export const SCOPE_TYPES = ['all', 'by_sku', 'by_category'] as const

export const createStocktakeSchema = {
  body: {
    type: 'object',
    required: ['warehouse_id'],
    properties: {
      warehouse_id: { type: 'string', format: 'uuid' },
      scope_type:   { type: 'string', enum: SCOPE_TYPES, default: 'all' },
      // SKU (variant_id) khi scope_type='by_sku', category_id khi scope_type='by_category'.
      scope_ids:    { type: 'array', items: { type: 'string', format: 'uuid' } },
      note:         { type: 'string' },
    },
  },
}

export const STOCKTAKE_SORTABLE = ['code', 'status', 'started_at', 'created_at'] as const

export const listStocktakeSchema = {
  querystring: {
    type: 'object',
    properties: {
      status:       { type: 'string', enum: STOCKTAKE_STATUSES },
      warehouse_id: { type: 'string', format: 'uuid' },
      search:       { type: 'string' },
      sort_by:      { type: 'string', enum: STOCKTAKE_SORTABLE },
      sort_order:   { type: 'string', enum: ['asc', 'desc'] },
      page:         { type: 'integer', minimum: 1, default: 1 },
      limit:        { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    },
  },
}

export const completeStocktakeSchema = {
  body: {
    type: 'object',
    required: ['lines'],
    properties: {
      note: { type: 'string' },
      lines: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['line_id', 'qty_actual'],
          properties: {
            line_id:       { type: 'string', format: 'uuid' },
            qty_actual:    { type: 'integer', minimum: 0 },
            // Chỉ cần cho dòng storable — danh sách serial THỰC TẾ quét được lúc kiểm kê,
            // dùng đối chiếu ra found/missing/unexpected (xem stocktake.service.ts).
            found_serials: { type: 'array', items: { type: 'string', minLength: 1 } },
          },
        },
      },
    },
  },
}

export type StocktakeStatus = (typeof STOCKTAKE_STATUSES)[number]
export type ScopeType = (typeof SCOPE_TYPES)[number]

export interface CreateStocktakeBody {
  warehouse_id: string
  scope_type?: ScopeType
  scope_ids?: string[]
  note?: string
}

export interface ListStocktakeQuery {
  status?: StocktakeStatus
  warehouse_id?: string
  search?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  page?: number
  limit?: number
}

export interface CompleteStocktakeBody {
  note?: string
  lines: Array<{ line_id: string; qty_actual: number; found_serials?: string[] }>
}
