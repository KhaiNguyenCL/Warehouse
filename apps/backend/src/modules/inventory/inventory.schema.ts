export const listInventorySchema = {
  querystring: {
    type: 'object',
    properties: {
      variant_id:   { type: 'string', format: 'uuid' },
      warehouse_id: { type: 'string', format: 'uuid' },
      product_id:   { type: 'string', format: 'uuid' },
      category_id:  { type: 'string', format: 'uuid' },
      brand_id:     { type: 'string', format: 'uuid' },
      product_type: { type: 'string', enum: ['storable', 'consumable', 'service', 'bundle'] },
      search:       { type: 'string' },
      page:         { type: 'integer', minimum: 1, default: 1 },
      limit:        { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    },
  },
}

export interface ListInventoryQuery {
  variant_id?: string
  warehouse_id?: string
  product_id?: string
  category_id?: string
  brand_id?: string
  product_type?: string
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
// từng cái vật lý cụ thể (serial_no, trạng thái, bảo hành, MAC...). Hoặc tra ngược trực
// tiếp theo serial_no (search) khi chỉ có 1 SN vật lý trong tay, không biết trước SKU/kho/
// lô — serial_numbers.serial_no UNIQUE nên tra thẳng được, không cần drill 3 tầng. Validate
// "phải có 1 trong 2" ở service.ts (giống pattern cross-field validation khác trong dự án),
// không dùng JSON schema oneOf cho dễ đọc lỗi.
export const listSerialsSchema = {
  querystring: {
    type: 'object',
    properties: {
      receipt_line_id: { type: 'string', format: 'uuid' },
      search:          { type: 'string', minLength: 1 },
      // Mode chọn SN khi Complete phiếu xuất: trả tất cả SN active của 1 SKU trong 1 kho,
      // kèm đầy đủ thông tin lô (receipt, cost, warranty, PO) để user filter/chọn trực tiếp.
      variant_id:      { type: 'string', format: 'uuid' },
      warehouse_id:    { type: 'string', format: 'uuid' },
    },
  },
}

export interface ListSerialsQuery {
  receipt_line_id?: string
  search?: string
  variant_id?: string
  warehouse_id?: string
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
