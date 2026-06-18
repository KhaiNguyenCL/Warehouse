export const listInventorySchema = {
  querystring: {
    type: 'object',
    properties: {
      variant_id:   { type: 'string', format: 'uuid' },
      warehouse_id: { type: 'string', format: 'uuid' },
      search:       { type: 'string' },
      page:         { type: 'integer', minimum: 1, default: 1 },
      limit:        { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    },
  },
}

export interface ListInventoryQuery {
  variant_id?: string
  warehouse_id?: string
  search?: string
  page?: number
  limit?: number
}

export const listLowStockSchema = {
  querystring: {
    type: 'object',
    properties: {
      page:  { type: 'integer', minimum: 1, default: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    },
  },
}

export interface ListLowStockQuery {
  page?: number
  limit?: number
}
