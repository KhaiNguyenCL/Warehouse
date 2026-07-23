import { Knex } from 'knex'
import { PurchaseOrderRepository } from './purchaseorder.repository'
import {
  CreatePurchaseOrderBody,
  UpdatePurchaseOrderBody,
  ListPurchaseOrderQuery,
  PurchaseOrderLineInput,
} from './purchaseorder.schema'
import { CustomFieldRepository } from '../customfield/customfield.repository'
import { validateCustomFieldValue } from '../customfield/customfield.service'

const PG_FOREIGN_KEY_VIOLATION = '23503'

function mapDbError(err: any): never {
  if (err.code === PG_FOREIGN_KEY_VIOLATION) {
    throw { statusCode: 400, message: 'Tham chiếu không hợp lệ (company/contact/variant không tồn tại)' }
  }
  throw err
}

export class PurchaseOrderService {
  private repo: PurchaseOrderRepository
  private customFieldRepo: CustomFieldRepository

  constructor(private db: Knex) {
    this.repo = new PurchaseOrderRepository(db)
    this.customFieldRepo = new CustomFieldRepository(db)
  }

  // custom_field_values trên PO line chỉ chấp nhận field định nghĩa object_type="variant"
  // VÀ applies_to_po_line=true (xem customfield.schema.ts) — field khác hoặc field chưa
  // bật cờ này thì PO line không được phép ghi đè riêng.
  private async validateLineCustomFieldValues(lines: PurchaseOrderLineInput[]) {
    const fieldIds = [...new Set(lines.flatMap((l) => (l.custom_field_values ?? []).map((v) => v.field_id)))]
    if (fieldIds.length === 0) return
    const fields = await this.customFieldRepo.findByIds(fieldIds)
    const fieldById = new Map(fields.map((f) => [f.id, f]))

    for (const line of lines) {
      for (const v of line.custom_field_values ?? []) {
        const field = fieldById.get(v.field_id)
        if (!field) throw { statusCode: 400, message: `Custom field "${v.field_id}" không tồn tại` }
        if (field.object_type !== 'variant' || !field.applies_to_po_line) {
          throw {
            statusCode: 400,
            message: `Custom field "${field.field_label}" không được phép sửa riêng theo PO line`,
          }
        }
        if (v.value !== null && v.value !== undefined) validateCustomFieldValue(field, v.value)
      }
    }
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
    await this.validateLineCustomFieldValues(lines)
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
    if (lines) await this.validateLineCustomFieldValues(lines)

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

  async confirm(id: string, userId: string) {
    return this.db.transaction(async (trx) => {
      const current = await this.repo.lockForUpdate(id, trx)
      if (!current) throw { statusCode: 404, message: 'Purchase Order not found' }
      if (current.status !== 'draft') {
        throw { statusCode: 400, message: 'Chỉ có thể xác nhận từ Draft' }
      }
      return this.repo.updateStatus(id, 'draft', 'confirmed', { confirmed_by: userId }, trx)
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

  // Soft-delete — chỉ cho phép khi không có receipt nào liên kết (received_qty = pending_qty = 0).
  async delete(id: string) {
    const po = await this.repo.findById(id)
    if (!po) throw { statusCode: 404, message: 'Purchase Order not found' }

    const hasLinkedReceipts = await this.db('receipts').where({ po_id: id }).first()
    if (hasLinkedReceipts) {
      throw { statusCode: 400, message: 'Không thể xoá PO đang có phiếu nhập kho liên kết' }
    }

    return this.repo.softDelete(id)
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
