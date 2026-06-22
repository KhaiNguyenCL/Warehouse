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

// "Lô hàng" — breakdown receipt_lines theo từng lần nhập của 1 SKU/kho (giá, bảo hành,
// qty_remaining riêng từng lô) — inventory chỉ có số TỔNG HỢP (qty_on_hand/avg_cost),
// không thấy được "lô nào còn bao nhiêu, giá/bảo hành lô đó là gì" (CLAUDE.md mục 16).
export const listLotsSchema = {
  querystring: {
    type: 'object',
    required: ['variant_id'],
    properties: {
      variant_id:   { type: 'string', format: 'uuid' },
      warehouse_id: { type: 'string', format: 'uuid' },
    },
  },
}

export interface ListLotsQuery {
  variant_id: string
  warehouse_id?: string
}

// Chi tiết từng Serial Number của 1 lô (receipt_line) — drill-down từ "Xem lô" xuống
// từng cái vật lý cụ thể (serial_no, trạng thái, bảo hành, MAC...).
export const listSerialsSchema = {
  querystring: {
    type: 'object',
    required: ['receipt_line_id'],
    properties: {
      receipt_line_id: { type: 'string', format: 'uuid' },
    },
  },
}

export interface ListSerialsQuery {
  receipt_line_id: string
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
