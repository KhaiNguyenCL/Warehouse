import { Knex } from 'knex'
import { DeliveryRepository } from './delivery.repository'
import { CreateDeliveryBody, ListDeliveryQuery, CompleteDeliveryBody, ExportType } from './delivery.schema'

// CLAUDE.md mục 9 — bảng "Các loại xuất kho". export_type nào bắt buộc company,
// export_type nào bắt buộc quotation_id. Validate ngay lúc tạo, không để tới Complete
// mới phát hiện thiếu thông tin.
const REQUIRES_COMPANY: Record<ExportType, boolean> = {
  sale: true,
  internal: false,
  demo_out: true,
  warranty_out: false,
  return_out: true,
  dispose: false,
  adjustment: false,
}

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
    if (REQUIRES_COMPANY[data.export_type] && !data.company_id) {
      throw { statusCode: 400, message: `export_type "${data.export_type}" bắt buộc phải có company_id` }
    }
    if (data.export_type === 'sale' && !data.quotation_id) {
      throw { statusCode: 400, message: 'export_type "sale" bắt buộc phải có quotation_id' }
    }

    return this.db.transaction((trx) => this.repo.create(data, userId, trx))
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

      if (line.product_type === 'storable' && delivery.export_type !== 'adjustment') {
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

        if (line.product_type === 'storable' && delivery.export_type !== 'adjustment') {
          const serials = serialsByLine.get(line.id) ?? []
          await this.applySerialTransition(
            trx, delivery.export_type, line.id, line.variant_id, delivery.warehouse_id, serials,
          )
        }
      }

      return completed
    })
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
    exportType: ExportType,
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
