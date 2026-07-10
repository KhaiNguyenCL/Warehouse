import { Knex } from 'knex'
import { TransferRepository } from './transfer.repository'
import { CreateTransferBody, ListTransferQuery, CompleteTransferBody } from './transfer.schema'

// CLAUDE.md mục 10: với 4 transfer_type này, kho NGUỒN luôn là 1 kho ảo cố định —
// client chỉ cần chọn kho đích (vật lý), không cần biết UUID kho ảo.
const VIRTUAL_SOURCE_WAREHOUSE_CODE: Partial<Record<CreateTransferBody['transfer_type'], string>> = {
  warranty_in: 'WH-BH',
  demo_in: 'WH-DEMO',
  qc_pass: 'WH-QC',
  sn_ready: 'WH-SN',
}

export class TransferService {
  private repo: TransferRepository

  constructor(private db: Knex) {
    this.repo = new TransferRepository(db)
  }

  list(query: ListTransferQuery) {
    return this.repo.findAll(query)
  }

  async getById(id: string) {
    const transfer = await this.repo.findById(id)
    if (!transfer) throw { statusCode: 404, message: 'Transfer order not found' }
    return transfer
  }

  async update(id: string, data: Record<string, unknown>) {
    const transfer = await this.repo.findById(id)
    if (!transfer) throw { statusCode: 404, message: 'Transfer order not found' }
    if (transfer.status !== 'draft') throw { statusCode: 409, message: 'Chỉ sửa được khi Draft' }
    return this.repo.update(id, data)
  }

  // Tự suy from_warehouse_id theo transfer_type — bỏ qua from_warehouse_id client gửi lên
  // (nếu có) cho 4 type "nhận lại từ kho ảo", để tránh nhập sai/giả mạo UUID kho ảo.
  private async resolveFromWarehouseId(data: CreateTransferBody, trx: Knex.Transaction): Promise<string> {
    const virtualCode = VIRTUAL_SOURCE_WAREHOUSE_CODE[data.transfer_type]
    if (!virtualCode) {
      if (!data.from_warehouse_id) {
        throw { statusCode: 400, message: 'Thiếu from_warehouse_id cho transfer_type="transfer"' }
      }
      return data.from_warehouse_id
    }

    const virtualWarehouse = await this.repo.findWarehouseByCode(virtualCode, trx)
    if (!virtualWarehouse) {
      throw { statusCode: 500, message: `Kho ảo ${virtualCode} chưa được seed trong hệ thống` }
    }
    return virtualWarehouse.id
  }

  async create(data: CreateTransferBody, userId: string) {
    return this.db.transaction(async (trx) => {
      const from_warehouse_id = await this.resolveFromWarehouseId(data, trx)

      // CHECK constraint trong DB cũng chặn việc này, nhưng validate ở app cho message
      // rõ ràng (409/500 từ raw constraint violation khó hiểu hơn nhiều so với 400 này).
      if (from_warehouse_id === data.to_warehouse_id) {
        throw { statusCode: 400, message: 'Kho nguồn và kho đích không được trùng nhau' }
      }
      return this.repo.create({ ...data, from_warehouse_id }, userId, trx)
    })
  }

  // updateStatus() so khớp status trong WHERE — atomic, tránh race condition khi 2
  // request cùng lúc chuyển trạng thái (xem chi tiết ở receipt.service.ts).
  private async failTransition(id: string, trx: Knex.Transaction, message: string): Promise<never> {
    const exists = await trx('transfer_orders').where({ id }).first()
    if (!exists) throw { statusCode: 404, message: 'Transfer order not found' }
    throw { statusCode: 400, message }
  }

  async complete(id: string, userId: string, body: CompleteTransferBody = {}) {
    const transfer = await this.repo.findById(id)
    if (!transfer) throw { statusCode: 404, message: 'Transfer order not found' }
    if (transfer.status !== 'draft') throw { statusCode: 400, message: 'Chỉ có thể hoàn thành từ Draft' }

    const serialsByLine = new Map((body.lines ?? []).map((l) => [l.line_id, l.serials ?? []]))

    // Validate trước khi mở transaction: đủ tồn ở kho nguồn + đủ serial cho dòng storable.
    // from_warehouse_id ưu tiên theo dòng (line.from_warehouse_id), fallback về header.
    for (const line of transfer.lines) {
      const lineFromWh = line.from_warehouse_id ?? transfer.from_warehouse_id
      const inventory = await this.db('inventory')
        .where({ variant_id: line.variant_id, warehouse_id: lineFromWh })
        .first()
      const available = inventory ? inventory.qty_on_hand : 0
      if (available < line.quantity) {
        throw {
          statusCode: 400,
          message: `Không đủ tồn kho cho ${line.variant_name} ở kho nguồn — còn ${available}, cần chuyển ${line.quantity}`,
        }
      }

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

        const validSerials = await this.db('serial_numbers')
          .whereIn('serial_no', serials)
          .where({ variant_id: line.variant_id, warehouse_id: lineFromWh, status: 'active' })
          .pluck('serial_no')
        const invalidSerials = serials.filter((s) => !validSerials.includes(s))
        if (invalidSerials.length > 0) {
          throw {
            statusCode: 400,
            message: `Serial không hợp lệ cho ${line.variant_name} (không tồn tại / không active / không đúng kho nguồn): ${invalidSerials.join(', ')}`,
          }
        }
      }
    }

    return this.db.transaction(async (trx) => {
      // Guard THẬT chống race condition — xem giải thích chi tiết ở receipt.service.ts.
      const completed = await this.repo.updateStatus(
        id, 'draft', 'completed', { completed_at: trx.fn.now() }, trx,
      )
      if (!completed) {
        throw { statusCode: 400, message: 'Phiếu đã được xử lý bởi 1 yêu cầu khác — vui lòng tải lại' }
      }

      for (const line of transfer.lines) {
        const lineFromWh = line.from_warehouse_id ?? transfer.from_warehouse_id
        const fromInventory = await trx('inventory')
          .where({ variant_id: line.variant_id, warehouse_id: lineFromWh })
          .first()

        // Trừ kho nguồn — không đổi avg_cost (avg_cost chỉ đổi khi NHẬP MỚI, không đổi khi xuất/chuyển)
        await trx('inventory')
          .where({ variant_id: line.variant_id, warehouse_id: lineFromWh })
          .update({
            qty_on_hand: trx.raw('qty_on_hand - ?::int', [line.quantity]),
            last_updated: trx.fn.now(),
          })

        // Cộng kho đích — coi như "nhập" với cost = avg_cost của kho nguồn, dùng đúng
        // công thức upsert avg_cost đã verify ở receipt.service.complete() (nhớ cast ::int/::numeric
        // để tránh lỗi "operator is not unique" giữa 2 placeholder không có type).
        await trx.raw(
          `INSERT INTO inventory (variant_id, warehouse_id, qty_on_hand, avg_cost, last_updated)
           VALUES (:variant_id, :warehouse_id, :qty::int, :cost::numeric, now())
           ON CONFLICT (variant_id, warehouse_id) DO UPDATE SET
             qty_on_hand  = inventory.qty_on_hand + :qty::int,
             avg_cost     = (inventory.qty_on_hand * inventory.avg_cost + :qty::int * :cost::numeric)
                            / (inventory.qty_on_hand + :qty::int),
             last_updated = now()`,
          {
            variant_id: line.variant_id,
            warehouse_id: transfer.to_warehouse_id,
            qty: line.quantity,
            cost: fromInventory?.avg_cost ?? 0,
          },
        )

        // storable → di chuyển đúng các serial đã chọn sang kho đích. Khác với
        // receipt (tạo serial mới) hay delivery (đổi status), transfer chỉ đổi
        // warehouse_id — serial vẫn active, vẫn là chính nó, chỉ đổi vị trí.
        //
        // where lại variant_id + warehouse_id (kho nguồn) + status ngay tại update —
        // phòng request khác xen vào giữa lúc validate và lúc transaction này chạy.
        // .returning('id') để lấy lại đúng id các serial vừa chuyển, gắn vào
        // stock_movements.serial_id phía dưới (đảo thứ tự so với trước: update serial
        // TRƯỚC khi ghi stock_movements).
        let serialIds: string[] = []
        if (line.product_type === 'storable') {
          const serials = serialsByLine.get(line.id) ?? []
          if (serials.length > 0) {
            const updated = await trx('serial_numbers')
              .whereIn('serial_no', serials)
              .where({ variant_id: line.variant_id, warehouse_id: lineFromWh, status: 'active' })
              .update({ warehouse_id: transfer.to_warehouse_id, updated_at: trx.fn.now() })
              .returning('id')

            if (updated.length !== serials.length) {
              throw { statusCode: 409, message: 'Một số serial đã bị thay đổi bởi giao dịch khác, vui lòng thử lại' }
            }
            serialIds = updated.map((r) => r.id)
          }
        }

        // 2 dòng stock_movements — 1 "out" khỏi kho nguồn, 1 "in" vào kho đích — cùng
        // ref_document_id để biết chúng thuộc về 1 lần chuyển kho duy nhất. storable →
        // tách riêng theo TỪNG serial (quantity=1, serial_id gắn đúng SN đó) để có lịch
        // sử di chuyển theo từng SN; consumable → giữ 1 cặp dòng tổng như cũ (serial_id = null).
        if (serialIds.length > 0) {
          await trx('stock_movements').insert(
            serialIds.flatMap((serialId) => [
              {
                variant_id: line.variant_id,
                warehouse_id: lineFromWh,
                serial_id: serialId,
                movement_type: 'out',
                quantity: 1,
                unit_cost: fromInventory?.avg_cost ?? null,
                ref_document_type: 'transfer_order',
                ref_document_id: id,
                created_by: userId,
              },
              {
                variant_id: line.variant_id,
                warehouse_id: transfer.to_warehouse_id,
                serial_id: serialId,
                movement_type: 'in',
                quantity: 1,
                unit_cost: fromInventory?.avg_cost ?? null,
                ref_document_type: 'transfer_order',
                ref_document_id: id,
                created_by: userId,
              },
            ]),
          )
        } else {
          await trx('stock_movements').insert([
            {
              variant_id: line.variant_id,
              warehouse_id: lineFromWh,
              movement_type: 'out',
              quantity: line.quantity,
              unit_cost: fromInventory?.avg_cost ?? null,
              ref_document_type: 'transfer_order',
              ref_document_id: id,
              created_by: userId,
            },
            {
              variant_id: line.variant_id,
              warehouse_id: transfer.to_warehouse_id,
              movement_type: 'in',
              quantity: line.quantity,
              unit_cost: fromInventory?.avg_cost ?? null,
              ref_document_type: 'transfer_order',
              ref_document_id: id,
              created_by: userId,
            },
          ])
        }
      }

      return completed
    })
  }

  // Chỉ người tạo phiếu HOẶC người có quyền transfer.approve (Manager/Admin) mới được huỷ.
  async cancel(id: string, userId: string, roleId: string) {
    const transfer = await this.repo.findById(id)
    if (!transfer) throw { statusCode: 404, message: 'Transfer order not found' }
    if (['completed', 'cancelled'].includes(transfer.status)) {
      throw { statusCode: 400, message: 'Không thể huỷ phiếu đã hoàn thành hoặc đã huỷ' }
    }

    if (transfer.created_by !== userId) {
      const canApprove = await this.db('role_permissions as rp')
        .join('permissions as p', 'p.id', 'rp.permission_id')
        .where('rp.role_id', roleId)
        .where('p.key', 'transfer.approve')
        .first()
      if (!canApprove) {
        throw { statusCode: 403, message: 'Chỉ người tạo phiếu hoặc người có quyền duyệt mới được huỷ' }
      }
    }

    return this.db.transaction(async (trx) => {
      const cancelled = await this.repo.updateStatus(
        id, ['draft'], 'cancelled', {}, trx,
      )
      if (!cancelled) {
        throw { statusCode: 400, message: 'Không thể huỷ phiếu đã hoàn thành hoặc đã huỷ' }
      }
      return cancelled
    })
  }
}
