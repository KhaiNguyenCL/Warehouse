import { Knex } from 'knex'
import { ShipmentRepository } from './shipment.repository'
import {
  CreateShipmentBody,
  UpdateShipmentBody,
  ReceiveShipmentBody,
  ListShipmentQuery,
} from './shipment.schema'
import { getNotificationService } from '../notification/notification.service'

export class ShipmentService {
  private repo: ShipmentRepository

  constructor(private db: Knex) {
    this.repo = new ShipmentRepository(db)
  }

  async list(query: ListShipmentQuery) {
    return this.repo.findAll(query)
  }

  async getById(id: string) {
    const shipment = await this.repo.findById(id)
    if (!shipment) throw { statusCode: 404, message: 'Phiếu nhận hàng không tồn tại' }
    return shipment
  }

  // validatePurchaseOrder() PHẢI chạy TRONG transaction này với forUpdate() lock đúng
  // dòng purchase_orders — khớp với lockForUpdate() bên purchaseorder.service.ts::
  // unconfirm()/cancel() (xem receipt.service.ts::validatePurchaseOrder() làm mẫu), để
  // 1 request tạo Shipment và 1 request unconfirm/cancel PO cùng lúc buộc phải serialize
  // thay vì cùng đọc status 'confirmed' cũ rồi cùng pass validate.
  async create(data: CreateShipmentBody, userId: string) {
    return this.db.transaction(async (trx) => {
      if (data.po_id) {
        const po = await trx('purchase_orders').where({ id: data.po_id }).forUpdate().first()
        if (!po) throw { statusCode: 404, message: 'Purchase Order không tồn tại' }
        if (po.status !== 'confirmed') throw { statusCode: 400, message: 'Purchase Order phải ở trạng thái Confirmed' }

        // Nếu có po_line_id trên lines: validate thuộc đúng PO này
        const poLineIds = data.lines.filter((l) => l.po_line_id).map((l) => l.po_line_id as string)
        if (poLineIds.length > 0) {
          const validLines = await trx('purchase_order_lines')
            .whereIn('id', poLineIds)
            .where('purchase_order_id', data.po_id)
            .forUpdate()
            .pluck('id')
          const invalid = poLineIds.filter((id) => !validLines.includes(id))
          if (invalid.length > 0) {
            throw { statusCode: 400, message: `Dòng PO không thuộc PO này: ${invalid.join(', ')}` }
          }
        }
      }

      return this.repo.create(data, userId, trx)
    })
  }

  async update(id: string, data: UpdateShipmentBody) {
    const shipment = await this.repo.findById(id)
    if (!shipment) throw { statusCode: 404, message: 'Phiếu nhận hàng không tồn tại' }
    if (shipment.status !== 'draft') throw { statusCode: 400, message: 'Chỉ có thể sửa phiếu ở trạng thái Draft' }
    return this.repo.update(id, data as Record<string, unknown>)
  }

  // Xác nhận đã nhận hàng vật lý — cập nhật qty_received + condition cho từng dòng
  async receive(id: string, userId: string, body: ReceiveShipmentBody) {
    let shipmentCode: string | undefined
    await this.db.transaction(async (trx) => {
      const received = await this.repo.updateStatus(
        id, 'draft', 'received',
        {
          received_by: userId,
          received_date: body.received_date ?? trx.fn.now(),
          notes: body.notes,
          ...(body.attachments !== undefined && { attachments: JSON.stringify(body.attachments) }),
        },
        trx,
      )
      if (!received) {
        throw { statusCode: 400, message: 'Phiếu đã được xử lý bởi yêu cầu khác — vui lòng tải lại' }
      }
      shipmentCode = received.code

      // Cập nhật từng dòng nếu client gửi
      if (body.lines && body.lines.length > 0) {
        for (const l of body.lines) {
          const { line_id, ...fields } = l
          if (Object.keys(fields).length > 0) {
            await trx('shipment_lines').where({ id: line_id, shipment_id: id }).update(fields)
          }
        }
      }
    })

    // Thông báo ngoài transaction — dùng this.db, không dùng trx
    // để tránh notification failure làm rollback transaction chính
    try {
      await getNotificationService(this.db).notifyByPermission(
        this.db,
        'receipt.create',
        {
          type: 'shipment_received',
          title: `Phiếu nhận hàng ${shipmentCode} đã xác nhận`,
          body: 'Hàng đã về kho — cần tạo phiếu nhập kho để cập nhật tồn kho.',
          link: `/shipments/${id}`,
        },
        userId,
      )
    } catch (_) { /* không chặn luồng chính nếu thông báo lỗi */ }

    // findById ngoài transaction — đọc data đã commit, trả về status mới nhất
    return this.repo.findById(id)
  }

  async cancel(id: string) {
    const shipment = await this.repo.findById(id)
    if (!shipment) throw { statusCode: 404, message: 'Phiếu nhận hàng không tồn tại' }
    if (shipment.status === 'cancelled') throw { statusCode: 400, message: 'Phiếu đã bị huỷ' }
    if (shipment.status === 'received') {
      // Không cho huỷ nếu đã có Receipt completed liên kết
      const hasCompletedReceipt = await this.db('receipts')
        .where({ shipment_id: id, status: 'completed' })
        .first()
      if (hasCompletedReceipt) {
        throw { statusCode: 400, message: 'Không thể huỷ phiếu đã có phiếu nhập kho hoàn thành' }
      }
    }

    return this.db.transaction((trx) =>
      this.repo.updateStatus(id, ['draft', 'received'], 'cancelled', {}, trx)
    )
  }
}
