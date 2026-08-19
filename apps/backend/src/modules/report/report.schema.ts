export const inventoryReportSchema = {
  querystring: {
    type: 'object',
    properties: {
      warehouse_id: { type: 'string', format: 'uuid' },
    },
  },
}

export const revenueReportSchema = {
  querystring: {
    type: 'object',
    properties: {
      from:     { type: 'string', format: 'date' },
      to:       { type: 'string', format: 'date' },
      group_by: { type: 'string', enum: ['day', 'month'], default: 'day' },
    },
  },
}

export const topProductsSchema = {
  querystring: {
    type: 'object',
    properties: {
      from:  { type: 'string', format: 'date' },
      to:    { type: 'string', format: 'date' },
      limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
    },
  },
}

export interface InventoryReportQuery {
  warehouse_id?: string
}

export interface RevenueReportQuery {
  from?: string
  to?: string
  group_by?: 'day' | 'month'
}

export interface TopProductsQuery {
  from?: string
  to?: string
  limit?: number
}

export const stockFlowSchema = {
  querystring: {
    type: 'object',
    properties: {
      from:     { type: 'string', format: 'date' },
      to:       { type: 'string', format: 'date' },
      group_by: { type: 'string', enum: ['day', 'month'], default: 'day' },
    },
  },
}

export const lowStockItemsSchema = {
  querystring: {
    type: 'object',
    properties: {
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    },
  },
}

export interface StockFlowQuery {
  from?: string
  to?: string
  group_by?: 'day' | 'month'
}

export interface LowStockItemsQuery {
  limit?: number
}
