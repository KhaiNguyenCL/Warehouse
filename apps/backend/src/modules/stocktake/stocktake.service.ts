import { Knex } from 'knex'
import { StocktakeRepository } from './stocktake.repository'
import { CreateStocktakeBody, ListStocktakeQuery, CompleteStocktakeBody } from './stocktake.schema'

export class StocktakeService {
  private repo: StocktakeRepository

  constructor(private db: Knex) {
    this.repo = new StocktakeRepository(db)
  }

  list(query: ListStocktakeQuery) {
    return this.repo.findAll(query)
  }

  async getById(id: string) {
    const stocktake = await this.repo.findById(id)
    if (!stocktake) throw { statusCode: 404, message: 'Stocktake not found' }
    return stocktake
  }

  // Snapshot qty_system NGAY lúc tạo — sau đó kho vẫn hoạt động bình thường (CLAUDE.md
  // mục 6: "Kho không bị khoá"), số liệu trong stocktake_lines không tự cập nhật theo.
  async create(data: CreateStocktakeBody, userId: string) {
    const scopeType = data.scope_type ?? 'all'
    if (scopeType !== 'all' && (!data.scope_ids || data.scope_ids.length === 0)) {
      throw { statusCode: 400, message: `scope_type "${scopeType}" bắt buộc phải có scope_ids` }
    }

    const variants = await this.repo.resolveScopeVariants(data.warehouse_id, scopeType, data.scope_ids ?? [])
    if (variants.length === 0) {
      throw { statusCode: 400, message: 'Không tìm thấy sản phẩm nào trong phạm vi kiểm kê' }
    }

    return this.db.transaction((trx) =>
      this.repo.create(
        {
          warehouse_id: data.warehouse_id,
          scope_type: scopeType,
          scope_ids: data.scope_ids ?? null,
          note: data.note,
        },
        variants,
        userId,
        trx,
      ),
    )
  }

  // Hoàn thành kiểm kê: ghi qty_actual từng dòng, đối chiếu serial (dòng storable), tính
  // kết quả tổng hợp rồi lưu vào stocktake_results. CLAUDE.md mục 6: "Stocktake Result chỉ
  // lưu trữ, không tự điều chỉnh tồn kho" — KHÔNG đụng vào inventory.qty_on_hand ở đây.
  // Muốn điều chỉnh thật, tạo Receipt/Delivery import_type/export_type='adjustment' riêng,
  // tham chiếu tới stocktake_result này (mục 8, 9).
  async complete(id: string, body: CompleteStocktakeBody) {
    const stocktake = await this.repo.findById(id)
    if (!stocktake) throw { statusCode: 404, message: 'Stocktake not found' }
    if (stocktake.status !== 'in_progress') {
      throw { statusCode: 400, message: 'Chỉ có thể hoàn thành kiểm kê đang In Progress' }
    }

    const actualByLine = new Map(body.lines.map((l) => [l.line_id, l]))
    const missing = stocktake.lines.filter((l: any) => l.qty_actual === null && !actualByLine.has(l.id))
    if (missing.length > 0) {
      throw {
        statusCode: 400,
        message: `Thiếu số lượng thực tế cho: ${missing.map((l: any) => l.sku).join(', ')}`,
      }
    }

    return this.db.transaction(async (trx) => {
      const locked = await this.repo.lockForUpdate(id, trx)
      if (!locked || locked.status !== 'in_progress') {
        throw { statusCode: 400, message: 'Kiểm kê đã được xử lý bởi 1 yêu cầu khác — vui lòng tải lại' }
      }

      for (const line of stocktake.lines) {
        const input = actualByLine.get(line.id)
        if (!input) continue // đã có qty_actual từ trước (lưu dở rồi complete lại)

        await this.repo.updateLineActual(line.id, input.qty_actual, trx)
        if (line.product_type === 'storable') {
          await this.reconcileSerials(stocktake.warehouse_id, id, line.variant_id, input.found_serials ?? [], trx)
        }
      }

      const finalLines = await this.repo.findLines(id, trx)
      const matched = finalLines.filter((l: any) => l.difference === 0).length
      const shortage = finalLines.filter((l: any) => l.difference < 0).length
      const surplus = finalLines.filter((l: any) => l.difference > 0).length

      await this.repo.insertResult(
        id,
        { total_sku: finalLines.length, matched, shortage, surplus, note: body.note },
        trx,
      )
      return this.repo.updateStatus(id, 'in_progress', 'completed', { completed_at: trx.fn.now() }, trx)
    })
  }

  // Đối chiếu serial THỰC TẾ quét được (found_serials) với serial active trong hệ thống
  // tại kho này: serial active mà KHÔNG có trong found_serials → missing; serial trong
  // found_serials mà KHÔNG thuộc active tại kho này → unexpected (chỉ ghi nhận được nếu
  // serial đó tồn tại sẵn trong serial_numbers — stocktake_serials.serial_id có FK,
  // serial nhập tay sai/không tồn tại trong hệ thống sẽ bị bỏ qua ở mức serial-level,
  // nhưng vẫn được phản ánh qua qty_actual/difference ở mức số lượng).
  private async reconcileSerials(
    warehouseId: string,
    stocktakeId: string,
    variantId: string,
    foundSerialNos: string[],
    trx: Knex.Transaction,
  ) {
    const expected = await this.repo.findActiveSerials(variantId, warehouseId, trx)
    const expectedSerialNos = new Set(expected.map((s: any) => s.serial_no))
    const foundSet = new Set(foundSerialNos)

    const rows = expected.map((s: any) => ({
      stocktake_id: stocktakeId,
      serial_id: s.id,
      status: foundSet.has(s.serial_no) ? 'found' : 'missing',
    }))

    const unexpectedNos = foundSerialNos.filter((no) => !expectedSerialNos.has(no))
    if (unexpectedNos.length > 0) {
      const matches = await this.repo.findSerialsByNumbers(unexpectedNos, trx)
      for (const s of matches) {
        rows.push({ stocktake_id: stocktakeId, serial_id: s.id, status: 'unexpected' })
      }
    }

    await this.repo.insertStocktakeSerials(rows, trx)
  }

  // Chỉ người tạo kiểm kê HOẶC người có quyền stocktake.complete mới được huỷ — cùng
  // pattern với receipt/delivery/transfer/quotation (creator hoặc người có quyền cấp cao hơn).
  async cancel(id: string, userId: string, roleId: string) {
    const stocktake = await this.repo.findById(id)
    if (!stocktake) throw { statusCode: 404, message: 'Stocktake not found' }
    if (stocktake.status !== 'in_progress') {
      throw { statusCode: 400, message: 'Chỉ có thể huỷ kiểm kê đang In Progress' }
    }

    if (stocktake.created_by !== userId) {
      const canComplete = await this.db('role_permissions as rp')
        .join('permissions as p', 'p.id', 'rp.permission_id')
        .where('rp.role_id', roleId)
        .where('p.key', 'stocktake.complete')
        .first()
      if (!canComplete) {
        throw { statusCode: 403, message: 'Chỉ người tạo kiểm kê hoặc người có quyền hoàn thành mới được huỷ' }
      }
    }

    return this.db.transaction(async (trx) => {
      const cancelled = await this.repo.updateStatus(id, 'in_progress', 'cancelled', {}, trx)
      if (!cancelled) {
        throw { statusCode: 400, message: 'Kiểm kê đã được xử lý bởi 1 yêu cầu khác — vui lòng tải lại' }
      }
      return cancelled
    })
  }
}
