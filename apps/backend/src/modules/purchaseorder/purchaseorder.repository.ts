import { Knex } from 'knex'
import { generateDocumentCode } from '../../lib/generateDocumentCode'
import { ListPurchaseOrderQuery, PurchaseOrderLineInput } from './purchaseorder.schema'

export interface PurchaseOrderHeaderInput {
  company_id: string
  contact_id?: string
  bitrix_deal_id?: string
  note?: string
}

export class PurchaseOrderRepository {
  constructor(private db: Knex) {}

  async findAll(query: ListPurchaseOrderQuery) {
    const { status, company_id, search, has_remaining, sort_by, sort_order, page = 1, limit = 20 } = query
    const offset = (page - 1) * limit

    const SORTABLE: Record<string, string> = {
      code: 'po.code', status: 'po.status', created_at: 'po.created_at', company_name: 'c.name',
    }
    const sortDir = sort_order === 'asc' ? 'asc' : 'desc'

    const base = this.db('purchase_orders as po')
      .leftJoin('companies as c', 'c.id', 'po.company_id')
      .leftJoin('users as u', 'u.id', 'po.created_by')
      .leftJoin('users as uc', 'uc.id', 'po.confirmed_by')
      .whereNull('po.deleted_at')

    if (status) base.where('po.status', status)
    if (company_id) base.where('po.company_id', company_id)
    if (search) base.where((qb) => qb.whereILike('po.code', `%${search}%`).orWhereILike('c.name', `%${search}%`))

    // Chỉ hiện PO còn dòng chưa nhận đủ — dùng cho dropdown chọn PO khi tạo Shipment/Receipt.
    if (has_remaining) {
      base.whereExists(
        this.db('purchase_order_lines as pol')
          .where('pol.purchase_order_id', this.db.ref('po.id'))
          .whereRaw(`
            pol.quantity > COALESCE((
              SELECT SUM(rl.quantity)
              FROM receipt_lines rl
              JOIN receipts r ON r.id = rl.receipt_id
              WHERE rl.po_line_id = pol.id
              AND r.status != 'cancelled'
            ), 0)
          `)
          .select(this.db.raw('1')),
      )
    }

    const [rows, countResult] = await Promise.all([
      base
        .clone()
        .select(
          'po.id', 'po.code', 'po.status', 'po.bitrix_deal_id', 'po.deal_title', 'po.created_at',
          'po.company_id',
          'c.name as company_name', 'c.code as company_code',
          'u.full_name as created_by_name',
          'uc.full_name as confirmed_by_name',
          this.db.raw(`(
            SELECT COALESCE(SUM(pol.quantity * pol.unit_price * (1 + COALESCE(pol.vat_percent, 0) / 100)), 0)
            FROM purchase_order_lines pol
            WHERE pol.purchase_order_id = po.id
          ) as total_amount`),
        )
        .orderBy(SORTABLE[sort_by ?? ''] ?? 'po.created_at', sortDir)
        .limit(limit)
        .offset(offset),
      base.clone().clearSelect().count('po.id as count').first(),
    ])

    return { data: rows, total: Number(countResult?.count ?? 0), page, limit }
  }

  async findById(id: string) {
    const po = await this.db('purchase_orders as po')
      .leftJoin('companies as c', 'c.id', 'po.company_id')
      .leftJoin('contacts as ct', 'ct.id', 'po.contact_id')
      .where('po.id', id)
      .whereNull('po.deleted_at')
      .select('po.*', 'c.name as company_name', 'ct.full_name as contact_name')
      .first()

    if (!po) return null

    const lines = await this.db('purchase_order_lines as pol')
      .join('variants as v', 'v.id', 'pol.variant_id')
      .join('products as p', 'p.id', 'v.product_id')
      .where('pol.purchase_order_id', id)
      .select('pol.*', 'v.sku as variant_sku', 'v.item_code as variant_item_code', 'v.name as variant_name', 'v.unit as variant_unit', 'p.product_type')
      .orderBy('pol.line_order')

    const lineIds = lines.map((l: any) => l.id)
    const progress = lineIds.length ? await this.findLineProgress(lineIds) : new Map()
    const customValuesByLine = lineIds.length ? await this.findLineCustomFieldValues(lineIds) : new Map()

    const linesWithProgress = lines.map((l: any) => {
      const p = progress.get(l.id) ?? { received_qty: 0, pending_qty: 0, shipment_qty: 0 }
      const qty = Number(l.quantity)
      return {
        ...l,
        quantity:    qty,
        unit_price:  l.unit_price  != null ? Number(l.unit_price)  : null,
        vat_percent: l.vat_percent != null ? Number(l.vat_percent) : null,
        received_qty: p.received_qty,
        pending_qty: p.pending_qty,
        shipment_qty: p.shipment_qty,
        remaining_qty: qty - p.received_qty - p.pending_qty - p.shipment_qty,
        custom_field_values: customValuesByLine.get(l.id) ?? [],
      }
    })

    return { ...po, lines: linesWithProgress }
  }

  // Giá trị custom field riêng theo từng PO line — lưu trong field_values với
  // object_type="purchase_order_line", object_id=purchase_order_lines.id (field định nghĩa
  // gốc có object_type="variant", xem applies_to_po_line ở customfield.schema.ts).
  async findLineCustomFieldValues(lineIds: string[], trx?: Knex.Transaction) {
    const runner = trx ?? this.db
    const rows = await runner('field_values as fv')
      .join('custom_fields as cf', 'cf.id', 'fv.field_id')
      .where('fv.object_type', 'purchase_order_line')
      .whereIn('fv.object_id', lineIds)
      .select(
        'fv.object_id as line_id', 'fv.field_id', 'fv.value',
        'cf.field_name', 'cf.field_label', 'cf.field_type', 'cf.options',
      )
      .orderBy('cf.sort_order')

    const map = new Map<string, any[]>()
    for (const r of rows) {
      if (!map.has(r.line_id)) map.set(r.line_id, [])
      map.get(r.line_id)!.push(r)
    }
    return map
  }

  // Insert field_values cho custom_field_values của từng dòng PO — gọi NGAY SAU khi insert
  // purchase_order_lines (cần line.id thật), trong cùng transaction với create()/replaceLines().
  private async saveLineCustomFieldValues(
    insertedLines: any[],
    inputLines: PurchaseOrderLineInput[],
    trx: Knex.Transaction,
  ) {
    const rows: Array<{ object_type: string; object_id: string; field_id: string; value: string }> = []
    insertedLines.forEach((line, i) => {
      for (const v of inputLines[i].custom_field_values ?? []) {
        if (v.value === null || v.value === undefined) continue
        rows.push({ object_type: 'purchase_order_line', object_id: line.id, field_id: v.field_id, value: v.value })
      }
    })
    if (rows.length) await trx('field_values').insert(rows)
  }

  // received_qty (Receipt completed) + pending_qty (Receipt draft/pending/approved)
  // + shipment_qty (Shipment draft/received chưa có Receipt) cho từng purchase_order_line
  // — dùng tính remaining_qty, đối xứng với quotation.repository.ts::findLineProgress.
  // Nhận trx tuỳ chọn: unconfirm()/cancel() gọi với trx SAU KHI đã forUpdate() khoá
  // purchase_orders, để đọc progress mới nhất trong cùng transaction — khoá này khớp
  // với forUpdate() bên receipt.service.ts::validatePurchaseOrder() nên 2 transaction
  // cùng đụng 1 PO sẽ serialize, không còn đọc progress cũ (stale) qua tay nhau.
  async findLineProgress(lineIds: string[], trx?: Knex.Transaction) {
    const runner = trx ?? this.db
    const [receiptRows, shipmentRows] = await Promise.all([
      runner('receipt_lines as rl')
        .join('receipts as r', 'r.id', 'rl.receipt_id')
        .whereIn('rl.po_line_id', lineIds)
        .groupBy('rl.po_line_id')
        .select(
          'rl.po_line_id',
          runner.raw(`COALESCE(SUM(rl.quantity) FILTER (WHERE r.status = 'completed'), 0)::int as received_qty`),
          runner.raw(`COALESCE(SUM(rl.quantity) FILTER (WHERE r.status IN ('draft','pending_approval','approved')), 0)::int as pending_qty`),
        ),
      // Shipment đang active (draft/received) nhưng chưa có Receipt nào → tính vào shipment_qty
      // để tránh tạo thêm Shipment vượt số lượng PO. Khi Receipt được tạo từ Shipment đó,
      // receipt_lines sẽ tính vào pending_qty và shipment này không còn thoả điều kiện NOT EXISTS.
      runner('shipment_lines as sl')
        .join('shipments as s', 's.id', 'sl.shipment_id')
        .whereIn('sl.po_line_id', lineIds)
        .whereIn('s.status', ['draft', 'received'])
        .whereNotExists(
          runner('receipts as r').where('r.shipment_id', runner.ref('s.id')).whereNotIn('r.status', ['cancelled']).select(runner.raw('1')),
        )
        .groupBy('sl.po_line_id')
        .select('sl.po_line_id', runner.raw('COALESCE(SUM(sl.qty_expected), 0)::int as shipment_qty')),
    ])

    const map = new Map<string, { received_qty: number; pending_qty: number; shipment_qty: number }>()
    for (const r of receiptRows) {
      map.set(r.po_line_id, { received_qty: r.received_qty, pending_qty: r.pending_qty, shipment_qty: 0 })
    }
    for (const r of shipmentRows) {
      const existing = map.get(r.po_line_id) ?? { received_qty: 0, pending_qty: 0, shipment_qty: 0 }
      map.set(r.po_line_id, { ...existing, shipment_qty: r.shipment_qty })
    }
    return map
  }

  // Dùng trong unconfirm()/cancel() — đọc lines + progress NGAY SAU forUpdate() lock,
  // trong cùng transaction, thay vì dựa vào findById() đọc trước khi mở transaction.
  async findLinesWithProgress(purchaseOrderId: string, trx: Knex.Transaction) {
    const lines = await trx('purchase_order_lines').where({ purchase_order_id: purchaseOrderId }).select('id')
    const lineIds = lines.map((l: any) => l.id)
    const progress = lineIds.length ? await this.findLineProgress(lineIds, trx) : new Map()
    return lines.map((l: any) => ({
      ...l,
      received_qty: progress.get(l.id)?.received_qty ?? 0,
      pending_qty: progress.get(l.id)?.pending_qty ?? 0,
      shipment_qty: progress.get(l.id)?.shipment_qty ?? 0,
    }))
  }

  async create(
    header: PurchaseOrderHeaderInput,
    lines: PurchaseOrderLineInput[],
    userId: string,
    trx: Knex.Transaction,
  ) {
    const code = await generateDocumentCode(trx, 'purchase_order')
    const [po] = await trx('purchase_orders')
      .insert({ ...header, code, status: 'draft', created_by: userId })
      .returning('*')

    const lineRows = lines.map((l, i) => {
      const { custom_field_values, ...rest } = l
      return { ...rest, purchase_order_id: po.id, line_order: l.line_order ?? i + 1 }
    })
    const insertedLines = await trx('purchase_order_lines').insert(lineRows).returning('*')
    await this.saveLineCustomFieldValues(insertedLines, lines, trx)

    return { ...po, lines: this.withEchoedCustomFieldValues(insertedLines, lines) }
  }

  // Đính custom_field_values (lấy từ input vừa lưu) vào response trả ngay sau khi
  // create()/replaceLines() — không cần query lại field_values+custom_fields như
  // findById(), vì lúc này input đã chính là giá trị vừa ghi.
  private withEchoedCustomFieldValues(insertedLines: any[], inputLines: PurchaseOrderLineInput[]) {
    return insertedLines.map((line, i) => ({
      ...line,
      custom_field_values: (inputLines[i].custom_field_values ?? []).filter(
        (v) => v.value !== null && v.value !== undefined,
      ),
    }))
  }

  // Draft-only full replace — chỉ an toàn khi chưa Confirm (chưa có receipt nào tham
  // chiếu po_line_id của các dòng cũ). Xoá field_values cũ theo line_id cũ TRƯỚC khi xoá
  // dòng — field_values không có FK tới purchase_order_lines (polymorphic, app-validated)
  // nên Postgres không tự dọn, phải xoá tay để không tích rác mỗi lần sửa PO.
  async replaceLines(purchaseOrderId: string, lines: PurchaseOrderLineInput[], trx: Knex.Transaction) {
    const oldLines = await trx('purchase_order_lines').where({ purchase_order_id: purchaseOrderId }).select('id')
    const oldLineIds = oldLines.map((l: any) => l.id)
    if (oldLineIds.length) {
      await trx('field_values').where('object_type', 'purchase_order_line').whereIn('object_id', oldLineIds).del()
    }
    await trx('purchase_order_lines').where({ purchase_order_id: purchaseOrderId }).del()

    const lineRows = lines.map((l, i) => {
      const { custom_field_values, ...rest } = l
      return { ...rest, purchase_order_id: purchaseOrderId, line_order: l.line_order ?? i + 1 }
    })
    const insertedLines = await trx('purchase_order_lines').insert(lineRows).returning('*')
    await this.saveLineCustomFieldValues(insertedLines, lines, trx)
    return this.withEchoedCustomFieldValues(insertedLines, lines)
  }

  async updateHeader(id: string, header: Partial<PurchaseOrderHeaderInput>, trx: Knex.Transaction) {
    const [row] = await trx('purchase_orders')
      .where({ id })
      .update({ ...header, updated_at: trx.fn.now() })
      .returning('*')
    return row
  }

  // expectedStatus nằm ngay trong WHERE — update atomic, tránh race condition (cùng
  // pattern với quotation.repository.ts/receipt.repository.ts::updateStatus).
  async updateStatus(
    id: string,
    expectedStatus: string | string[],
    newStatus: string,
    extra: Record<string, unknown>,
    trx: Knex.Transaction,
  ) {
    const query = trx('purchase_orders').where({ id })
    if (Array.isArray(expectedStatus)) query.whereIn('status', expectedStatus)
    else query.where('status', expectedStatus)

    const [updated] = await query
      .update({ status: newStatus, updated_at: trx.fn.now(), ...extra })
      .returning('*')
    return updated
  }

  lockForUpdate(id: string, trx: Knex.Transaction) {
    return trx('purchase_orders').where({ id }).forUpdate().first()
  }

  async softDelete(id: string) {
    const [row] = await this.db('purchase_orders')
      .where({ id })
      .update({ deleted_at: this.db.fn.now(), updated_at: this.db.fn.now() })
      .returning('id')
    return row
  }
}
