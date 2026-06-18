// Schema cho module receipt — validate request body/query + định nghĩa type TypeScript.
// Đây là module PHỨC TẠP hơn auth vì có nested array (lines) — mỗi receipt có nhiều dòng hàng.

export const createReceiptSchema = {
  body: {
    type: 'object',
    required: ['code', 'import_type', 'warehouse_id', 'lines'],
    properties: {
      code:              { type: 'string' },
      // enum: chỉ chấp nhận đúng 3 giá trị này — khớp với import_type trong CLAUDE.md mục 8
      import_type:       { type: 'string', enum: ['purchase', 'return_in', 'adjustment'] },
      company_id:        { type: 'string', format: 'uuid' },   // format: 'uuid' tự validate đúng dạng UUID
      contact_id:        { type: 'string', format: 'uuid' },
      warehouse_id:      { type: 'string', format: 'uuid' },
      ref_document_type: { type: 'string' },
      ref_document_id:   { type: 'string', format: 'uuid' },
      note:              { type: 'string' },
      // lines = mảng các dòng hàng nhập — mỗi receipt phải có ÍT NHẤT 1 dòng (minItems: 1)
      lines: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['variant_id', 'quantity', 'cost_price'],
          properties: {
            variant_id: { type: 'string', format: 'uuid' },
            quantity:   { type: 'integer', minimum: 1 },     // không cho nhập số lượng <= 0
            cost_price: { type: 'number', minimum: 0 },
            line_order: { type: 'integer' },
            note:       { type: 'string' },
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
      page:         { type: 'integer', minimum: 1, default: 1 },
      limit:        { type: 'integer', minimum: 1, maximum: 100, default: 20 },  // chặn client xin quá nhiều record 1 lần
    },
  },
}

// Interface TypeScript — PHẢI khớp tay với JSON Schema phía trên (Fastify không tự
// generate type từ schema). Dùng cho generic <{ Body: CreateReceiptBody }> ở routes.ts
// để request.body có gợi ý đúng field trong IDE.
export interface CreateReceiptBody {
  code: string
  import_type: string
  company_id?: string
  contact_id?: string
  warehouse_id: string
  ref_document_type?: string
  ref_document_id?: string
  note?: string
  lines: Array<{
    variant_id: string
    quantity: number
    cost_price: number
    line_order?: number
    note?: string
  }>
}

export interface ListReceiptQuery {
  status?: string
  import_type?: string
  warehouse_id?: string
  page?: number
  limit?: number
}
