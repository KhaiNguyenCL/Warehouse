// 7 export_type "hệ thống" — applySerialTransition() trong delivery.service.ts chỉ biết xử lý
// đúng 7 key này. Export_type tự tạo qua Settings (bảng export_types) phải set parent_key về
// 1 trong 7 giá trị này để được xử lý đúng (xem resolveEffectiveExportType()).
export const SYSTEM_EXPORT_TYPES = [
  'sale',
  'internal',
  'demo_out',
  'warranty_out',
  'return_out',
  'dispose',
  'adjustment',
] as const

export const createDeliverySchema = {
  body: {
    type: 'object',
    required: ['export_type', 'warehouse_id', 'lines'],
    properties: {
      // Không còn enum hardcode — chấp nhận bất kỳ key đang active trong bảng export_types
      // (Settings module). Service layer tra bảng đó để validate thật và đọc
      // requires_company/requires_quotation, để type mới thêm qua Settings dùng được ngay.
      export_type:  { type: 'string', minLength: 1 },
      company_id:   { type: 'string', format: 'uuid' },
      contact_id:   { type: 'string', format: 'uuid' },
      warehouse_id: { type: 'string', format: 'uuid' },
      quotation_id: { type: 'string', format: 'uuid' },
      // Dùng cho export_type="adjustment" — tham chiếu Stocktake Result gốc (CLAUDE.md mục 8/9).
      ref_document_type: { type: 'string' },
      ref_document_id:   { type: 'string', format: 'uuid' },
      reason:       { type: 'string' },
      note:         { type: 'string' },
      lines: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['variant_id', 'quantity'],
          properties: {
            variant_id:               { type: 'string', format: 'uuid' },
            quantity:                 { type: 'integer', minimum: 1 },
            bundle_id:                { type: 'string', format: 'uuid' },
            // Số lượng bundle đơn vị mà dòng component này đại diện — bắt buộc khi bundle_id có.
            // Dùng để tính tiến độ xuất kho theo báo giá ở mức bundle, không phải mức component.
            bundle_unit_qty:          { type: 'integer', minimum: 1 },
            quotation_line_item_id:   { type: 'string', format: 'uuid' },
            // Ngày bắt đầu BH công ty — tuỳ chọn, nếu null dùng completed_at lúc Complete.
            customer_warranty_start:  { type: 'string', format: 'date-time' },
            line_order:               { type: 'integer' },
            note:                     { type: 'string' },
          },
        },
      },
    },
  },
}

export const listDeliverySchema = {
  querystring: {
    type: 'object',
    properties: {
      status:       { type: 'string' },
      export_type:  { type: 'string' },
      warehouse_id: { type: 'string' },
      page:         { type: 'integer', minimum: 1, default: 1 },
      limit:        { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    },
  },
}

// Giống completeReceiptSchema — chỉ cần serials cho dòng storable, khai báo lúc Complete
// (lúc nhân viên kho thực sự lấy hàng ra khỏi kệ, quét đúng SN sắp xuất).
export const completeDeliverySchema = {
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

export type SystemExportType = (typeof SYSTEM_EXPORT_TYPES)[number]

export interface CreateDeliveryBody {
  export_type: string
  company_id?: string
  contact_id?: string
  warehouse_id: string
  quotation_id?: string
  ref_document_type?: string
  ref_document_id?: string
  reason?: string
  note?: string
  lines: Array<{
    variant_id: string
    quantity: number
    bundle_id?: string
    bundle_unit_qty?: number
    quotation_line_item_id?: string
    customer_warranty_start?: string
    line_order?: number
    note?: string
  }>
}

export interface ListDeliveryQuery {
  status?: string
  export_type?: string
  warehouse_id?: string
  page?: number
  limit?: number
}

export interface CompleteDeliveryBody {
  lines?: Array<{ line_id: string; serials?: string[] }>
}
