// Service — chứa STATE MACHINE của Receipt: draft → pending_approval → approved → completed
// (hoặc cancelled ở bất kỳ bước nào trước completed). Mỗi hàm tự kiểm tra status hiện tại
// hợp lệ để chuyển bước hay không — đây là chỗ enforce nghiệp vụ ở mục 11 CLAUDE.md.
import { Knex } from 'knex'
import { ReceiptRepository } from './receipt.repository'
import { CreateReceiptBody, ListReceiptQuery, CompleteReceiptBody } from './receipt.schema'

export class ReceiptService {
  private repo: ReceiptRepository

  constructor(private db: Knex) {
    this.repo = new ReceiptRepository(db)
  }

  list(query: ListReceiptQuery) {
    return this.repo.findAll(query)
  }

  async getById(id: string) {
    const receipt = await this.repo.findById(id)
    if (!receipt) throw { statusCode: 404, message: 'Receipt not found' }
    return receipt
  }

  // Tạo receipt — validatePurchaseOrder() PHẢI chạy TRONG transaction này (không phải
  // 1 SELECT rời trước đó) và lock hàng purchase_orders/purchase_order_lines bằng
  // forUpdate(): nếu để check ngoài transaction, 2 request tạo Receipt cùng lúc cho
  // CÙNG 1 po_line có thể cùng đọc remaining_qty cũ, cùng pass validate, rồi cùng insert
  // → tổng nhận vượt số PO đã đặt (race condition — phát hiện qua review kỹ lại sau khi
  // hỏi "workflow đã chuẩn chưa", không phải qua test, vì test chạy tuần tự không lộ race).
  async create(data: CreateReceiptBody, userId: string) {
    const importType = await this.resolveActiveImportType(data.import_type)
    await this.validateRefDocument(data, importType.requires_ref_document)
    return this.db.transaction(async (trx) => {
      await this.validatePurchaseOrder(data, trx)
      return this.repo.create(data, userId, trx)
    })
  }

  // PO tham chiếu (po_id/po_line_id) là TUỲ CHỌN — không phải mọi receipt purchase đều
  // xuất phát từ 1 PO chính thức. Nếu có, validate: PO phải Confirmed (mới được nhận
  // hàng), po_line phải thuộc đúng po_id, variant_id phải khớp, và quantity không vượt
  // remaining_qty (= po_line.quantity - tổng quantity của các receipt_line CHƯA cancelled
  // đã link tới dòng đó — tính chung received+pending vì mục đích ở đây chỉ là chặn
  // over-commit, không cần tách riêng như purchaseorder.repository.ts::findLineProgress).
  // forUpdate() trên CẢ purchase_orders và purchase_order_lines — khoá này phải khớp với
  // lockForUpdate() bên purchaseorder.service.ts::unconfirm()/cancel() để 2 transaction
  // cùng đụng 1 PO (1 bên tạo Receipt, 1 bên unconfirm/cancel PO) buộc phải serialize.
  private async validatePurchaseOrder(data: CreateReceiptBody, trx: Knex.Transaction) {
    if (!data.po_id) return

    const po = await trx('purchase_orders').where({ id: data.po_id }).forUpdate().first()
    if (!po) throw { statusCode: 400, message: 'Purchase Order tham chiếu không tồn tại' }
    if (po.status !== 'confirmed') {
      throw { statusCode: 400, message: 'Purchase Order phải ở trạng thái Confirmed để tạo Receipt' }
    }

    const poLineIds = data.lines.map((l) => l.po_line_id).filter((id): id is string => Boolean(id))
    if (poLineIds.length === 0) return

    const poLines = await trx('purchase_order_lines')
      .where({ purchase_order_id: data.po_id })
      .whereIn('id', poLineIds)
      .forUpdate()
    const poLineById = new Map(poLines.map((l) => [l.id, l]))

    const usedRows = await trx('receipt_lines as rl')
      .join('receipts as r', 'r.id', 'rl.receipt_id')
      .whereIn('rl.po_line_id', poLineIds)
      .andWhere('r.status', '!=', 'cancelled')
      .groupBy('rl.po_line_id')
      .select('rl.po_line_id', trx.raw('SUM(rl.quantity)::int as used_qty'))
    const usedByPoLine = new Map(usedRows.map((r) => [r.po_line_id, r.used_qty]))

    for (const line of data.lines) {
      if (!line.po_line_id) continue
      const poLine = poLineById.get(line.po_line_id)
      if (!poLine) {
        throw { statusCode: 400, message: `purchase_order_line "${line.po_line_id}" không thuộc Purchase Order này` }
      }
      if (poLine.variant_id !== line.variant_id) {
        throw { statusCode: 400, message: 'Dòng hàng không khớp SKU với purchase_order_line tương ứng' }
      }
      const used = usedByPoLine.get(line.po_line_id) ?? 0
      const remaining = poLine.quantity - used
      if (line.quantity > remaining) {
        throw {
          statusCode: 400,
          message: `Số lượng (${line.quantity}) vượt quá remaining_qty (${remaining}) của purchase_order_line`,
        }
      }
    }
  }

  // Đọc cấu hình từ bảng import_types (Settings module) thay vì enum hardcode trong schema —
  // admin thêm import_type mới qua Settings là dùng được ngay, không cần sửa code lại
  // (CLAUDE.md mục 19, xem ghi chú trước đây ở settings.service.ts).
  private async resolveActiveImportType(key: string) {
    const row = await this.db('import_types').where({ key, is_active: true }).first()
    if (!row) throw { statusCode: 400, message: `import_type "${key}" không hợp lệ hoặc đã bị tắt` }
    return row
  }

  // CLAUDE.md mục 8: requires_ref_document của import_type quyết định loại document gốc bắt
  // buộc — "adjustment" → stocktake_result, "return_in" → quotation. Đọc trực tiếp từ
  // import_types nên return_in tự động được validate giống adjustment, không cần hardcode riêng.
  private async validateRefDocument(data: CreateReceiptBody, requiresRefDocument: string) {
    if (requiresRefDocument === 'none') return
    if (data.ref_document_type !== requiresRefDocument || !data.ref_document_id) {
      throw {
        statusCode: 400,
        message: `import_type "${data.import_type}" bắt buộc ref_document_type="${requiresRefDocument}" và ref_document_id hợp lệ`,
      }
    }
    const table = requiresRefDocument === 'quotation' ? 'quotations' : 'stocktake_results'
    const exists = await this.db(table).where({ id: data.ref_document_id }).first()
    if (!exists) {
      throw {
        statusCode: 400,
        message: `${requiresRefDocument === 'quotation' ? 'Quotation' : 'Stocktake Result'} tham chiếu không tồn tại`,
      }
    }
  }

  // Khi updateStatus() không khớp được dòng nào (status thực tế không còn đúng
  // expectedStatus — do client nhầm HOẶC do 1 request khác đã đổi trước), cần phân biệt
  // 404 (receipt không tồn tại) với 400 (tồn tại nhưng sai trạng thái) cho rõ nghĩa.
  private async failTransition(id: string, trx: Knex.Transaction, message: string): Promise<never> {
    const exists = await trx('receipts').where({ id }).first()
    if (!exists) throw { statusCode: 404, message: 'Receipt not found' }
    throw { statusCode: 400, message }
  }

  // draft → pending_approval. updateStatus() so khớp status='draft' NGAY TRONG WHERE của
  // UPDATE — atomic, không còn khoảng hở giữa "check status" và "update status" để 2
  // request cùng lúc cùng lọt qua (race condition).
  async submitForApproval(id: string) {
    return this.db.transaction(async (trx) => {
      const updated = await this.repo.updateStatus(id, 'draft', 'pending_approval', {}, trx)
      if (!updated) return this.failTransition(id, trx, 'Chỉ có thể submit từ Draft')
      return updated
    })
  }

  // pending_approval → approved. Theo CLAUDE.md mục 11: 1 cấp duyệt, người approve
  // được ghi lại (approved_by) để biết ai chịu trách nhiệm — không tự xoá thông tin này.
  async approve(id: string, approverId: string) {
    return this.db.transaction(async (trx) => {
      const updated = await this.repo.updateStatus(
        id, 'pending_approval', 'approved', { approved_by: approverId, approved_at: trx.fn.now() }, trx,
      )
      if (!updated) return this.failTransition(id, trx, 'Chỉ có thể duyệt từ Pending Approval')
      return updated
    })
  }

  // approved → completed. Đây là bước QUAN TRỌNG NHẤT — lúc này tồn kho thật sự thay đổi.
  // Trước khi Complete, hàng "chưa tồn tại" trong kho — chỉ là dữ liệu trên giấy.
  async complete(id: string, userId: string, body: CompleteReceiptBody = {}) {
    const receipt = await this.repo.findById(id)
    if (!receipt) throw { statusCode: 404, message: 'Receipt not found' }
    if (receipt.status !== 'approved') throw { statusCode: 400, message: 'Chỉ có thể hoàn thành từ Approved' }

    // Map line_id -> danh sách serial client gửi lên (chỉ cần cho dòng storable)
    const serialsByLine = new Map((body.lines ?? []).map((l) => [l.line_id, l.serials ?? []]))

    // Validate TRƯỚC khi mở transaction — fail nhanh, không mở transaction chỉ để
    // rollback ngay vì thiếu serial. CLAUDE.md mục 5: storable bắt buộc serial number,
    // và số serial nhập phải khớp đúng quantity (không thừa, không thiếu).
    // Đây chỉ là kiểm tra sơ bộ cho UX — guard THẬT chống race condition nằm ở
    // updateStatus() atomic bên trong transaction phía dưới.
    for (const line of receipt.lines) {
      if (line.product_type === 'storable') {
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
        // serial_no là unique toàn hệ thống — nếu trùng với serial đã tồn tại (ví dụ
        // quét nhầm SN cũ), báo 400 rõ nghĩa thay vì để rớt xuống lỗi unique constraint 500.
        const existing = await this.db('serial_numbers').whereIn('serial_no', serials).pluck('serial_no')
        if (existing.length > 0) {
          throw { statusCode: 400, message: `Serial đã tồn tại trong hệ thống: ${existing.join(', ')}` }
        }
      }
    }

    // TOÀN BỘ logic dưới đây nằm trong 1 transaction — nếu 1 trong N dòng cập nhật
    // inventory thất bại (ví dụ lỗi DB giữa đường), Postgres rollback hết, không để
    // tồn kho bị cập nhật "nửa chừng" (ví dụ 3/5 dòng hàng đã cộng kho, 2 dòng chưa).
    return this.db.transaction(async (trx) => {
      // Guard THẬT chống race condition: chỉ chuyển trạng thái nếu ĐÚNG LÚC NÀY (không
      // phải lúc đọc receipt ở trên — đã có thể stale) vẫn đang approved. Nếu 1 request
      // complete/cancel khác đã xử lý xong trước khi tới lượt transaction này, update
      // dưới đây khớp 0 dòng, completed = undefined → dừng ngay, không đụng vào inventory.
      const completed = await this.repo.updateStatus(
        id, 'approved', 'completed', { completed_at: trx.fn.now() }, trx,
      )
      if (!completed) {
        throw { statusCode: 400, message: 'Phiếu đã được xử lý bởi 1 yêu cầu khác — vui lòng tải lại' }
      }

      // Cập nhật inventory + stock_movements cho từng line
      for (const line of receipt.lines) {
        // Upsert inventory — đây là công thức avg_cost (giá vốn trung bình) đúng như
        // CLAUDE.md mục 16: avg_cost mới = (tồn cũ*giá cũ + nhập mới*giá mới) / tổng tồn mới.
        // ON CONFLICT DO UPDATE = "upsert": nếu (variant_id, warehouse_id) đã có dòng trong
        // inventory thì UPDATE, chưa có thì INSERT — không cần SELECT trước để biết tồn tại hay chưa.
        // Phải cast rõ ::int / ::numeric — nếu để 2 placeholder nhân nhau (:qty * :cost)
        // mà không cast, Postgres không suy được type của "unknown * unknown" và lỗi
        // "operator is not unique" (phát hiện qua test, không lộ trong code review).
        await trx.raw(
          `INSERT INTO inventory (variant_id, warehouse_id, qty_on_hand, avg_cost, last_updated)
           VALUES (:variant_id, :warehouse_id, :qty::int, :cost::numeric, now())
           ON CONFLICT (variant_id, warehouse_id) DO UPDATE SET
             qty_on_hand  = inventory.qty_on_hand + :qty::int,
             avg_cost     = (inventory.qty_on_hand * inventory.avg_cost + :qty::int * :cost::numeric)
                            / (inventory.qty_on_hand + :qty::int),
             last_updated = now()`,
          { variant_id: line.variant_id, warehouse_id: receipt.warehouse_id, qty: line.quantity, cost: line.cost_price },
        )

        // Ghi lại LỊCH SỬ thay đổi kho (audit trail) — bảng stock_movements không bao giờ
        // bị update/xoá, chỉ insert thêm, nên luôn truy được "ai, lúc nào, từ phiếu nào"
        // đã làm tồn kho thay đổi.
        await trx('stock_movements').insert({
          variant_id:        line.variant_id,
          warehouse_id:      receipt.warehouse_id,
          movement_type:     'in',   // receipt luôn là nhập kho → movement_type = 'in'
          quantity:          line.quantity,
          unit_cost:         line.cost_price,
          ref_document_type: 'receipt',   // polymorphic reference — xem CLAUDE.md mục 19
          ref_document_id:   id,
          created_by:        userId,
        })

        // receipt_line CHÍNH LÀ 1 lô nhập (1 SKU trong 1 lần nhập) — set qty_remaining =
        // quantity ngay lúc này (trước đó NULL vì hàng chưa thật vào kho). Delivery xuất
        // theo FIFO sẽ trừ dần field này (mặc định, CLAUDE.md mục 19). Áp dụng cho cả
        // storable và consumable, không cần bảng stock_batches riêng (xem schema SQL).
        await trx('receipt_lines').where({ id: line.id }).update({ qty_remaining: line.quantity })

        // storable → mỗi serial 1 dòng riêng trong serial_numbers, status active,
        // warehouse_id = kho vừa nhập, gắn receipt_line_id để khi xuất biết đúng lô cần trừ.
        // warranty_end = completed_at + warranty_months của LÔ này (không phải variant
        // default) — tính ngay trong SQL để cùng mốc thời gian với completed_at ở trên.
        if (line.product_type === 'storable') {
          const serials = serialsByLine.get(line.id) ?? []
          // So sánh != null (không dùng truthy check) — warranty_months = 0 là giá trị
          // hợp lệ (schema cho phép minimum 0, nghĩa là "không bảo hành" tường minh, khác
          // với "không khai báo"), nhưng 0 bị falsy nên `line.warranty_months ?` sẽ coi
          // 0 giống null và luôn ra warranty_end = null — sai với trường hợp này.
          const warrantyEndExpr =
            line.warranty_months != null
              ? trx.raw("now() + (?::int * interval '1 month')", [line.warranty_months])
              : null
          await trx('serial_numbers').insert(
            serials.map((serial_no) => ({
              serial_no,
              variant_id:      line.variant_id,
              warehouse_id:    receipt.warehouse_id,
              status:          'active',
              receipt_line_id: line.id,
              warranty_end:    warrantyEndExpr,
            })),
          )
        }
      }

      return completed
    })
  }

  // Huỷ receipt — chỉ chặn huỷ khi ĐÃ completed (vì lúc đó tồn kho đã thay đổi thật,
  // huỷ ngược lại cần nghiệp vụ riêng, không đơn giản là update status) hoặc đã cancelled rồi.
  // Chỉ người tạo phiếu HOẶC người có quyền receipt.approve (Manager/Admin) mới được huỷ.
  async cancel(id: string, userId: string, roleId: string) {
    const receipt = await this.repo.findById(id)
    if (!receipt) throw { statusCode: 404, message: 'Receipt not found' }
    if (['completed', 'cancelled'].includes(receipt.status)) {
      throw { statusCode: 400, message: 'Không thể huỷ phiếu đã hoàn thành hoặc đã huỷ' }
    }

    if (receipt.created_by !== userId) {
      const canApprove = await this.db('role_permissions as rp')
        .join('permissions as p', 'p.id', 'rp.permission_id')
        .where('rp.role_id', roleId)
        .where('p.key', 'receipt.approve')
        .first()
      if (!canApprove) {
        throw { statusCode: 403, message: 'Chỉ người tạo phiếu hoặc người có quyền duyệt mới được huỷ' }
      }
    }

    return this.db.transaction(async (trx) => {
      // Atomic guard: nếu giữa lúc check status ở trên và lúc này, phiếu đã bị complete
      // bởi 1 request khác, whereIn không khớp 'completed' → update dưới đây trả undefined.
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
