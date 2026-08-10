// Schema cho module receipt — validate request body/query + định nghĩa type TypeScript.
// Đây là module PHỨC TẠP hơn auth vì có nested array (lines) — mỗi receipt có nhiều dòng hàng.

export const createReceiptSchema = {
  body: {
    type: 'object',
    required: ['import_type', 'warehouse_id', 'lines'],
    properties: {
      // Không còn enum hardcode — chấp nhận bất kỳ key đang active trong bảng import_types
      // (Settings module). Service layer (receipt.service.ts) tra bảng đó để validate thật
      // và đọc requires_ref_document, để type mới thêm qua Settings dùng được ngay.
      import_type:       { type: 'string', minLength: 1 },
      company_id:        { type: 'string', format: 'uuid' },   // format: 'uuid' tự validate đúng dạng UUID
      contact_id:        { type: 'string', format: 'uuid' },
      warehouse_id:      { type: 'string', format: 'uuid' },
      // PO gốc (tuỳ chọn) — phải ở status='confirmed' (receipt.service.ts validate).
      // Không phải mọi receipt purchase đều xuất phát từ 1 PO chính thức.
      po_id:             { type: 'string', format: 'uuid' },
      ref_document_type: { type: 'string' },
      ref_document_id:   { type: 'string', format: 'uuid' },
      received_date:     { type: 'string', format: 'date' },
      note:              { type: 'string' },
      // lines = mảng các dòng hàng nhập — mỗi receipt phải có ÍT NHẤT 1 dòng (minItems: 1)
      lines: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['variant_id', 'quantity', 'cost_price'],
          properties: {
            variant_id:      { type: 'string', format: 'uuid' },
            quantity:        { type: 'integer', minimum: 1 },     // không cho nhập số lượng <= 0
            cost_price:      { type: 'number', minimum: 0 },
            // Dòng PO gốc đang được nhận 1 phần/toàn bộ qua dòng này (tuỳ chọn).
            po_line_id:      { type: 'string', format: 'uuid' },
            // BH hãng: months + start date tuỳ chọn (nếu hãng tính từ ngày xuất xưởng/
            // giao hàng thay vì ngày nhập kho). Nếu start = null → dùng completed_at.
            // BH công ty: tính từ ngày bán (delivery completed_at).
            // Cả hai kế thừa từ PO line nếu receipt có po_line_id.
            manufacturer_warranty_months: { type: 'integer', minimum: 0 },
            manufacturer_warranty_start:  { type: 'string', format: 'date-time' },
            customer_warranty_months:     { type: 'integer', minimum: 0 },
            line_order:      { type: 'integer' },
            note:            { type: 'string' },
          },
        },
      },
    },
  },
}

// Schema cho query string của GET /receipts?status=...&page=...
// default: 1 / default: 20 — Fastify TỰ GÁN giá trị này nếu client không truyền,
// nên trong code (repository) luôn có sẵn page/limit, không cần check undefined.
export const listReceiptSchema = {
  querystring: {
    type: 'object',
    properties: {
      status:       { type: 'string' },
      import_type:  { type: 'string' },
      warehouse_id: { type: 'string' },
      search:       { type: 'string' },
      sort_by:      { type: 'string', enum: ['code', 'status', 'created_at', 'import_type', 'company_name'] },
      sort_order:   { type: 'string', enum: ['asc', 'desc'] },
      page:         { type: 'integer', minimum: 1, default: 1 },
      limit:        { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    },
  },
}

// Schema cho PATCH /receipts/:id/complete — chỉ cần khi receipt có dòng hàng "storable"
// (CLAUDE.md mục 5: storable bắt buộc có serial number). serials không cần ở bước
// tạo phiếu vì hàng "chưa tồn tại" cho tới khi Complete — nhân viên kho quét SN ngay
// lúc nhận hàng thật, tức là lúc bấm Complete.
export const completeReceiptSchema = {
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
            serials: {
              type: 'array',
              items: {
                type: 'object',
                required: ['serial_no'],
                properties: {
                  serial_no:   { type: 'string', minLength: 1 },
                  mac_address: { type: 'string' },
                  note:        { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  },
}

export interface SerialInput {
  serial_no: string
  mac_address?: string
  note?: string
}

export interface CompleteReceiptBody {
  lines?: Array<{ line_id: string; serials?: SerialInput[] }>
}

// Interface TypeScript — PHẢI khớp tay với JSON Schema phía trên (Fastify không tự
// generate type từ schema). Dùng cho generic <{ Body: CreateReceiptBody }> ở routes.ts
// để request.body có gợi ý đúng field trong IDE.
export interface CreateReceiptBody {
  import_type: string
  company_id?: string
  contact_id?: string
  warehouse_id: string
  po_id?: string
  ref_document_type?: string
  ref_document_id?: string
  received_date?: string
  note?: string
  lines: Array<{
    variant_id: string
    quantity: number
    cost_price: number
    po_line_id?: string
    manufacturer_warranty_months?: number
    manufacturer_warranty_start?: string
    customer_warranty_months?: number
    line_order?: number
    note?: string
  }>
}

export interface ListReceiptQuery {
  status?: string
  import_type?: string
  warehouse_id?: string
  search?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  page?: number
  limit?: number
}
