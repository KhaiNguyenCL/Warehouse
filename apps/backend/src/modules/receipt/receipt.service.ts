// Service — chứa STATE MACHINE của Receipt: draft → pending_approval → approved → completed
// (hoặc cancelled ở bất kỳ bước nào trước completed). Mỗi hàm tự kiểm tra status hiện tại
// hợp lệ để chuyển bước hay không — đây là chỗ enforce nghiệp vụ ở mục 11 CLAUDE.md.
import { Knex } from 'knex'
import { ReceiptRepository } from './receipt.repository'
import { CreateReceiptBody, ListReceiptQuery } from './receipt.schema'

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

  // Tạo receipt — bọc trong db.transaction() dù repository.create() chỉ có 2 insert,
  // để nếu sau này thêm bước nữa (ví dụ ghi log) thì vẫn an toàn atomic.
  async create(data: CreateReceiptBody, userId: string) {
    return this.db.transaction((trx) => this.repo.create(data, userId, trx))
  }

  // draft → pending_approval. Chỉ cho phép submit nếu ĐANG ở draft — chặn việc
  // submit 2 lần hoặc submit 1 receipt đã approved/completed.
  async submitForApproval(id: string, userId: string) {
    const receipt = await this.repo.findById(id)
    if (!receipt) throw { statusCode: 404, message: 'Receipt not found' }
    if (receipt.status !== 'draft') throw { statusCode: 400, message: 'Chỉ có thể submit từ Draft' }

    return this.db.transaction((trx) =>
      this.repo.updateStatus(id, 'pending_approval', {}, trx),
    )
  }

  // pending_approval → approved. Theo CLAUDE.md mục 11: 1 cấp duyệt, người approve
  // được ghi lại (approved_by) để biết ai chịu trách nhiệm — không tự xoá thông tin này.
  async approve(id: string, approverId: string) {
    const receipt = await this.repo.findById(id)
    if (!receipt) throw { statusCode: 404, message: 'Receipt not found' }
    if (receipt.status !== 'pending_approval') throw { statusCode: 400, message: 'Chỉ có thể duyệt từ Pending Approval' }

    return this.db.transaction((trx) =>
      this.repo.updateStatus(id, 'approved', { approved_by: approverId, approved_at: trx.fn.now() }, trx),
    )
  }

  // approved → completed. Đây là bước QUAN TRỌNG NHẤT — lúc này tồn kho thật sự thay đổi.
  // Trước khi Complete, hàng "chưa tồn tại" trong kho — chỉ là dữ liệu trên giấy.
  async complete(id: string, userId: string) {
    const receipt = await this.repo.findById(id)
    if (!receipt) throw { statusCode: 404, message: 'Receipt not found' }
    if (receipt.status !== 'approved') throw { statusCode: 400, message: 'Chỉ có thể hoàn thành từ Approved' }

    // TOÀN BỘ logic dưới đây nằm trong 1 transaction — nếu 1 trong N dòng cập nhật
    // inventory thất bại (ví dụ lỗi DB giữa đường), Postgres rollback hết, không để
    // tồn kho bị cập nhật "nửa chừng" (ví dụ 3/5 dòng hàng đã cộng kho, 2 dòng chưa).
    return this.db.transaction(async (trx) => {
      const completed = await this.repo.updateStatus(
        id, 'completed', { completed_at: trx.fn.now() }, trx,
      )

      // Cập nhật inventory + stock_movements cho từng line
      for (const line of receipt.lines) {
        // Upsert inventory — đây là công thức avg_cost (giá vốn trung bình) đúng như
        // CLAUDE.md mục 16: avg_cost mới = (tồn cũ*giá cũ + nhập mới*giá mới) / tổng tồn mới.
        // ON CONFLICT DO UPDATE = "upsert": nếu (variant_id, warehouse_id) đã có dòng trong
        // inventory thì UPDATE, chưa có thì INSERT — không cần SELECT trước để biết tồn tại hay chưa.
        await trx.raw(
          `INSERT INTO inventory (variant_id, warehouse_id, qty_on_hand, avg_cost, last_updated)
           VALUES (:variant_id, :warehouse_id, :qty, :cost, now())
           ON CONFLICT (variant_id, warehouse_id) DO UPDATE SET
             qty_on_hand  = inventory.qty_on_hand + :qty,
             avg_cost     = (inventory.qty_on_hand * inventory.avg_cost + :qty * :cost)
                            / (inventory.qty_on_hand + :qty),
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
      }

      return completed
    })
  }

  // Huỷ receipt — chỉ chặn huỷ khi ĐÃ completed (vì lúc đó tồn kho đã thay đổi thật,
  // huỷ ngược lại cần nghiệp vụ riêng, không đơn giản là update status) hoặc đã cancelled rồi.
  async cancel(id: string) {
    const receipt = await this.repo.findById(id)
    if (!receipt) throw { statusCode: 404, message: 'Receipt not found' }
    if (['completed', 'cancelled'].includes(receipt.status)) {
      throw { statusCode: 400, message: 'Không thể huỷ phiếu đã hoàn thành hoặc đã huỷ' }
    }

    return this.db.transaction((trx) =>
      this.repo.updateStatus(id, 'cancelled', {}, trx),
    )
  }
}
