import { Knex } from 'knex'
import { DeliveryRepository } from './delivery.repository'
import { CreateDeliveryBody, ListDeliveryQuery, CompleteDeliveryBody } from './delivery.schema'

export class DeliveryService {
  private repo: DeliveryRepository

  constructor(private db: Knex) {
    this.repo = new DeliveryRepository(db)
  }

  list(query: ListDeliveryQuery) {
    return this.repo.findAll(query)
  }

  async getById(id: string) {
    const delivery = await this.repo.findById(id)
    if (!delivery) throw { statusCode: 404, message: 'Delivery order not found' }
    return delivery
  }

  async create(data: CreateDeliveryBody, userId: string) {
    const exportType = await this.resolveActiveExportType(data.export_type)
    if (exportType.requires_company !== 'none' && !data.company_id) {
      throw { statusCode: 400, message: `export_type "${data.export_type}" bắt buộc phải có company_id` }
    }
    if (exportType.requires_quotation && !data.quotation_id) {
      throw { statusCode: 400, message: `export_type "${data.export_type}" bắt buộc phải có quotation_id` }
    }
    const effectiveType = exportType.parent_key ?? exportType.key
    if (effectiveType === 'adjustment') {
      await this.validateAdjustmentRefDocument(data)
    }

    await this.validateQuotationLines(data)

    return this.db.transaction((trx) => this.repo.create(data, userId, trx))
  }

  // Đọc cấu hình từ bảng export_types (Settings module) thay vì enum + map hardcode — admin
  // thêm export_type mới qua Settings (vd con của 1 type hệ thống qua parent_key) là dùng
  // được ngay trong Delivery, không cần sửa code (CLAUDE.md mục 19).
  private async resolveActiveExportType(key: string) {
    const row = await this.db('export_types').where({ key, is_active: true }).first()
    if (!row) throw { statusCode: 400, message: `export_type "${key}" không hợp lệ hoặc đã bị tắt` }
    return row
  }

  // applySerialTransition() chỉ biết xử lý đúng 7 export_type hệ thống (SYSTEM_EXPORT_TYPES) —
  // type tự tạo qua Settings phải set parent_key về 1 trong 7 giá trị này để được xử lý đúng.
  // Không lọc is_active ở đây vì đang xử lý 1 phiếu ĐÃ tồn tại (lúc Complete), không phải lúc
  // tạo mới — phiếu cũ vẫn phải hoàn thành được dù type đã bị tắt/xoá sau đó.
  private async resolveEffectiveExportType(key: string): Promise<string> {
    const row = await this.db('export_types').where({ key }).first()
    return row?.parent_key ?? row?.key ?? key
  }

  // CLAUDE.md mục 8/9: "điều chỉnh tồn kho thiếu" cũng phải bắt nguồn từ 1 Stocktake Result
  // cụ thể — giống nguyên tắc áp cho receipt import_type="adjustment".
  private async validateAdjustmentRefDocument(data: CreateDeliveryBody) {
    if (data.ref_document_type !== 'stocktake_result' || !data.ref_document_id) {
      throw {
        statusCode: 400,
        message: 'export_type "adjustment" bắt buộc ref_document_type="stocktake_result" và ref_document_id hợp lệ',
      }
    }
    const result = await this.db('stocktake_results').where({ id: data.ref_document_id }).first()
    if (!result) throw { statusCode: 400, message: 'Stocktake Result tham chiếu không tồn tại' }
  }

  // Dòng DO tham chiếu quotation_line_item_id phải thuộc đúng quotation đã Confirmed, và
  // không vượt remaining_qty còn lại của dòng báo giá đó (CLAUDE.md mục 6: remaining_qty=0
  // → khoá, không tạo thêm DO). Query trực tiếp DB thay vì import QuotationRepository để
  // 2 module không phụ thuộc lẫn nhau (giống cách cancel() check role_permissions trực tiếp).
  private async validateQuotationLines(data: CreateDeliveryBody) {
    const linkedLines = data.lines.filter((l) => l.quotation_line_item_id)
    if (linkedLines.length === 0) return

    if (!data.quotation_id) {
      throw { statusCode: 400, message: 'Dòng hàng tham chiếu báo giá nhưng phiếu không có quotation_id' }
    }

    const quotation = await this.db('quotations').where({ id: data.quotation_id }).first()
    if (!quotation) throw { statusCode: 400, message: 'Quotation không tồn tại' }
    if (quotation.status !== 'confirmed') {
      throw { statusCode: 400, message: 'Chỉ có thể xuất hàng theo báo giá đã Confirmed' }
    }

    const lineItemIds = [...new Set(linkedLines.map((l) => l.quotation_line_item_id as string))]
    const quotationLines = await this.db('quotation_line_items')
      .whereIn('id', lineItemIds)
      .andWhere('quotation_id', data.quotation_id)
      .select('id', 'quantity')

    const quotationLineById = new Map(quotationLines.map((l) => [l.id, l]))
    const missing = lineItemIds.filter((id) => !quotationLineById.has(id))
    if (missing.length > 0) {
      throw { statusCode: 400, message: `Dòng báo giá không thuộc quotation này: ${missing.join(', ')}` }
    }

    // committed_qty = đã xuất (completed) hoặc đang chờ xử lý (draft/pending_approval/approved)
    // — DO Cancelled không tính. Đây là exported_qty + pending_qty của quotation.repository.ts.
    const progressRows = await this.db('delivery_order_lines as dl')
      .join('delivery_orders as d', 'd.id', 'dl.delivery_order_id')
      .whereIn('dl.quotation_line_item_id', lineItemIds)
      .whereIn('d.status', ['draft', 'pending_approval', 'approved', 'completed'])
      .groupBy('dl.quotation_line_item_id')
      .select('dl.quotation_line_item_id', this.db.raw(`SUM(dl.quantity)::int as committed_qty`))
    const committedByLine = new Map(progressRows.map((r: any) => [r.quotation_line_item_id, r.committed_qty]))

    // Cộng dồn trường hợp request hiện tại có nhiều dòng cùng tham chiếu 1 quotation_line_item_id.
    const requestedByLine = new Map<string, number>()
    for (const l of linkedLines) {
      const key = l.quotation_line_item_id as string
      requestedByLine.set(key, (requestedByLine.get(key) ?? 0) + l.quantity)
    }

    for (const [lineItemId, requestedQty] of requestedByLine) {
      const qLine = quotationLineById.get(lineItemId)!
      const committed = committedByLine.get(lineItemId) ?? 0
      const remaining = Number(qLine.quantity) - committed
      if (requestedQty > remaining) {
        throw {
          statusCode: 400,
          message: `Dòng báo giá ${lineItemId} chỉ còn ${remaining} chưa xuất, không thể xuất ${requestedQty}`,
        }
      }
    }
  }

  // updateStatus() so khớp status trong WHERE — atomic, tránh race condition khi 2
  // request cùng lúc chuyển trạng thái (xem chi tiết ở receipt.service.ts).
  private async failTransition(id: string, trx: Knex.Transaction, message: string): Promise<never> {
    const exists = await trx('delivery_orders').where({ id }).first()
    if (!exists) throw { statusCode: 404, message: 'Delivery order not found' }
    throw { statusCode: 400, message }
  }

  async submitForApproval(id: string) {
    return this.db.transaction(async (trx) => {
      const updated = await this.repo.updateStatus(id, 'draft', 'pending_approval', {}, trx)
      if (!updated) return this.failTransition(id, trx, 'Chỉ có thể submit từ Draft')
      return updated
    })
  }

  async approve(id: string, approverId: string) {
    return this.db.transaction(async (trx) => {
      const updated = await this.repo.updateStatus(
        id, 'pending_approval', 'approved', { approved_by: approverId, approved_at: trx.fn.now() }, trx,
      )
      if (!updated) return this.failTransition(id, trx, 'Chỉ có thể duyệt từ Pending Approval')
      return updated
    })
  }

  async complete(id: string, userId: string, body: CompleteDeliveryBody = {}) {
    const delivery = await this.repo.findById(id)
    if (!delivery) throw { statusCode: 404, message: 'Delivery order not found' }
    if (delivery.status !== 'approved') throw { statusCode: 400, message: 'Chỉ có thể hoàn thành từ Approved' }

    // effectiveType = hành vi xử lý serial THẬT (parent_key nếu export_type là type tự tạo
    // qua Settings) — dùng thay cho so sánh literal delivery.export_type === 'adjustment'.
    const effectiveType = await this.resolveEffectiveExportType(delivery.export_type)
    const serialsByLine = new Map((body.lines ?? []).map((l) => [l.line_id, l.serials ?? []]))

    // Validate TRƯỚC khi mở transaction: đủ tồn kho + đủ serial cho dòng storable.
    // adjustment không bắt buộc serial (CLAUDE.md mục 9 ghi "—" ở cột storable SN).
    for (const line of delivery.lines) {
      const inventory = await this.db('inventory')
        .where({ variant_id: line.variant_id, warehouse_id: delivery.warehouse_id })
        .first()
      const available = inventory ? inventory.qty_on_hand : 0
      if (available < line.quantity) {
        throw {
          statusCode: 400,
          message: `Không đủ tồn kho cho ${line.variant_name} — còn ${available}, cần xuất ${line.quantity}`,
        }
      }

      if (line.product_type === 'storable' && effectiveType !== 'adjustment') {
        const serials = serialsByLine.get(line.id) ?? []
        if (serials.length !== line.quantity) {
          throw {
            statusCode: 400,
            message: `Dòng hàng ${line.variant_name} (storable) cần đúng ${line.quantity} serial number, nhận được ${serials.length}`,
          }
        }
        if (new Set(serials).size !== serials.length) {
          throw { statusCode: 400, message: `Danh sách serial cho ${line.variant_name} có giá trị trùng nhau` }
        }

        // Quan trọng: phải xác nhận từng serial THỰC SỰ thuộc đúng variant, đang active,
        // và đang ở đúng kho nguồn — nếu không check, 1 serial gõ nhầm (hoặc serial của
        // sản phẩm khác/kho khác) vẫn bị applySerialTransition() update nhầm, âm thầm
        // làm sai dữ liệu của 1 sản phẩm không liên quan tới phiếu xuất này.
        const validSerials = await this.db('serial_numbers')
          .whereIn('serial_no', serials)
          .where({ variant_id: line.variant_id, warehouse_id: delivery.warehouse_id, status: 'active' })
          .pluck('serial_no')
        const invalidSerials = serials.filter((s) => !validSerials.includes(s))
        if (invalidSerials.length > 0) {
          throw {
            statusCode: 400,
            message: `Serial không hợp lệ cho ${line.variant_name} (không tồn tại / không active / không đúng kho): ${invalidSerials.join(', ')}`,
          }
        }
      }
    }

    return this.db.transaction(async (trx) => {
      // Guard THẬT chống race condition — xem giải thích chi tiết ở receipt.service.ts.
      const completed = await this.repo.updateStatus(
        id, 'approved', 'completed', { completed_at: trx.fn.now() }, trx,
      )
      if (!completed) {
        throw { statusCode: 400, message: 'Phiếu đã được xử lý bởi 1 yêu cầu khác — vui lòng tải lại' }
      }

      for (const line of delivery.lines) {
        const inventory = await trx('inventory')
          .where({ variant_id: line.variant_id, warehouse_id: delivery.warehouse_id })
          .first()

        // Xuất kho chỉ trừ qty_on_hand — avg_cost giữ nguyên (avg_cost chỉ đổi khi NHẬP thêm,
        // không tính lại khi xuất). unit_cost ghi vào stock_movements lấy từ avg_cost hiện tại
        // (đây là giá vốn để tính COGS, không phải giá bán).
        await trx('inventory')
          .where({ variant_id: line.variant_id, warehouse_id: delivery.warehouse_id })
          .update({
            qty_on_hand: trx.raw('qty_on_hand - ?::int', [line.quantity]),
            last_updated: trx.fn.now(),
          })

        // Lấy id + receipt_line_id của các serial liên quan TRƯỚC applySerialTransition().
        let serialIds: string[] = []
        if (line.product_type === 'storable' && effectiveType !== 'adjustment') {
          const serials = serialsByLine.get(line.id) ?? []
          const serialRows = serials.length > 0
            ? await trx('serial_numbers').whereIn('serial_no', serials).select('id', 'receipt_line_id')
            : []
          serialIds = serialRows.map((r) => r.id)
        }

        // Ghi stock_movements TRƯỚC applySerialTransition() — bắt buộc thứ tự này vì
        // exportType='return_out' HARD DELETE thẳng dòng serial_numbers (CLAUDE.md mục
        // 9/19): nếu insert SAU khi đã xoá, serial_id trỏ vào id không còn tồn tại →
        // FK violation, rollback nguyên transaction (xoá cũng mất theo). FK
        // stock_movements_serial_id_fkey dùng ON DELETE SET NULL (migration
        // 20260624000000) nên việc xoá NGAY SAU insert vẫn an toàn — chỉ tự null hoá
        // serial_id của đúng dòng audit này, không lỗi.
        //
        // storable → 1 dòng RIÊNG cho từng serial (quantity=1, serial_id gắn đúng SN đó)
        // để có lịch sử di chuyển theo từng SN; consumable/adjustment → giữ 1 dòng tổng
        // như cũ (serial_id = null).
        if (serialIds.length > 0) {
          await trx('stock_movements').insert(
            serialIds.map((serialId) => ({
              variant_id:        line.variant_id,
              warehouse_id:      delivery.warehouse_id,
              serial_id:         serialId,
              movement_type:     'out',
              quantity:          1,
              unit_cost:         inventory?.avg_cost ?? null,
              ref_document_type: 'delivery_order',
              ref_document_id:   id,
              created_by:        userId,
            })),
          )
        } else {
          await trx('stock_movements').insert({
            variant_id:        line.variant_id,
            warehouse_id:      delivery.warehouse_id,
            movement_type:     'out',
            quantity:          line.quantity,
            unit_cost:         inventory?.avg_cost ?? null,
            ref_document_type: 'delivery_order',
            ref_document_id:   id,
            created_by:        userId,
          })
        }

        if (line.product_type === 'storable' && effectiveType !== 'adjustment') {
          const serials = serialsByLine.get(line.id) ?? []
          const serialRows = serials.length > 0
            ? await trx('serial_numbers').whereIn('serial_no', serials).select('serial_no', 'receipt_line_id')
            : []
          const receiptLineIds = serialRows.map((r) => r.receipt_line_id)

          // BH công ty tính từ ngày bán (delivery.completed_at) + customer_warranty_months
          // của đúng lô nhập mà serial đó thuộc về — mỗi serial có thể có BH khác nhau
          // nếu đến từ các lô nhập (PO) khác nhau.
          if (serialRows.length > 0) {
            const uniqueReceiptLineIds = [...new Set(receiptLineIds.filter(Boolean))] as string[]
            const receiptLines = uniqueReceiptLineIds.length > 0
              ? await trx('receipt_lines').whereIn('id', uniqueReceiptLineIds).select('id', 'customer_warranty_months')
              : []
            const warrantyByReceiptLine = new Map(receiptLines.map((rl) => [rl.id, rl.customer_warranty_months]))

            // customer_warranty_start: user có thể nhập ngày lắp đặt/bàn giao thực tế
            // trên dòng DO. Nếu null → fallback về now() (= completed_at của transaction).
            const cwStart = line.customer_warranty_start ?? trx.raw('now()')

            for (const row of serialRows) {
              const cwMonths = row.receipt_line_id ? warrantyByReceiptLine.get(row.receipt_line_id) : null
              if (cwMonths != null) {
                await trx('serial_numbers')
                  .where({ serial_no: row.serial_no })
                  .update({
                    customer_warranty_end: trx.raw(
                      "?::timestamptz + (?::int * interval '1 month')",
                      [cwStart, cwMonths],
                    ),
                  })
              }
            }
          }

          // Mỗi serial đã "ghim" đúng lô (receipt_line) từ lúc Receipt — trừ thẳng vào lô
          // đó, không cần đoán theo FIFO vì đã biết chính xác serial nào thuộc lô nào.
          await this.consumeReceiptLinesBySerial(trx, receiptLineIds)
          await this.applySerialTransition(
            trx, effectiveType, line.id, line.variant_id, delivery.warehouse_id, serials,
          )
        } else {
          // Consumable (không có serial) hoặc storable xuất theo "adjustment" (không quét
          // serial cụ thể) — trừ theo FIFO mặc định (CLAUDE.md mục 19).
          await this.consumeReceiptLinesFifo(trx, line.variant_id, delivery.warehouse_id, line.quantity)
        }

        // Dòng này đã trừ vào 1 dòng báo giá (CLAUDE.md mục 6, 7) — giải phóng phần
        // qty_reserved đã giữ chỗ lúc Quotation Confirm, nếu không inventory.qty_reserved
        // sẽ bị kẹt cao mãi sau khi hàng đã bán xong.
        if (line.quotation_line_item_id) {
          await trx('inventory')
            .where({ variant_id: line.variant_id, warehouse_id: delivery.warehouse_id })
            .update({
              qty_reserved: trx.raw('GREATEST(qty_reserved - ?::int, 0)', [line.quantity]),
              last_updated: trx.fn.now(),
            })

          await this.releaseQuotationReservation(
            trx, delivery.quotation_id, line.quotation_line_item_id, line.variant_id, line.quantity,
          )
        }
      }

      return completed
    })
  }

  // Giảm (hoặc xoá nếu về 0) đúng dòng reserved_items khớp variant + dòng báo giá — không
  // xoá nguyên dòng reserved_items ngay vì 1 dòng báo giá có thể được xuất qua nhiều DO
  // khác nhau (CLAUDE.md mục 7: "Tổng qty_reserved không đổi khi chuyển" giữa các DO).
  private async releaseQuotationReservation(
    trx: Knex.Transaction,
    quotationId: string | null | undefined,
    lineItemId: string,
    variantId: string,
    qty: number,
  ) {
    if (!quotationId) return
    const row = await trx('reserved_items')
      .where({
        source_type: 'quotation',
        source_id: quotationId,
        quotation_line_item_id: lineItemId,
        variant_id: variantId,
      })
      .first()
    if (!row) return

    const remaining = Number(row.quantity) - qty
    if (remaining > 0) {
      await trx('reserved_items').where({ id: row.id }).update({ quantity: remaining })
    } else {
      await trx('reserved_items').where({ id: row.id }).del()
    }
  }

  // Gom serial theo receipt_line_id rồi trừ qty_remaining 1 lần/lô (thay vì trừ từng serial)
  // — ít round-trip DB hơn khi 1 dòng xuất nhiều serial cùng thuộc 1 lô nhập. Bỏ qua serial
  // không có receipt_line_id (dữ liệu cũ/seed thủ công không qua Receipt) — không có gì để trừ.
  private async consumeReceiptLinesBySerial(trx: Knex.Transaction, receiptLineIds: Array<string | null>) {
    const counts = new Map<string, number>()
    for (const id of receiptLineIds) {
      if (!id) continue
      counts.set(id, (counts.get(id) ?? 0) + 1)
    }
    for (const [receiptLineId, qty] of counts) {
      await trx('receipt_lines')
        .where({ id: receiptLineId })
        .update({ qty_remaining: trx.raw('GREATEST(qty_remaining - ?::int, 0)', [qty]) })
    }
  }

  // FIFO mặc định (CLAUDE.md mục 19) cho dòng không gắn serial cụ thể — trừ dần qty_remaining
  // của receipt_lines theo lô cũ nhất trước (receipts.completed_at — lúc hàng thật vào kho,
  // không phải created_at của phiếu). Best-effort: nếu không tìm đủ lô che hết quantity (vd
  // inventory được tạo tay/qua đường khác không qua Receipt), bỏ qua phần dư — qty_on_hand
  // vẫn là số liệu tồn kho chính thức, receipt_lines.qty_remaining chỉ là sổ phụ tính giá vốn.
  private async consumeReceiptLinesFifo(
    trx: Knex.Transaction,
    variantId: string,
    warehouseId: string,
    quantity: number,
  ) {
    let remaining = quantity
    const lines = await trx('receipt_lines as rl')
      .join('receipts as r', 'r.id', 'rl.receipt_id')
      .where('rl.variant_id', variantId)
      .andWhere('r.warehouse_id', warehouseId)
      .andWhere('rl.qty_remaining', '>', 0)
      .orderBy('r.completed_at', 'asc')
      .orderBy('rl.line_order', 'asc')
      .forUpdate()
      .select('rl.id', 'rl.qty_remaining')

    for (const line of lines) {
      if (remaining <= 0) break
      const take = Math.min(remaining, line.qty_remaining)
      await trx('receipt_lines').where({ id: line.id }).update({ qty_remaining: line.qty_remaining - take })
      remaining -= take
    }
  }

  // Cập nhật serial_numbers theo đúng quy tắc export_type ở CLAUDE.md mục 9 —
  // mỗi loại xuất kho có hiệu ứng khác nhau lên trạng thái/vị trí của serial.
  //
  // Luôn where thêm variant_id + warehouse_id + status='active' NGAY TẠI ĐÂY (không chỉ
  // ở bước validate trước transaction) — phòng trường hợp 1 request khác xen vào giữa
  // lúc validate và lúc transaction này chạy, đã đổi serial đó sang trạng thái khác.
  // So khớp rowCount với serials.length để chắc chắn không có serial nào "lọt lưới".
  private async applySerialTransition(
    trx: Knex.Transaction,
    exportType: string,
    lineId: string,
    variantId: string,
    warehouseId: string,
    serials: string[],
  ) {
    if (serials.length === 0) return
    const scope = { variant_id: variantId, warehouse_id: warehouseId, status: 'active' as const }

    let affected = 0
    switch (exportType) {
      case 'sale':
      case 'internal':
        affected = await trx('serial_numbers')
          .whereIn('serial_no', serials)
          .where(scope)
          .update({ status: 'sold', warehouse_id: null, delivery_line_id: lineId, updated_at: trx.fn.now() })
        break

      case 'dispose':
        affected = await trx('serial_numbers')
          .whereIn('serial_no', serials)
          .where(scope)
          .update({ status: 'disposed', warehouse_id: null, delivery_line_id: lineId, updated_at: trx.fn.now() })
        break

      case 'demo_out':
      case 'warranty_out': {
        const virtualCode = exportType === 'demo_out' ? 'WH-DEMO' : 'WH-BH'
        const virtualWarehouse = await this.repo.findWarehouseByCode(virtualCode, trx)
        affected = await trx('serial_numbers')
          .whereIn('serial_no', serials)
          .where(scope)
          .update({ warehouse_id: virtualWarehouse.id, delivery_line_id: lineId, updated_at: trx.fn.now() })
        break
      }

      case 'return_out':
        // CLAUDE.md mục 9 + mục 19: return_out → hard delete SN khỏi database,
        // không phải soft-update status — hàng đã trả về NCC, không còn ý nghĩa theo dõi.
        affected = await trx('serial_numbers').whereIn('serial_no', serials).where(scope).del()
        break
    }

    if (affected !== serials.length) {
      // Rollback toàn bộ transaction — có serial bị thay đổi bởi request khác ngay
      // trong lúc đang xử lý, không được để inventory/stock_movements đã ghi mà serial lại sai.
      throw { statusCode: 409, message: 'Một số serial đã bị thay đổi bởi giao dịch khác, vui lòng thử lại' }
    }
  }

  // Chỉ người tạo phiếu HOẶC người có quyền delivery.approve (Manager/Admin) mới được huỷ —
  // route chỉ check authenticate (đăng nhập), authorization thật nằm ở đây vì cần biết
  // created_by của chính document, preHandler không có thông tin đó.
  async cancel(id: string, userId: string, roleId: string) {
    const delivery = await this.repo.findById(id)
    if (!delivery) throw { statusCode: 404, message: 'Delivery order not found' }
    if (['completed', 'cancelled'].includes(delivery.status)) {
      throw { statusCode: 400, message: 'Không thể huỷ phiếu đã hoàn thành hoặc đã huỷ' }
    }

    if (delivery.created_by !== userId) {
      const canApprove = await this.db('role_permissions as rp')
        .join('permissions as p', 'p.id', 'rp.permission_id')
        .where('rp.role_id', roleId)
        .where('p.key', 'delivery.approve')
        .first()
      if (!canApprove) {
        throw { statusCode: 403, message: 'Chỉ người tạo phiếu hoặc người có quyền duyệt mới được huỷ' }
      }
    }

    return this.db.transaction(async (trx) => {
      const cancelled = await this.repo.updateStatus(
        id, ['draft', 'pending_approval', 'approved'], 'cancelled', {}, trx,
      )
      if (!cancelled) {
        throw { statusCode: 400, message: 'Không thể huỷ phiếu đã hoàn thành hoặc đã huỷ' }
      }
      return cancelled
    })
  }
}
