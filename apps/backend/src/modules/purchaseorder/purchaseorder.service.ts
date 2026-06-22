import { Knex } from 'knex'
import { PurchaseOrderRepository } from './purchaseorder.repository'
import { CreatePurchaseOrderBody, UpdatePurchaseOrderBody, ListPurchaseOrderQuery } from './purchaseorder.schema'

const PG_FOREIGN_KEY_VIOLATION = '23503'

function mapDbError(err: any): never {
  if (err.code === PG_FOREIGN_KEY_VIOLATION) {
    throw { statusCode: 400, message: 'Tham chiếu không hợp lệ (company/contact/variant không tồn tại)' }
  }
  throw err
}

export class PurchaseOrderService {
  private repo: PurchaseOrderRepository

  constructor(private db: Knex) {
    this.repo = new PurchaseOrderRepository(db)
  }

  list(query: ListPurchaseOrderQuery) {
    return this.repo.findAll(query)
  }

  async getById(id: string) {
    const po = await this.repo.findById(id)
    if (!po) throw { statusCode: 404, message: 'Purchase Order not found' }
    return po
  }

  async create(data: CreatePurchaseOrderBody, userId: string) {
    const { lines, ...header } = data
    try {
      return await this.db.transaction((trx) => this.repo.create(header, lines, userId, trx))
    } catch (err) {
      mapDbError(err)
    }
  }

  // Chỉ sửa được khi còn Draft — giống quotation.update(), muốn sửa PO đã Confirm phải
  // /unconfirm trước.
  async update(id: string, data: UpdatePurchaseOrderBody) {
    const existing = await this.repo.findById(id)
    if (!existing) throw { statusCode: 404, message: 'Purchase Order not found' }
    if (existing.status !== 'draft') {
      throw { statusCode: 400, message: 'Chỉ có thể sửa PO ở trạng thái Draft — gọi /unconfirm trước' }
    }

    const { lines, ...header } = data

    try {
      return await this.db.transaction(async (trx) => {
        const updated = await this.repo.updateHeader(id, header, trx)
        if (lines) {
          const replacedLines = await this.repo.replaceLines(id, lines, trx)
          return { ...updated, lines: replacedLines }
        }
        return updated
      })
    } catch (err) {
      mapDbError(err)
    }
  }

  // ─── State machine ─────────────────────────────────────────────────────

  async confirm(id: string) {
    return this.db.transaction(async (trx) => {
      const current = await this.repo.lockForUpdate(id, trx)
      if (!current) throw { statusCode: 404, message: 'Purchase Order not found' }
      if (current.status !== 'draft') {
        throw { statusCode: 400, message: 'Chỉ có thể xác nhận từ Draft' }
      }
      return this.repo.updateStatus(id, 'draft', 'confirmed', {}, trx)
    })
  }

  // Confirmed → Draft để sửa — chặn nếu đã có Receipt liên quan (đã nhận hoặc đang chờ
  // xử lý), giống quotation.unconfirm() chặn khi có DO liên quan.
  // assertNoReceiptActivity() chạy NGAY SAU forUpdate() lock, trong transaction — không
  // còn đọc qua findById() trước khi mở transaction (Bug đã sửa: trước đây 1 request
  // unconfirm() và 1 request receipt.create() cùng PO có thể chạy xen kẽ, request
  // unconfirm đọc progress cũ rồi pass check ngay trước khi Receipt mới được insert).
  async unconfirm(id: string) {
    return this.db.transaction(async (trx) => {
      const current = await this.repo.lockForUpdate(id, trx)
      if (!current) throw { statusCode: 404, message: 'Purchase Order not found' }
      if (current.status !== 'confirmed') {
        throw { statusCode: 400, message: 'Chỉ có thể chuyển về Draft từ Confirmed' }
      }
      const lines = await this.repo.findLinesWithProgress(id, trx)
      this.assertNoReceiptActivity({ lines }, 'Không thể chuyển về Draft')
      return this.repo.updateStatus(id, 'confirmed', 'draft', {}, trx)
    })
  }

  // Chỉ người tạo PO HOẶC người có quyền purchase_order.confirm mới được huỷ — giống
  // pattern quotation.cancel()/receipt.cancel(). Permission/ownership check dựa vào
  // created_by — field này không đổi sau khi tạo nên đọc ngoài transaction là an toàn,
  // không cần lock. assertNoReceiptActivity() thì phải chạy lại SAU lock (cùng lý do
  // như unconfirm() ở trên).
  async cancel(id: string, userId: string, roleId: string) {
    const po = await this.repo.findById(id)
    if (!po) throw { statusCode: 404, message: 'Purchase Order not found' }
    if (po.status === 'cancelled') {
      throw { statusCode: 400, message: 'PO đã được huỷ' }
    }

    if (po.created_by !== userId) {
      const canConfirm = await this.db('role_permissions as rp')
        .join('permissions as p', 'p.id', 'rp.permission_id')
        .where('rp.role_id', roleId)
        .where('p.key', 'purchase_order.confirm')
        .first()
      if (!canConfirm) {
        throw { statusCode: 403, message: 'Chỉ người tạo PO hoặc người có quyền xác nhận mới được huỷ' }
      }
    }

    return this.db.transaction(async (trx) => {
      const current = await this.repo.lockForUpdate(id, trx)
      if (!current) throw { statusCode: 404, message: 'Purchase Order not found' }
      if (current.status === 'cancelled') {
        throw { statusCode: 400, message: 'PO đã được huỷ' }
      }
      if (current.status === 'confirmed') {
        const lines = await this.repo.findLinesWithProgress(id, trx)
        this.assertNoReceiptActivity({ lines }, 'Không thể huỷ')
      }
      return this.repo.updateStatus(id, current.status, 'cancelled', {}, trx)
    })
  }

  private assertNoReceiptActivity(po: any, action: string) {
    const hasActivity = po.lines.some((l: any) => l.received_qty > 0 || l.pending_qty > 0)
    if (hasActivity) {
      throw {
        statusCode: 400,
        message: `${action} khi đang có Receipt liên quan (đã nhận hoặc đang chờ xử lý)`,
      }
    }
  }
}
