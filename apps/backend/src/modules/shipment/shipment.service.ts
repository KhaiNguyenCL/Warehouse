import { Knex } from 'knex'
import { ShipmentRepository } from './shipment.repository'
import {
  CreateShipmentBody,
  UpdateShipmentBody,
  ReceiveShipmentBody,
  ListShipmentQuery,
} from './shipment.schema'

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

  async create(data: CreateShipmentBody, userId: string) {
    // Nếu có po_id: PO phải đang Confirmed
    if (data.po_id) {
      const po = await this.db('purchase_orders').where({ id: data.po_id }).first()
      if (!po) throw { statusCode: 404, message: 'Purchase Order không tồn tại' }
      if (po.status !== 'confirmed') throw { statusCode: 400, message: 'Purchase Order phải ở trạng thái Confirmed' }

      // Nếu có po_line_id trên lines: validate thuộc đúng PO này
      const poLineIds = data.lines.filter((l) => l.po_line_id).map((l) => l.po_line_id as string)
      if (poLineIds.length > 0) {
        const validLines = await this.db('purchase_order_lines')
          .whereIn('id', poLineIds)
          .where('purchase_order_id', data.po_id)
          .pluck('id')
        const invalid = poLineIds.filter((id) => !validLines.includes(id))
        if (invalid.length > 0) {
          throw { statusCode: 400, message: `Dòng PO không thuộc PO này: ${invalid.join(', ')}` }
        }
      }
    }

    return this.db.transaction((trx) => this.repo.create(data, userId, trx))
  }

  async update(id: string, data: UpdateShipmentBody) {
    const shipment = await this.repo.findById(id)
    if (!shipment) throw { statusCode: 404, message: 'Phiếu nhận hàng không tồn tại' }
    if (shipment.status !== 'draft') throw { statusCode: 400, message: 'Chỉ có thể sửa phiếu ở trạng thái Draft' }
    return this.repo.update(id, data as Record<string, unknown>)
  }

  // Xác nhận đã nhận hàng vật lý — cập nhật qty_received + condition cho từng dòng
  async receive(id: string, userId: string, body: ReceiveShipmentBody) {
    return this.db.transaction(async (trx) => {
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

      // Cập nhật từng dòng nếu client gửi
      if (body.lines && body.lines.length > 0) {
        for (const l of body.lines) {
          const { line_id, ...fields } = l
          if (Object.keys(fields).length > 0) {
            await trx('shipment_lines').where({ id: line_id, shipment_id: id }).update(fields)
          }
        }
      }

      return this.repo.findById(id)
    })
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
