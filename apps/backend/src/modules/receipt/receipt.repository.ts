// Repository — toàn bộ Knex query của module receipt nằm ở đây, không rải ra service/routes.
import { Knex } from 'knex'
import { CreateReceiptBody, ListReceiptQuery } from './receipt.schema'
import { generateDocumentCode } from '../../lib/generateDocumentCode'

export class ReceiptRepository {
  constructor(private db: Knex) {}

  // Lấy danh sách receipt có phân trang + filter — dùng cho trang list trên web.
  async findAll(query: ListReceiptQuery) {
    const { status, import_type, warehouse_id, company_id, search, sort_by, sort_order, page = 1, limit = 20 } = query
    const offset = (page - 1) * limit

    const SORTABLE: Record<string, string> = {
      code: 'r.code', status: 'r.status', created_at: 'r.created_at',
      import_type: 'r.import_type', company_name: 'c.name',
    }
    const sortDir = sort_order === 'asc' ? 'asc' : 'desc'

    const base = this.db('receipts as r')
      .leftJoin('companies as c', 'c.id', 'r.company_id')
      .leftJoin('warehouses as w', 'w.id', 'r.warehouse_id')
      .leftJoin('users as u', 'u.id', 'r.created_by')
      .select(
        'r.id', 'r.code', 'r.import_type', 'r.status',
        'r.created_at', 'r.completed_at',
        'c.name as company_name',
        'w.name as warehouse_name',
        'u.full_name as created_by_name',
      )

    if (status) base.where('r.status', status)
    if (import_type) base.where('r.import_type', import_type)
    if (warehouse_id) base.where('r.warehouse_id', warehouse_id)
    if (company_id) base.where('r.company_id', company_id)
    if (search) base.where((qb) => qb.whereILike('r.code', `%${search}%`).orWhereILike('c.name', `%${search}%`))

    const [rows, countResult] = await Promise.all([
      base.clone().orderBy(SORTABLE[sort_by ?? ''] ?? 'r.created_at', sortDir).limit(limit).offset(offset),
      base.clone().clearSelect().count('r.id as count').first(),
    ])

    return {
      data: rows,
      total: Number(countResult?.count ?? 0),   // count() trả về string trong PostgreSQL driver, phải Number() lại
      page,
      limit,
    }
  }

  // Lấy chi tiết 1 receipt + toàn bộ lines — dùng cho trang detail.
  async findById(id: string) {
    const receipt = await this.db('receipts as r')
      .leftJoin('companies as c', 'c.id', 'r.company_id')
      .leftJoin('warehouses as w', 'w.id', 'r.warehouse_id')
      .where('r.id', id)
      .select('r.*', 'c.name as company_name', 'w.name as warehouse_name')
      .first()

    if (!receipt) return null   // để service quyết định throw 404, repository chỉ trả null/data thô

    const lines = await this.db('receipt_lines as rl')
      .join('variants as v', 'v.id', 'rl.variant_id')
      .join('products as p', 'p.id', 'v.product_id')   // join thêm products để lấy tên sản phẩm hiển thị
      .where('rl.receipt_id', id)
      // p.product_type cần để service biết dòng nào storable (bắt buộc serial) khi Complete
      .select('rl.*', 'v.sku', 'v.item_code', 'v.name as variant_name', 'p.name as product_name', 'p.product_type')
      .orderBy('rl.line_order')

    return { ...receipt, lines }   // gộp lines vào object receipt để trả ra 1 response duy nhất
  }

  // Tạo receipt mới — header + lines PHẢI insert cùng 1 transaction (trx), không phải
  // 2 query rời: nếu insert header xong mà insert lines lỗi, receipt rác (không có dòng nào)
  // sẽ tồn tại trong DB. trx đảm bảo "tất cả thành công hoặc không gì xảy ra".
  async create(data: CreateReceiptBody, userId: string, trx: Knex.Transaction) {
    const { lines, ...header } = data   // tách lines ra khỏi phần header để insert vào 2 bảng khác nhau
    const code = await generateDocumentCode(trx, 'receipt')
    const [receipt] = await trx('receipts')
      .insert({ ...header, code, status: 'draft', created_by: userId })   // mọi receipt mới luôn bắt đầu ở status draft
      .returning('*')   // PostgreSQL hỗ trợ RETURNING — lấy lại row vừa insert (kèm id tự sinh) mà không cần SELECT lại

    const lineRows = lines.map((l, i) => ({
      ...l,
      receipt_id: receipt.id,
      line_order: l.line_order ?? i + 1,   // nếu client không gửi line_order, tự đánh số theo thứ tự trong mảng
    }))
    // .returning('*') để trả lại line_id ngay — client cần line_id để gọi /complete
    // kèm danh sách serial cho từng dòng, không phải GET lại receipt trước.
    const insertedLines = await trx('receipt_lines').insert(lineRows).returning('*')

    return { ...receipt, lines: insertedLines }
  }

  async update(id: string, data: Record<string, unknown>) {
    const [row] = await this.db('receipts').where({ id }).update({ ...data, updated_at: this.db.fn.now() }).returning('*')
    return row
  }

  async updateLines(lines: Array<{ id: string; cost_price?: number; manufacturer_warranty_months?: number | null; manufacturer_warranty_start?: string | null; customer_warranty_months?: number | null }>) {
    for (const line of lines) {
      const { id, ...fields } = line
      if (Object.keys(fields).length) {
        await this.db('receipt_lines').where({ id }).update(fields)
      }
    }
  }

  // Helper chung cho mọi bước chuyển trạng thái (submit/approve/complete/cancel).
  // expectedStatus nằm ngay trong WHERE — biến "check status rồi update" (2 bước, có
  // race condition nếu 2 request xen vào giữa) thành 1 câu UPDATE atomic duy nhất.
  // Nếu lúc UPDATE chạy mà status KHÔNG còn đúng expectedStatus nữa (vì 1 request khác
  // đã đổi trước), câu lệnh khớp 0 dòng → trả về undefined, KHÔNG đổi gì cả.
  async updateStatus(
    id: string,
    expectedStatus: string | string[],
    newStatus: string,
    extra: Record<string, unknown>,   // field phụ tuỳ bước, ví dụ { approved_by, approved_at }
    trx: Knex.Transaction,
  ) {
    const query = trx('receipts').where({ id })
    if (Array.isArray(expectedStatus)) query.whereIn('status', expectedStatus)
    else query.where('status', expectedStatus)

    const [updated] = await query
      .update({ status: newStatus, updated_at: trx.fn.now(), ...extra })
      .returning('*')
    return updated
  }
}
