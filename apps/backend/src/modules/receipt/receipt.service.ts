// Service — chứa STATE MACHINE của Receipt: draft → completed (hoặc cancelled).
// Không còn bước submit/approve — người tạo phiếu có thể Complete trực tiếp từ Draft.
import { Knex } from 'knex'
import { ReceiptRepository } from './receipt.repository'
import { CreateReceiptBody, ListReceiptQuery, CompleteReceiptBody, SerialInput } from './receipt.schema'
import { userHasPermission } from '../../lib/permission-check'
import { logActivity, resolveActorName } from '../../lib/activity-logger'
import { getNotificationService } from '../notification/notification.service'

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

  async update(id: string, data: Record<string, unknown>) {
    const receipt = await this.repo.findById(id)
    if (!receipt) throw { statusCode: 404, message: 'Receipt not found' }
    if (receipt.status !== 'draft') throw { statusCode: 409, message: 'Chỉ sửa được khi Draft' }
    const { lines, ...header } = data as any
    if (Object.keys(header).length) await this.repo.update(id, header)
    if (Array.isArray(lines) && lines.length) await this.repo.updateLines(lines)
    return this.repo.findById(id)
  }

  // Tạo receipt — validatePurchaseOrder() PHẢI chạy TRONG transaction này (không phải
  // 1 SELECT rời trước đó) và lock hàng purchase_orders/purchase_order_lines bằng
  // forUpdate(): nếu để check ngoài transaction, 2 request tạo Receipt cùng lúc cho
  // CÙNG 1 po_line có thể cùng đọc remaining_qty cũ, cùng pass validate, rồi cùng insert
  // → tổng nhận vượt số PO đã đặt (race condition — phát hiện qua review kỹ lại sau khi
  // hỏi "workflow đã chuẩn chưa", không phải qua test, vì test chạy tuần tự không lộ race).
  // complete=true (mockup import-new.html "Tạo phiếu nhập" — khác "Lưu nháp") → tạo VÀ
  // hoàn thành trong CÙNG 1 transaction, tái dùng đúng logic applyLineCompletion() mà
  // complete() dùng, để 2 đường (tạo-rồi-complete-sau vs complete-ngay-lúc-tạo) không
  // bao giờ lệch nhau (fix 1 chỗ là cả 2 đường cùng đúng).
  async create(data: CreateReceiptBody, userId: string) {
    const importType = await this.resolveActiveImportType(data.import_type)
    await this.validateRefDocument(data, importType.requires_ref_document)

    // product_type cần cho cả validate (storable mới bắt serial) LẪN applyLineCompletion()
    // (repo.create() trả raw receipt_lines, không join variants/products) — fetch 1 lần,
    // dùng lại ở cả 2 chỗ thay vì query lại trong transaction.
    let productTypeByVariant = new Map<string, string>()
    if (data.complete) {
      const variantIds = [...new Set(data.lines.map((l) => l.variant_id))]
      const variants = await this.db('variants as v')
        .join('products as p', 'p.id', 'v.product_id')
        .whereIn('v.id', variantIds)
        .select('v.id', 'v.item_code', 'v.sku', 'p.product_type')
      const labelByVariant = new Map(variants.map((v) => [v.id, v.item_code ?? v.sku]))
      productTypeByVariant = new Map(variants.map((v) => [v.id, v.product_type]))
      // Validate serials TRƯỚC khi mở transaction — fail nhanh, giống complete().
      await this.validateSerialsBatch(
        data.lines.map((l, i) => ({
          key: String(i), label: labelByVariant.get(l.variant_id) ?? l.variant_id,
          product_type: productTypeByVariant.get(l.variant_id) ?? 'storable', quantity: l.quantity,
        })),
        new Map(data.lines.map((l, i) => [String(i), l.serials ?? []])),
        data.import_type,
      )
    }

    const receipt = await this.db.transaction(async (trx) => {
      await this.validateShipment(data, trx)
      await this.validatePurchaseOrder(data, trx)
      const created = await this.repo.create(data, userId, trx)

      if (data.complete) {
        for (let i = 0; i < created.lines.length; i++) {
          const line = created.lines[i]
          await this.applyLineCompletion(trx, {
            receiptId: created.id,
            warehouseId: created.warehouse_id,
            importType: data.import_type,
            userId,
            line: { ...line, product_type: productTypeByVariant.get(line.variant_id) ?? 'storable' },
            serials: data.lines[i].serials ?? [],
          })
        }
        const completed = await this.repo.updateStatus(created.id, 'draft', 'completed', { completed_at: trx.fn.now() }, trx)
        if (!completed) throw { statusCode: 500, message: 'Không thể hoàn thành phiếu vừa tạo' }
      }

      return created
    }).catch((err: any) => {
      if (err.code === '23505' && err.constraint?.includes('serial')) {
        throw { statusCode: 400, message: 'Một hoặc nhiều serial number đã tồn tại trong hệ thống (phiếu khác vừa nhập trùng)' }
      }
      throw err
    })

    const actorName = await resolveActorName(this.db, userId)
    await logActivity({ db: this.db, objectType: 'receipt', objectId: receipt.id, objectCode: receipt.code, action: 'created', actorId: userId, actorName })
    if (data.complete) {
      await logActivity({ db: this.db, objectType: 'receipt', objectId: receipt.id, objectCode: receipt.code, action: 'completed', actorId: userId, actorName })
      try {
        await getNotificationService(this.db).notifyByPermission(
          this.db, 'report.inventory',
          { type: 'receipt_completed', title: `Phiếu nhập kho ${receipt.code} đã hoàn thành`, body: 'Tồn kho đã được cập nhật.', link: `/receipts/${receipt.id}` },
          userId,
        )
      } catch (_) { /* không chặn luồng chính */ }
      return this.repo.findById(receipt.id)
    }
    return receipt
  }

  // Quy trình chuẩn: hàng mua từ NCC (import_type='purchase') PHẢI đi qua Phiếu nhận
  // hàng (Shipment) trước. 1 shipment có thể sinh nhiều Receipt (nhập nhiều đợt), nhưng
  // tổng qty của TẤT CẢ receipt (non-cancelled) KHÔNG được vượt qty_received của shipment
  // line tương ứng (per variant). forUpdate() lock shipment để 2 request đồng thời không
  // cùng pass validate rồi over-receipt (race condition giống PO).
  private async validateShipment(data: CreateReceiptBody, trx: Knex.Transaction) {
    if (data.import_type !== 'purchase') return
    if (!data.shipment_id) {
      throw { statusCode: 400, message: 'Phiếu nhập kho (mua hàng) phải được tạo từ 1 Phiếu nhận hàng đã xác nhận nhận hàng' }
    }
    const shipment = await trx('shipments').where({ id: data.shipment_id }).forUpdate().first()
    if (!shipment) throw { statusCode: 400, message: 'Phiếu nhận hàng tham chiếu không tồn tại' }
    if (shipment.status !== 'received') {
      throw { statusCode: 400, message: 'Phiếu nhận hàng phải ở trạng thái "Đã nhận hàng" để tạo Phiếu nhập kho' }
    }

    // Tổng qty có thể nhập theo shipment line (bỏ missing) — group theo variant_id
    const shipmentLines = await trx('shipment_lines as sl')
      .join('variants as v', 'v.id', 'sl.variant_id')
      .where({ 'sl.shipment_id': data.shipment_id })
      .whereNot({ 'sl.condition': 'missing' })
      .select('sl.variant_id', trx.raw('SUM(sl.qty_received)::int as allowed_qty'), 'v.item_code', 'v.sku')
      .groupBy('sl.variant_id', 'v.item_code', 'v.sku')
    const allowedByVariant = new Map(shipmentLines.map((l) => [l.variant_id, { qty: l.allowed_qty as number, label: l.item_code ?? l.sku }]))

    // Tổng qty đã có trong các receipt non-cancelled — group theo variant_id
    const usedRows = await trx('receipt_lines as rl')
      .join('receipts as r', 'r.id', 'rl.receipt_id')
      .where('r.shipment_id', data.shipment_id)
      .whereNot('r.status', 'cancelled')
      .select('rl.variant_id', trx.raw('SUM(rl.quantity)::int as used_qty'))
      .groupBy('rl.variant_id')
    const usedByVariant = new Map(usedRows.map((r) => [r.variant_id, r.used_qty as number]))

    // Tổng qty của request mới — group theo variant_id
    const newQtyByVariant = new Map<string, number>()
    for (const line of data.lines) {
      newQtyByVariant.set(line.variant_id, (newQtyByVariant.get(line.variant_id) ?? 0) + line.quantity)
    }

    for (const [variantId, newQty] of newQtyByVariant) {
      const entry = allowedByVariant.get(variantId)
      const allowed = entry?.qty ?? 0
      const label = entry?.label ?? variantId
      const used = usedByVariant.get(variantId) ?? 0
      const remaining = allowed - used
      if (newQty > remaining) {
        const msg = remaining === 0
          ? `Phiếu nhận hàng ${shipment.code} đã được nhập kho đủ số lượng cho mặt hàng ${label}. Không thể tạo thêm phiếu nhập kho.`
          : `Mặt hàng ${label}: số lượng nhập (${newQty}) vượt quá số lượng còn lại trong Phiếu nhận hàng ${shipment.code} (còn ${remaining}).`
        throw { statusCode: 400, message: msg }
      }
    }
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

    const poLines = await trx('purchase_order_lines as pol')
      .join('variants as v', 'v.id', 'pol.variant_id')
      .where({ 'pol.purchase_order_id': data.po_id })
      .whereIn('pol.id', poLineIds)
      .forUpdate()
      .select('pol.*', 'v.item_code', 'v.sku')
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
        throw { statusCode: 400, message: `Dòng hàng không thuộc Phiếu mua hàng ${po.code}` }
      }
      if (poLine.variant_id !== line.variant_id) {
        throw { statusCode: 400, message: 'Dòng hàng không khớp SKU với dòng trong Phiếu mua hàng' }
      }
      const skuLabel = poLine.item_code ?? poLine.sku
      const used = usedByPoLine.get(line.po_line_id) ?? 0
      const remaining = poLine.quantity - used
      if (line.quantity > remaining) {
        const msg = remaining === 0
          ? `Phiếu mua hàng ${po.code} đã nhận đủ số lượng cho mặt hàng ${skuLabel}. Không thể nhập thêm.`
          : `Mặt hàng ${skuLabel}: số lượng nhập (${line.quantity}) vượt quá số lượng còn lại trong Phiếu mua hàng ${po.code} (còn ${remaining}).`
        throw { statusCode: 400, message: msg }
      }
      // Kế thừa BH từ PO line nếu receipt line không tự khai báo — user nhập 1 lần ở PO,
      // receipt tự điền, không cần nhớ lại. Receipt line vẫn có thể override nếu muốn.
      if (line.manufacturer_warranty_months == null && poLine.manufacturer_warranty_months != null) {
        line.manufacturer_warranty_months = poLine.manufacturer_warranty_months
      }
      if (line.customer_warranty_months == null && poLine.customer_warranty_months != null) {
        line.customer_warranty_months = poLine.customer_warranty_months
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

  // requires_ref_document của import_type quyết định loại document gốc bắt buộc:
  // "adjustment" → stocktake_result, "return_in" → delivery_order. Đọc từ import_types
  // nên type mới thêm qua Settings dùng được ngay, không cần hardcode riêng.
  private async validateRefDocument(data: CreateReceiptBody, requiresRefDocument: string) {
    if (requiresRefDocument === 'none') return
    if (data.ref_document_type !== requiresRefDocument || !data.ref_document_id) {
      throw {
        statusCode: 400,
        message: `import_type "${data.import_type}" bắt buộc ref_document_type="${requiresRefDocument}" và ref_document_id hợp lệ`,
      }
    }
    const tableMap: Record<string, string> = {
      quotation:       'quotations',
      stocktake_result: 'stocktake_results',
      delivery_order:  'delivery_orders',
    }
    const labelMap: Record<string, string> = {
      quotation:       'Quotation',
      stocktake_result: 'Stocktake Result',
      delivery_order:  'Phiếu xuất kho',
    }
    const table = tableMap[requiresRefDocument]
    if (!table) throw { statusCode: 400, message: `ref_document_type "${requiresRefDocument}" không được hỗ trợ` }
    const exists = await this.db(table).where({ id: data.ref_document_id }).first()
    if (!exists) {
      throw {
        statusCode: 400,
        message: `${labelMap[requiresRefDocument] ?? requiresRefDocument} tham chiếu không tồn tại`,
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

  // Validate serial/MAC cho MỘT LÔ dòng hàng — dùng chung cho complete() (key=line.id,
  // đọc product_type/variant_name có sẵn trong receipt.lines) và create({complete:true})
  // (key=index vì dòng chưa có id, phải tự fetch product_type/label trước — xem create()).
  // Tách riêng để 2 đường "complete sau" và "complete ngay lúc tạo" luôn validate giống hệt
  // nhau — sửa quy tắc 1 chỗ, không sợ lệch.
  private async validateSerialsBatch(
    lines: Array<{ key: string; label: string; product_type: string; quantity: number }>,
    serialsByKey: Map<string, SerialInput[]>,
    importType: string,
  ) {
    for (const line of lines) {
      if (line.product_type !== 'storable') continue
      const serials = serialsByKey.get(line.key) ?? []
      if (serials.length !== line.quantity) {
        throw {
          statusCode: 400,
          message: `Dòng hàng ${line.label} (storable) cần đúng ${line.quantity} serial/MAC, nhận được ${serials.length}`,
        }
      }
      // Mỗi entry phải có ít nhất serial_no hoặc mac_address
      const missingId = serials.findIndex((s) => !s.serial_no?.trim() && !s.mac_address?.trim())
      if (missingId >= 0) {
        throw { statusCode: 400, message: `Dòng hàng ${line.label}: mục #${missingId + 1} phải có Serial Number hoặc MAC Address` }
      }
      // Kiểm tra trùng trong batch: theo serial_no (nếu có) và mac_address (nếu có)
      const sns  = serials.map((s) => s.serial_no).filter(Boolean) as string[]
      const macs = serials.map((s) => s.mac_address).filter(Boolean) as string[]
      if (new Set(sns).size !== sns.length) {
        throw { statusCode: 400, message: `Danh sách serial cho ${line.label} có Serial Number trùng nhau` }
      }
      if (new Set(macs).size !== macs.length) {
        throw { statusCode: 400, message: `Danh sách serial cho ${line.label} có MAC Address trùng nhau` }
      }
      if (importType === 'return_in') {
        // return_in chỉ khớp theo serial_no (MAC có thể thay đổi sau khi sửa thiết bị)
        if (sns.length > 0) {
          const soldRows = await this.db('serial_numbers')
            .whereIn('serial_no', sns).where({ status: 'sold' }).pluck('serial_no')
          const notSold = sns.filter((s) => !soldRows.includes(s))
          if (notSold.length > 0) {
            throw { statusCode: 400, message: `Serial không hợp lệ cho return_in (chưa bán hoặc không tồn tại): ${notSold.join(', ')}` }
          }
        }
      } else {
        if (sns.length > 0) {
          const existing = await this.db('serial_numbers').whereIn('serial_no', sns).pluck('serial_no')
          if (existing.length > 0) {
            throw { statusCode: 400, message: `Serial đã tồn tại trong hệ thống: ${existing.join(', ')}` }
          }
        }
        if (macs.length > 0) {
          const existingMac = await this.db('serial_numbers').whereIn('mac_address', macs).pluck('mac_address')
          if (existingMac.length > 0) {
            throw { statusCode: 400, message: `MAC Address đã tồn tại trong hệ thống: ${existingMac.join(', ')}` }
          }
        }
      }
    }
  }

  // Áp dụng "hoàn thành" cho MỘT dòng hàng — cập nhật inventory (upsert avg_cost), set
  // qty_remaining (lô mới), tạo serial_numbers (storable) và stock_movements audit. Dùng
  // chung cho complete() và create({complete:true}) — PHẢI chạy trong transaction của caller.
  private async applyLineCompletion(trx: Knex.Transaction, args: {
    receiptId: string
    warehouseId: string
    importType: string
    userId: string
    line: {
      id: string; variant_id: string; product_type: string; quantity: number; cost_price: number
      manufacturer_warranty_months?: number | null; manufacturer_warranty_start?: string | null
      customer_warranty_months?: number | null
    }
    serials: SerialInput[]
  }) {
    const { receiptId, warehouseId, importType, userId, line, serials } = args

    // Upsert inventory — công thức avg_cost đúng CLAUDE.md mục 16: avg_cost mới =
    // (tồn cũ*giá cũ + nhập mới*giá mới) / tổng tồn mới. Cast rõ ::int/::numeric — để 2
    // placeholder nhân nhau không cast, Postgres không suy được type ("operator is not unique").
    await trx.raw(
      `INSERT INTO inventory (variant_id, warehouse_id, qty_on_hand, avg_cost, last_updated)
       VALUES (:variant_id, :warehouse_id, :qty::int, :cost::numeric, now())
       ON CONFLICT (variant_id, warehouse_id) DO UPDATE SET
         qty_on_hand  = inventory.qty_on_hand + :qty::int,
         avg_cost     = (inventory.qty_on_hand * inventory.avg_cost + :qty::int * :cost::numeric)
                        / (inventory.qty_on_hand + :qty::int),
         last_updated = now()`,
      { variant_id: line.variant_id, warehouse_id: warehouseId, qty: line.quantity, cost: line.cost_price },
    )

    // receipt_line CHÍNH LÀ 1 lô nhập — set qty_remaining = quantity ngay lúc này (trước
    // đó NULL vì hàng chưa thật vào kho). Delivery FIFO sẽ trừ dần field này.
    await trx('receipt_lines').where({ id: line.id }).update({ qty_remaining: line.quantity })

    // storable → mỗi serial 1 dòng riêng trong serial_numbers, status active, warehouse_id
    // = kho vừa nhập, gắn receipt_line_id để khi xuất biết đúng lô cần trừ. Insert TRƯỚC
    // stock_movements để lấy id vừa sinh gắn vào đúng dòng movement tương ứng.
    let newSerialIds: string[] = []
    if (line.product_type === 'storable') {
      const serialNos = serials.map((s) => s.serial_no).filter(Boolean) as string[]
      if (importType === 'return_in') {
        // return_in: serial đang status='sold' → UPDATE về active tại kho này, gắn lại
        // receipt_line_id của lô nhập trả hàng này.
        const returnedRows = await trx('serial_numbers')
          .whereIn('serial_no', serialNos)
          .update({
            status:          'active',
            warehouse_id:    warehouseId,
            receipt_line_id: line.id,
            delivery_line_id: null,
            updated_at:      trx.fn.now(),
          })
          .returning('id')
        newSerialIds = returnedRows.map((s: { id: string }) => s.id)
        for (const s of serials) {
          if (s.mac_address || s.note) {
            await trx('serial_numbers').where({ serial_no: s.serial_no }).update({
              ...(s.mac_address !== undefined && { mac_address: s.mac_address || null }),
              ...(s.note !== undefined && { note: s.note || null }),
            })
          }
        }
      } else {
        // != null check (không dùng truthy) vì 0 là giá trị hợp lệ ("không bảo hành"
        // tường minh) — CLAUDE.md §19.
        const mfgWarrantyExpr =
          line.manufacturer_warranty_months != null
            ? trx.raw(
                "?::timestamptz + (?::int * interval '1 month')",
                [line.manufacturer_warranty_start ?? trx.raw('now()'), line.manufacturer_warranty_months],
              )
            : null
        const custWarrantyExpr =
          line.customer_warranty_months != null
            ? trx.raw("now() + (?::int * interval '1 month')", [line.customer_warranty_months])
            : null
        const insertedSerials = await trx('serial_numbers')
          .insert(
            serials.map((s) => ({
              serial_no:                 s.serial_no?.trim() || null,
              mac_address:               s.mac_address?.trim() || null,
              note:                      s.note || null,
              variant_id:                line.variant_id,
              warehouse_id:              warehouseId,
              status:                    'active',
              receipt_line_id:           line.id,
              manufacturer_warranty_end: mfgWarrantyExpr,
              customer_warranty_end:     custWarrantyExpr,
            })),
          )
          .returning('id')
        newSerialIds = insertedSerials.map((s) => s.id)
      }
    }

    // Audit trail — stock_movements không bao giờ update/xoá, chỉ insert thêm. storable →
    // 1 dòng RIÊNG cho từng serial (quantity=1); consumable → 1 dòng tổng (serial_id=null).
    if (newSerialIds.length > 0) {
      await trx('stock_movements').insert(
        newSerialIds.map((serialId) => ({
          variant_id:        line.variant_id,
          warehouse_id:      warehouseId,
          serial_id:         serialId,
          movement_type:     'in',
          quantity:          1,
          unit_cost:         line.cost_price,
          ref_document_type: 'receipt',
          ref_document_id:   receiptId,
          created_by:        userId,
        })),
      )
    } else {
      await trx('stock_movements').insert({
        variant_id:        line.variant_id,
        warehouse_id:      warehouseId,
        movement_type:     'in',
        quantity:          line.quantity,
        unit_cost:         line.cost_price,
        ref_document_type: 'receipt',
        ref_document_id:   receiptId,
        created_by:        userId,
      })
    }
  }

  // draft → completed. Đây là bước QUAN TRỌNG NHẤT — lúc này tồn kho thật sự thay đổi.
  // Trước khi Complete, hàng "chưa tồn tại" trong kho — chỉ là dữ liệu trên giấy.
  async complete(id: string, userId: string, body: CompleteReceiptBody = {}) {
    const receipt = await this.repo.findById(id)
    if (!receipt) throw { statusCode: 404, message: 'Receipt not found' }
    if (receipt.status !== 'draft') throw { statusCode: 400, message: 'Chỉ có thể hoàn thành từ Draft' }

    // Map line_id -> danh sách serial client gửi lên (chỉ cần cho dòng storable)
    const serialsByLine = new Map((body.lines ?? []).map((l) => [l.line_id, l.serials ?? []]))

    // Validate TRƯỚC khi mở transaction — fail nhanh, không mở transaction chỉ để rollback
    // ngay vì thiếu serial. Storable bắt buộc có ít nhất serial_no HOẶC mac_address.
    await this.validateSerialsBatch(
      receipt.lines.map((l: any) => ({ key: l.id, label: l.variant_name, product_type: l.product_type, quantity: l.quantity })),
      serialsByLine,
      receipt.import_type,
    )

    // TOÀN BỘ logic dưới đây nằm trong 1 transaction — nếu 1 trong N dòng cập nhật
    // inventory thất bại (ví dụ lỗi DB giữa đường), Postgres rollback hết, không để
    // tồn kho bị cập nhật "nửa chừng" (ví dụ 3/5 dòng hàng đã cộng kho, 2 dòng chưa).
    await this.db.transaction(async (trx) => {
      // Guard THẬT chống race condition: chỉ chuyển trạng thái nếu ĐÚNG LÚC NÀY (không
      // phải lúc đọc receipt ở trên — đã có thể stale) vẫn đang draft. Nếu 1 request
      // complete/cancel khác đã xử lý xong trước khi tới lượt transaction này, update
      // dưới đây khớp 0 dòng, completed = undefined → dừng ngay, không đụng vào inventory.
      const completed = await this.repo.updateStatus(
        id, 'draft', 'completed', { completed_at: trx.fn.now() }, trx,
      )
      if (!completed) {
        throw { statusCode: 400, message: 'Phiếu đã được xử lý bởi 1 yêu cầu khác — vui lòng tải lại' }
      }

      for (const line of receipt.lines) {
        await this.applyLineCompletion(trx, {
          receiptId: id, warehouseId: receipt.warehouse_id, importType: receipt.import_type, userId,
          line, serials: serialsByLine.get(line.id) ?? [],
        })
      }

      return completed
    }).catch((err: any) => {
      // Serial trùng nhau giữa 2 phiếu complete đồng thời → Postgres unique_violation (23505).
      // Bắt tại đây để trả 400 rõ ràng thay vì để lỗi DB thô tới client.
      if (err.code === '23505' && err.constraint?.includes('serial')) {
        throw { statusCode: 400, message: 'Một hoặc nhiều serial number đã tồn tại trong hệ thống (phiếu khác vừa nhập trùng)' }
      }
      throw err
    })
    const actorName = await resolveActorName(this.db, userId)
    await logActivity({ db: this.db, objectType: 'receipt', objectId: id, objectCode: receipt.code, action: 'completed', actorId: userId, actorName })
    try {
      await getNotificationService(this.db).notifyByPermission(
        this.db,
        'report.inventory',
        {
          type: 'receipt_completed',
          title: `Phiếu nhập kho ${receipt.code} đã hoàn thành`,
          body: 'Tồn kho đã được cập nhật.',
          link: `/receipts/${id}`,
        },
        userId,
      )
    } catch (_) { /* không chặn luồng chính */ }
    return this.repo.findById(id)
  }

  // Huỷ receipt — chỉ chặn huỷ khi ĐÃ completed (vì lúc đó tồn kho đã thay đổi thật,
  // huỷ ngược lại cần nghiệp vụ riêng, không đơn giản là update status) hoặc đã cancelled rồi.
  // Chỉ người tạo phiếu HOẶC người có quyền receipt.approve (Manager/Admin) mới được huỷ.
  async cancel(
    id: string,
    userId: string,
    body?: { reason?: string; attachments?: Array<{ url: string; originalName: string }> },
  ) {
    const receipt = await this.repo.findById(id)
    if (!receipt) throw { statusCode: 404, message: 'Receipt not found' }
    if (['completed', 'cancelled'].includes(receipt.status)) {
      throw { statusCode: 400, message: 'Không thể huỷ phiếu đã hoàn thành hoặc đã huỷ' }
    }

    if (receipt.created_by !== userId) {
      const canApprove = await userHasPermission(this.db, userId, 'receipt.approve')
      if (!canApprove) {
        throw { statusCode: 403, message: 'Chỉ người tạo phiếu hoặc người có quyền duyệt mới được huỷ' }
      }
    }

    await this.db.transaction(async (trx) => {
      // Atomic guard: nếu giữa lúc check status ở trên và lúc này, phiếu đã bị complete
      // bởi 1 request khác, whereIn không khớp 'completed' → update dưới đây trả undefined.
      const cancelled = await this.repo.updateStatus(
        id, ['draft'], 'cancelled', {
          cancel_reason:      body?.reason ?? null,
          cancel_attachments: body?.attachments?.length ? JSON.stringify(body.attachments) : null,
        }, trx,
      )
      if (!cancelled) {
        throw { statusCode: 400, message: 'Không thể huỷ phiếu đã hoàn thành hoặc đã huỷ' }
      }
    })

    const actorName = await resolveActorName(this.db, userId)
    await logActivity({ db: this.db, objectType: 'receipt', objectId: id, objectCode: receipt.code, action: 'cancelled', actorId: userId, actorName, payload: body?.reason ? { reason: body?.reason } : null })
    return this.repo.findById(id)
  }
}
