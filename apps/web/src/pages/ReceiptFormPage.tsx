import { Fragment, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Button as AntButton, Form, Input, DatePicker,
  Modal, Table, Upload, message,
} from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import type { UploadFile } from 'antd'
import { ArrowLeft, QrCode, Paperclip, ChevronDown, ChevronUp, Barcode, CheckCircle2, AlertTriangle, X } from 'lucide-react'
import { api } from '../lib/api'
import { useReceiptForm } from '../hooks/useReceiptForm'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { SnScanGrid, type SnRow } from '../components/SnScanGrid'
import { BatchQRPrint } from '../components/BatchQRPrint'
import VariantSelect, { type VariantData } from '../components/VariantSelect'
import { LineItemsTable, type LineItemsColumn } from '../components/LineItemsTable'
import { PlainNumberInput } from '../components/PlainNumberInput'

// Port .kv-head/.kv-form-grid/.kv-table nguyên bản (đồng bộ với ProductDetailPage — "chi tiết
// SKU") thay cho SectionCard + shadcn Select/Textarea/Button trước đây. Vẫn giữ AntD `Form`/
// `Form.List` để dùng chung state + validate rules với bảng dòng hàng — Form.Item vẫn nhận
// value/onChange bình thường khi child là <select>/<input> thường (không cần Radix Select nữa).
//
// Chế độ TẠO MỚI (isCreate) áp theo export/import-new.html — khác biệt lớn nhất so với bản cũ:
// nhập Serial NGAY lúc tạo (nút "x/n serial" mở drawer per dòng) thay vì tách riêng bước
// Complete sau. "Lưu nháp" vẫn tạo Draft như cũ (không cần serial); "Tạo phiếu nhập" tạo VÀ
// hoàn thành trong 1 lần gọi API (complete:true — xem receipt.service.ts::create()), khoá lại
// nếu còn thiếu serial ở dòng storable nào. Chế độ Sửa/Xem (edit/view — receipt đã tồn tại)
// GIỮ NGUYÊN luồng Complete tách riêng cũ, không đổi.
const FIELD_MAX_WIDTH = 480

// Adapter: Form.Item tự inject `value`/`onChange`. Với <select>/<input> thường, browser tự
// bắn onChange(event) và Form.Item tự đọc e.target.value — không cần adapter riêng nữa (khác
// hẳn shadcn Select/Radix trước đây cần onValueChange).
// Luôn wrap xuống dòng (không cắt 1 dòng + title tooltip) — field CHỈ ĐỌC, không phải input
// cần giữ chiều cao cố định.
function BBox({ children, title, maxWidth = FIELD_MAX_WIDTH }: { children: React.ReactNode; title?: string; maxWidth?: number }) {
  return (
    <div
      title={title}
      className="kv-input"
      style={{
        display: 'flex', alignItems: 'flex-start', overflow: 'visible',
        whiteSpace: 'pre-wrap', wordBreak: 'break-word', height: 'auto', minHeight: 30, padding: '5px 9px',
        background: 'var(--bg-card)', color: 'var(--text-1)', maxWidth,
      }}
    >
      {children}
    </div>
  )
}

// Segmented control (mockup .kv-seg) cho "Loại nhập" — Form.Item clone + compose onChange
// giống hệt <select> thường, chỉ cần component tự gọi đúng prop `onChange` nó nhận được.
function ImportTypeSeg({
  value, onChange, options, disabled,
}: {
  value?: string
  onChange?: (v: string) => void
  options?: { key: string; label: string }[]
  disabled?: boolean
}) {
  return (
    <div className="kv-seg" role="radiogroup" aria-label="Loại nhập">
      {options?.map((o) => (
        <button
          key={o.key} type="button" aria-current={value === o.key}
          disabled={disabled} onClick={() => onChange?.(o.key)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

const ph = <span style={{ color: 'var(--text-3)' }}>—</span>

function fmt(n: any) {
  if (n == null) return '—'
  return Number(n).toLocaleString('en-US')
}


// Tồn hiện tại (tất cả kho) của 1 SKU — cột riêng theo mockup, giúp người nhập thấy ngay
// hàng còn/hết trước khi gõ số lượng.
function StockQtyCell({ variantId }: { variantId?: string }) {
  const { data } = useQuery({
    queryKey: ['inventory', 'by-variant', 'qty', variantId],
    queryFn: async () => (await api.get('/inventory/by-variant', { params: { variant_id: variantId, limit: 1 } })).data,
    enabled: !!variantId,
    staleTime: 30_000,
  })
  if (!variantId) return <span className="kv-muted">—</span>
  return <span className="kv-muted">{data?.data?.[0]?.qty_on_hand ?? 0}</span>
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ReceiptFormPage() {
  const [isDirty, setIsDirty] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelFiles, setCancelFiles] = useState<UploadFile[]>([])
  const [cancelLoading, setCancelLoading] = useState(false)
  // product_type từng dòng (key = index trong Form.List) — quyết định dòng có cần Serial hay
  // không. Nâng lên component cha vì cả bảng dòng hàng LẪN thanh footer (đếm thiếu serial)
  // đều cần đọc. Set khi: (1) tự thêm dòng qua ô "Quét mã" (VariantData trả về product_type),
  // (2) dòng tới từ PO/Shipment (effect bên dưới, cùng filter với hook điền lines tương ứng).
  const [productTypes, setProductTypes] = useState<Record<number, string>>({})
  const hook = useReceiptForm({ onUpdateSuccess: () => setIsDirty(false) })
  const { mode, receipt } = hook
  const importTypeValue = Form.useWatch('import_type', hook.form)
  const linesWatch = Form.useWatch('lines', hook.form) as any[] | undefined

  const isCreate = mode === 'create'
  const isEdit = mode === 'edit'
  const isView = mode === 'view'

  // Dòng tới từ Shipment/PO không qua ô "Quét mã" nên productTypes không tự có — đọc lại
  // product_type từ chính response đó, ÁP ĐÚNG CÙNG FILTER với effect điền `lines` trong hook:
  // shipment: condition !== 'missing' RỒI loại tiếp dòng có po_line_id đã nhận đủ ở Receipt khác
  // (hook cũng lọc dòng này ra khỏi `lines` khi cả shipmentDetail LẪN poDetail cùng có, xem
  // useReceiptForm.ts); PO thuần (không qua Shipment): remaining_qty > 0. Thiếu bước lọc này ở
  // đây sẽ làm productTypes lệch index so với `lines` thật trong form sau khi hook loại dòng —
  // dòng kế tiếp bị gán nhầm product_type (bug thật đã gặp).
  //
  // Cố ý dùng `received_qty >= quantity` cho nhánh Shipment (KHÔNG dùng remaining_qty) — xem
  // giải thích chi tiết ở effect tương ứng trong useReceiptForm.ts: remaining_qty đã trừ luôn
  // shipment_qty của CHÍNH shipment đang tạo receipt này nên luôn ra 0 kể cả với dòng hợp lệ.
  // Nhánh PO thuần vẫn dùng remaining_qty vì không có vấn đề tự-trừ này (chưa gắn shipment nào).
  useEffect(() => {
    if (!isCreate) return
    const poLineMap = hook.poDetail ? new Map<string, any>(hook.poDetail.lines.map((l: any) => [l.id, l])) : null
    const source = hook.shipmentDetail
      ? (hook.shipmentDetail.lines ?? [])
        .filter((l: any) => l.condition !== 'missing')
        .filter((l: any) => {
          if (!l.po_line_id || !poLineMap) return true
          const poLine = poLineMap.get(l.po_line_id)
          return !poLine || poLine.received_qty < poLine.quantity
        })
      : hook.poDetail
        ? (hook.poDetail.lines ?? []).filter((l: any) => l.remaining_qty > 0)
        : null
    if (!source) return
    const map: Record<number, string> = {}
    source.forEach((l: any, i: number) => { if (l.product_type) map[i] = l.product_type })
    setProductTypes(map)
  }, [hook.shipmentDetail, hook.poDetail, isCreate])

  // Bất kỳ thay đổi nào ở các "nguồn điền dòng hàng" (chọn/bỏ chọn Phiếu nhận hàng, PO, Phiếu
  // xuất trả hàng) đều khiến hook ghi đè lại toàn bộ mảng `lines` trong form (setFieldsValue) —
  // productTypes/createSerialsRows (state riêng, key theo INDEX) phải reset theo, nếu không dữ
  // liệu serial/loại sản phẩm của dòng cũ sẽ "dính" nhầm sang dòng mới ở cùng vị trí sau khi
  // đổi nguồn (bug thật: gặp khi đổi Loại nhập rồi chọn 1 Phiếu nhận hàng khác).
  useEffect(() => {
    if (!isCreate) return
    setProductTypes({})
    hook.setCreateSerialsRows({})
  }, [hook.shipmentId, hook.poId, hook.returnDoId, isCreate])

  if (!isCreate && hook.isLoading) return null

  async function handleCancel() {
    if (!cancelReason.trim()) {
      message.warning('Vui lòng nhập lý do hủy')
      return
    }
    setCancelLoading(true)
    try {
      // AntD Upload tự gọi lại onChange sau khi customRequest báo onSuccess, dùng fileList
      // do nó tự tính lại — đọc từ f.response.url (payload thật của /uploads/file) mới đáng tin.
      const uploaded = cancelFiles
        .filter((f) => f.url || f.response?.url)
        .map((f) => ({ url: (f.url ?? f.response?.url) as string, originalName: f.name }))
      await hook.cancelMutation.mutateAsync({ reason: cancelReason.trim(), attachments: uploaded })
      setCancelOpen(false)
      setCancelReason('')
      setCancelFiles([])
    } finally {
      setCancelLoading(false)
    }
  }

  // isCreate không còn dùng đường này (2 nút "Lưu nháp"/"Tạo phiếu nhập" tự validateFields()
  // + mutate() riêng, xem footer bar) — onFinish giờ chỉ phục vụ nút Sửa/Lưu ở edit/view.
  function handleSubmit(v: any) {
    hook.updateMutation.mutate(v)
  }

  // ── Footer stats (isCreate) ─────────────────────────────────────────────
  const lineCount = (linesWatch ?? []).filter((l) => l?.variant_id).length
  const totalQty = (linesWatch ?? []).reduce((s, l) => s + (Number(l?.quantity) || 0), 0)
  const totalAmount = (linesWatch ?? []).reduce((s, l) => s + (Number(l?.quantity) || 0) * (Number(l?.cost_price) || 0), 0)
  const missingSerialLine = (linesWatch ?? []).findIndex((l, i) => {
    if (productTypes[i] !== 'storable') return false
    const required = Number(l?.quantity) || 0
    const filled = (hook.createSerialsRows[i] ?? []).filter((r) => r.serial_no.trim() || r.mac_address.trim()).length
    return filled !== required
  })
  const hasMissingSerial = missingSerialLine >= 0

  return (
    <div className="theme-2a -m-6 mx-auto flex w-full max-w-[1200px] flex-col gap-4 bg-background p-6">

      {receipt?.status === 'completed' && (
        <BatchQRPrint
          open={qrOpen}
          onClose={() => setQrOpen(false)}
          receiptCode={receipt.code}
          completedAt={receipt.completed_at ?? null}
          warehouseName={receipt.warehouse_name}
          lines={receipt.lines ?? []}
        />
      )}

      {/* Header — port .kv-head.kv-head--divided/.kv-crumb/.kv-title--sm nguyên bản, đồng bộ
          ProductDetailPage thay vì usePageHeader (Detail/Form page không đẩy lên topbar). */}
      <div className="kv-head kv-head--divided">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button type="button" className="kv-btn kv-btn--ghost" onClick={() => hook.navigate(-1)} style={{ padding: 0, width: 30, flexShrink: 0 }} aria-label="Quay lại">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="kv-crumb">
              <button onClick={() => hook.navigate('/receipts')} style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer' }}>
                Phiếu nhập kho
              </button>
              {' / '}{isCreate ? 'Tạo mới' : (receipt?.code ?? hook.id)}
            </div>
            <h1 className="kv-title kv-title--sm" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="mono">{isCreate ? 'Tạo phiếu nhập' : receipt?.code}</span>
              {receipt?.status && <StatusBadge status={receipt.status} />}
            </h1>
          </div>
        </div>
        <div className="kv-actions">
          {isEdit && (
            <button type="button" className="kv-btn kv-btn--primary" disabled={hook.completeMode} onClick={() => hook.setCompleteMode(true)}>
              Complete
            </button>
          )}
          {!isCreate && !['completed', 'cancelled'].includes(receipt?.status ?? '') && (
            <button type="button" className="kv-btn kv-btn--danger" onClick={() => setCancelOpen(true)}>Huỷ phiếu</button>
          )}
          {receipt?.status === 'completed' && (
            <button type="button" className="kv-btn" onClick={() => setQrOpen(true)}>
              <QrCode className="h-3.5 w-3.5" /> In nhãn QR
            </button>
          )}
        </div>
      </div>

      <Form
        form={hook.form}
        layout="vertical"
        initialValues={isCreate ? { import_type: hook.shipmentIdFromQuery ? 'purchase' : undefined, lines: [] } : undefined}
        onFinish={isView ? undefined : handleSubmit}
        onValuesChange={() => { if (!isCreate) setIsDirty(true) }}
        className="flex flex-col gap-4"
      >

        {isCreate && hook.shipmentDetail && hook.shipmentFullyReceipted && (
          <div style={{ padding: '10px 16px', borderRadius: 6, background: 'var(--s-cancelled-bg)', color: 'var(--s-cancelled-color)', fontSize: 13 }}>
            Phiếu nhận hàng <strong>{hook.shipmentDetail.code}</strong> đã được nhập kho đủ số lượng.
            Không thể tạo thêm phiếu nhập kho từ phiếu này.
          </div>
        )}

        {isCreate && hook.shipmentDetail && !hook.shipmentFullyReceipted && (
          <div style={{ padding: '10px 16px', borderRadius: 6, background: 'var(--s-completed-bg)', color: 'var(--s-completed-color)', fontSize: 13 }}>
            Đang tạo từ Phiếu nhận hàng <strong>{hook.shipmentDetail.code}</strong> — dòng hàng đã điền theo số lượng thực nhận.
          </div>
        )}

        {/* ─── Nguồn hàng / Nhập vào — port .kv-form-grid/.kv-group-label/.kv-field nguyên bản,
            2 nhóm riêng theo đúng bố cục import-new.html (khác 1 nhóm "Thông tin phiếu" gộp
            chung trước đây). ─── */}
        <div className="kv-form-grid">
          <div className="kv-group-label">Nguồn hàng</div>
          <div className="kv-group-body kv-stack" style={{ maxWidth: 640 }}>
            <div className="kv-field">
              <label>Loại nhập {isCreate && <span className="kv-req">*</span>}</label>
              <Form.Item name="import_type" noStyle rules={isCreate ? [{ required: true }] : undefined}>
                {isCreate ? (
                  <ImportTypeSeg
                    disabled={!!hook.shipmentIdFromQuery}
                    options={hook.importTypes?.map((t: any) => ({ key: t.key, label: t.label }))}
                    onChange={(v) => { if (v !== 'purchase') hook.setShipmentId(undefined) }}
                  />
                ) : (
                  <BBox maxWidth={220}>{receipt?.import_type ?? ph}</BBox>
                )}
              </Form.Item>
              {isCreate && <div className="kv-hint">Loại nhập quyết định trường bên dưới: NCC, khách hàng hoặc kho nguồn.</div>}
            </div>

            {/* Chọn Phiếu nhận hàng (bắt buộc khi Loại nhập = "purchase") + NCC đọc ra từ đó */}
            {isCreate && importTypeValue === 'purchase' && (
              <>
                <div className="kv-field">
                  <label>Phiếu nhận hàng <span className="kv-req">*</span></label>
                  <select
                    className="kv-select"
                    disabled={!!hook.shipmentIdFromQuery}
                    value={hook.shipmentId ?? ''}
                    onChange={(e) => hook.setShipmentId(e.target.value || undefined)}
                  >
                    <option value="">Chọn Phiếu nhận hàng đã xác nhận nhận hàng</option>
                    {hook.receivedShipments?.data?.map((s: any) => (
                      <option key={s.id} value={s.id}>{[s.code, s.supplier_name].filter(Boolean).join(' — ')}</option>
                    ))}
                  </select>
                </div>
                {hook.poDetail && (
                  <div className="kv-field">
                    <label>NCC</label>
                    <BBox title={hook.poDetail?.company_name ?? ''}>{hook.poDetail?.company_name ?? ph}</BBox>
                  </div>
                )}
              </>
            )}
            {/* Chọn Phiếu xuất kho (khi Loại nhập = "return_in") */}
            {isCreate && importTypeValue === 'return_in' && (
              <>
                <div className="kv-field">
                  <label>Phiếu xuất kho (khách hàng trả lại) <span className="kv-req">*</span></label>
                  <select
                    className="kv-select"
                    value={hook.returnDoId ?? ''}
                    onChange={(e) => hook.setReturnDoId(e.target.value || undefined)}
                  >
                    <option value="">Chọn Phiếu xuất kho đã hoàn thành</option>
                    {hook.completedDOs?.data?.map((d: any) => (
                      <option key={d.id} value={d.id}>{[d.code, d.company_name].filter(Boolean).join(' — ')}</option>
                    ))}
                  </select>
                </div>
                {hook.returnDoDetail && (
                  <div className="kv-field">
                    <label>Khách hàng</label>
                    <BBox title={hook.returnDoDetail?.company_name ?? ''}>{hook.returnDoDetail?.company_name ?? ph}</BBox>
                  </div>
                )}
              </>
            )}

            {isCreate && (
              <>
                <Form.Item name="po_id" hidden><Input /></Form.Item>
                <Form.Item name="company_id" hidden><Input /></Form.Item>
                <Form.Item name="shipment_id" hidden><Input /></Form.Item>
                <Form.Item name="ref_document_type" hidden><Input /></Form.Item>
                <Form.Item name="ref_document_id" hidden><Input /></Form.Item>
              </>
            )}
            {!isCreate && receipt?.po_code && (
              <div className="kv-field" style={{ maxWidth: 220 }}>
                <label>PO liên kết</label>
                <BBox maxWidth={220}>{receipt.po_code}</BBox>
              </div>
            )}
          </div>

          <div className="kv-group-label">Nhập vào</div>
          <div className="kv-group-body kv-stack" style={{ maxWidth: 640 }}>
            <div className="kv-2col">
              <div className="kv-field">
                <label>Kho nhập {isCreate && <span className="kv-req">*</span>}</label>
                <Form.Item name="warehouse_id" noStyle rules={isCreate ? [{ required: true }] : undefined}>
                  {isCreate ? (
                    <select className="kv-select">
                      <option value="">Chọn kho nhập</option>
                      {hook.warehouses?.map((w: any) => <option key={w.id} value={w.id}>{w.name} ({w.code})</option>)}
                    </select>
                  ) : (
                    <BBox>{receipt?.warehouse_name ?? ph}</BBox>
                  )}
                </Form.Item>
              </div>
              <div className="kv-field">
                <label>Ngày nhập kho</label>
                <Form.Item name="received_date" noStyle>
                  {isView ? (
                    <BBox>{receipt?.received_date ? new Date(receipt.received_date).toLocaleDateString('vi-VN') : ph}</BBox>
                  ) : (
                    <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} placeholder="Ngày hàng về kho" />
                  )}
                </Form.Item>
              </div>
            </div>

            <div className="kv-field">
              <label>Ghi chú</label>
              <Form.Item name="note" noStyle>
                {isView ? (
                  <BBox>{receipt?.note ?? ph}</BBox>
                ) : (
                  <textarea className="kv-input" rows={2} style={{ resize: 'vertical', minHeight: 36 }} placeholder="Ghi chú (tuỳ chọn)" />
                )}
              </Form.Item>
            </div>
          </div>
        </div>

        {/* ─── Danh sách sản phẩm — port .kv-table/.kv-section-head nguyên bản ─── */}
        <div className="kv-section-head">
          <div>
            <div className="kv-eyebrow">Dòng hàng</div>
            <h2 className="kv-section-title">Hàng nhập{isCreate ? ` · ${lineCount} dòng` : ''}</h2>
          </div>
        </div>
        {isView ? (
          <ViewLinesTable
            lines={receipt?.lines ?? []}
            onViewSN={(line) => hook.setSerialsFor({ line_id: line.id, label: line.variant_name })}
          />
        ) : isEdit ? (
          <EditLinesTable hook={hook} />
        ) : (
          <CreateLinesTable hook={hook} productTypes={productTypes} setProductTypes={setProductTypes} />
        )}

        {/* Drawer nhập serial cho 1 dòng (isCreate) — port .kv-drawer nguyên bản (Sheet) */}
        {isCreate && hook.serialDrawerLine != null && (
          <SerialDrawer
            lineIndex={hook.serialDrawerLine}
            label={linesWatch?.[hook.serialDrawerLine]?.variant_label ?? '—'}
            quantity={Number(linesWatch?.[hook.serialDrawerLine]?.quantity) || 0}
            rows={hook.createSerialsRows[hook.serialDrawerLine] ?? []}
            onChange={(rows) => hook.setCreateSerialsRows((prev) => ({ ...prev, [hook.serialDrawerLine as number]: rows }))}
            onClose={() => hook.setSerialDrawerLine(null)}
          />
        )}

        {/* ─── Nhập Serial Number (Complete) — chế độ Sửa, receipt đã tồn tại ───────────── */}
        {hook.completeMode && (
          <div style={{ border: '1px solid var(--s-completed-color)', borderRadius: 6, padding: '16px 20px' }}>
            <h2 className="kv-section-title" style={{ marginBottom: 14 }}>Nhập Serial Number</h2>

            {(receipt?.lines ?? []).filter((l: any) => l.product_type === 'storable').map((l: any) => (
              <div key={l.id} style={{ marginBottom: 24 }}>
                <p style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>
                  {l.item_code} — {l.variant_name}
                  <span style={{ fontWeight: 400, color: 'var(--text-2)', marginLeft: 8 }}>
                    (cần {l.quantity} SN)
                  </span>
                </p>
                <SnScanGrid
                  quantity={l.quantity}
                  rows={hook.serialsRows[l.id] ?? []}
                  onChange={(rows) => hook.setSerialsRows((prev) => ({ ...prev, [l.id]: rows }))}
                />
              </div>
            ))}

            {(receipt?.lines ?? []).every((l: any) => l.product_type !== 'storable') && (
              <p style={{ color: 'var(--text-2)', fontSize: 13 }}>Không có dòng Thiết bị — bấm xác nhận để Complete.</p>
            )}

            <div className="kv-actions" style={{ marginTop: 4 }}>
              <button type="button" className="kv-btn" onClick={() => hook.setCompleteMode(false)}>Huỷ</button>
              <button
                type="button"
                className="kv-btn kv-btn--primary"
                onClick={hook.submitComplete}
                disabled={hook.completeMutation.isPending}
              >
                {hook.completeMutation.isPending ? 'Đang xử lý…' : 'Xác nhận Complete'}
              </button>
            </div>
          </div>
        )}

        {/* ─── Lý do hủy — chỉ hiện khi phiếu đã bị hủy ──────────────── */}
        {receipt?.status === 'cancelled' && (receipt?.cancel_reason || receipt?.cancel_attachments?.length > 0) && (
          <div style={{ background: 'var(--s-cancelled-bg)', border: '1px solid var(--s-cancelled-color)', borderRadius: 6, padding: '16px 20px' }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: 'var(--s-cancelled-color)' }}>
              Lý do hủy
            </div>
            {receipt.cancel_reason && (
              <div style={{ color: 'var(--text-1)', whiteSpace: 'pre-wrap', marginBottom: receipt.cancel_attachments?.length ? 12 : 0, fontSize: 13 }}>
                {receipt.cancel_reason}
              </div>
            )}
            {receipt.cancel_attachments?.length > 0 && (
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>Đính kèm:</div>
                <div className="flex flex-wrap gap-3">
                  {receipt.cancel_attachments.map((f: any, i: number) => (
                    <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm" style={{ color: 'var(--accent-text)' }}>
                      <Paperclip className="h-3.5 w-3.5" /> {f.originalName}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Bottom actions — isCreate dùng thanh sticky đáy (.kv-footer-bar) theo mockup,
            edit/view giữ thanh hành động đơn giản như trước ───────────────────────────── */}
        {isCreate ? (
          <div className="kv-footer-bar">
            <div className="kv-footer-stat"><div className="kv-fact-label">Số dòng</div><div className="kv-fact-value">{lineCount}</div></div>
            <div className="kv-footer-stat"><div className="kv-fact-label">Tổng số lượng</div><div className="kv-fact-value">{totalQty}</div></div>
            <div className="kv-footer-stat"><div className="kv-fact-label">Tổng tiền</div><div className="kv-fact-value">{fmt(totalAmount)} ₫</div></div>
            {hasMissingSerial && (
              <span className="kv-footer-warn"><AlertTriangle />Còn thiếu serial ở dòng {missingSerialLine + 1}</span>
            )}
            <div className="kv-spacer" />
            <div className="kv-actions">
              <button type="button" className="kv-btn" onClick={() => hook.navigate('/receipts')}>Huỷ</button>
              <button
                type="button"
                className="kv-btn"
                disabled={hook.createMutation.isPending}
                onClick={() => hook.form.validateFields().then((v) => hook.createMutation.mutate(v))}
              >
                Lưu nháp
              </button>
              <button
                type="button"
                className="kv-btn kv-btn--primary"
                disabled={hasMissingSerial || lineCount === 0 || hook.shipmentFullyReceipted || hook.createMutation.isPending}
                title={hasMissingSerial ? 'Nhập đủ serial trước khi tạo phiếu' : undefined}
                onClick={() => hook.form.validateFields().then((v) => hook.createMutation.mutate({ ...v, __complete: true }))}
              >
                {hook.createMutation.isPending ? 'Đang lưu…' : 'Tạo phiếu nhập'}
              </button>
            </div>
          </div>
        ) : (
          <div className="kv-actions" style={{ paddingTop: 8 }}>
            <button type="button" className="kv-btn" onClick={() => hook.navigate('/receipts')}>Quay lại</button>
            {!isView && (
              <button
                type="submit"
                className="kv-btn kv-btn--primary"
                disabled={!isDirty || hook.updateMutation.isPending}
              >
                {hook.updateMutation.isPending ? 'Đang lưu…' : isDirty ? 'Lưu thay đổi' : 'Sửa'}
              </button>
            )}
          </div>
        )}
      </Form>

      {/* ─── SN View Modal ────────────────────────────────────────────── */}
      <Modal
        title={`Serial Number — ${hook.serialsFor?.label ?? ''}`}
        open={!!hook.serialsFor}
        onCancel={() => hook.setSerialsFor(null)}
        footer={null}
        width={700}
      >
        <Table
          rowKey="id"
          loading={hook.serialsLoading}
          dataSource={hook.serials}
          pagination={false}
          size="small"
          columns={[
            { title: 'Serial No', dataIndex: 'serial_no' },
            { title: 'Trạng thái', dataIndex: 'status' },
            { title: 'Kho hiện tại', dataIndex: 'warehouse_name' },
            { title: 'MAC', dataIndex: 'mac_address' },
            {
              title: 'Hết BH hãng',
              dataIndex: 'manufacturer_warranty_end',
              render: (d: string | null) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—'),
            },
          ]}
        />
      </Modal>

      {/* ─── Cancel Modal ────────────────────────────────────────────── */}
      <Modal
        title="Hủy phiếu nhập kho"
        open={cancelOpen}
        onCancel={() => { setCancelOpen(false); setCancelReason(''); setCancelFiles([]) }}
        onOk={handleCancel}
        okText="Xác nhận hủy"
        okButtonProps={{ danger: true, loading: cancelLoading }}
        cancelText="Đóng"
        width={520}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
          <div>
            <div style={{ fontWeight: 500, marginBottom: 6 }}>
              Lý do hủy <span style={{ color: 'var(--s-cancelled-color)' }}>*</span>
            </div>
            <Input.TextArea
              rows={4}
              placeholder="Nhập lý do hủy phiếu..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>
          <div>
            <div style={{ fontWeight: 500, marginBottom: 6 }}>Đính kèm chứng từ (tuỳ chọn)</div>
            <Upload
              fileList={cancelFiles}
              accept="image/*,.pdf"
              multiple
              customRequest={async ({ file, onSuccess, onError }) => {
                try {
                  const form = new FormData()
                  form.append('file', file as File)
                  const res = await api.post('/uploads/file', form, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                  })
                  setCancelFiles((prev) =>
                    prev.map((f) =>
                      f.uid === (file as any).uid
                        ? { ...f, url: res.data.url, status: 'done' }
                        : f,
                    ),
                  )
                  onSuccess?.(res.data)
                } catch (err: any) {
                  onError?.(err)
                }
              }}
              onChange={({ fileList }) => setCancelFiles(fileList)}
              listType="text"
            >
              <AntButton icon={<UploadOutlined />}>Chọn file (ảnh / PDF, tối đa 20 MB)</AntButton>
            </Upload>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

// Nhãn nhỏ cho field trong panel mở rộng (bảo hành, dùng ở Edit/View) — cùng chuẩn kv-field label.
function ExpandField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="kv-field">
      <label>{label}</label>
      {children}
    </div>
  )
}

// Drawer nhập serial cho 1 dòng lúc tạo phiếu — port .kv-drawer-head/-body/-foot + .kv-progress
// nguyên bản (export/import-new.html), dựng trên shadcn Sheet thay vì <aside> tĩnh của mockup.
function SerialDrawer({
  lineIndex, label, quantity, rows, onChange, onClose,
}: {
  lineIndex: number
  label: string
  quantity: number
  rows: SnRow[]
  onChange: (rows: SnRow[]) => void
  onClose: () => void
}) {
  const filled = rows.filter((r) => r.serial_no.trim() || r.mac_address.trim()).length
  const pct = quantity > 0 ? Math.min(100, Math.round((filled / quantity) * 100)) : 0
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="theme-2a w-[480px] flex flex-col gap-0" showCloseButton={false}>
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <div>
            <div className="kv-eyebrow">Dòng {lineIndex + 1} · Serial</div>
            <h2 className="kv-section-title" style={{ marginTop: 4, fontSize: 15 }}>{label}</h2>
          </div>
          <button type="button" className="kv-icon-btn" onClick={onClose} aria-label="Đóng">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div className="kv-actions" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
              <span className="kv-strong">{filled} / {quantity} serial</span>
              {quantity - filled > 0 && <span className="kv-muted" style={{ fontSize: 12 }}>còn {quantity - filled}</span>}
            </div>
            <div className="kv-progress"><span style={{ width: `${pct}%` }} /></div>
          </div>
          <SnScanGrid quantity={quantity} rows={rows} onChange={onChange} />
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-5 py-4">
          <button type="button" className="kv-btn kv-btn--primary" onClick={onClose}>Xong</button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function CreateLinesTable({ hook, productTypes, setProductTypes }: {
  hook: ReturnType<typeof useReceiptForm>
  productTypes: Record<number, string>
  setProductTypes: React.Dispatch<React.SetStateAction<Record<number, string>>>
}) {
  // Khi tạo từ PO hoặc từ Shipment → variant đã xác định, hiện text thuần (không cho sửa),
  // không có ô "Quét mã" thêm dòng (dòng đã điền sẵn từ PO/Shipment).
  const isVariantLocked = !!(hook.poId || hook.shipmentId)
  const linesWatch = Form.useWatch('lines', hook.form) as any[] | undefined
  const [scanKey, setScanKey] = useState(0)

  const grandTotal = (linesWatch ?? []).reduce((sum, l) => sum + (Number(l?.quantity) || 0) * (Number(l?.cost_price) || 0), 0)

  return (
    <Form.List name="lines">
      {(fields, { add, remove }) => {
        // Xoá 1 dòng phải re-index luôn productTypes/createSerialsRows (key theo index) —
        // không thì dòng phía sau bị lệch dữ liệu serial/loại sản phẩm của dòng đứng trước nó.
        function handleRemove(name: number) {
          remove(name)
          const reindex = <T,>(prev: Record<number, T>): Record<number, T> => {
            const next: Record<number, T> = {}
            Object.entries(prev).forEach(([k, v]) => {
              const i = Number(k)
              if (i < name) next[i] = v
              else if (i > name) next[i - 1] = v
            })
            return next
          }
          setProductTypes(reindex)
          hook.setCreateSerialsRows(reindex)
        }

        function handleScanAdd(variant: VariantData) {
          const current: any[] = hook.form.getFieldValue('lines') ?? []
          const idx = current.findIndex((l) => l?.variant_id === variant.id)
          if (idx >= 0) {
            const next = [...current]
            next[idx] = { ...next[idx], quantity: (Number(next[idx].quantity) || 0) + 1 }
            hook.form.setFieldsValue({ lines: next })
          } else {
            const newIndex = current.length
            add({
              variant_id: variant.id,
              variant_label: `${variant.item_code ?? variant.sku} — ${variant.name ?? ''}`,
              quantity: 1,
              cost_price: variant.cost_price ?? undefined,
              manufacturer_warranty_months: variant.manufacturer_warranty_months ?? undefined,
            })
            setProductTypes((prev) => ({ ...prev, [newIndex]: variant.product_type }))
          }
          setScanKey((k) => k + 1)
        }

        return (
          <>
          <div className="overflow-x-auto">
          <table className="kv-table kv-lines" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: 30 }} />
              <col />
              <col style={{ width: 90 }} />
              <col style={{ width: 90 }} />
              <col style={{ width: 130 }} />
              <col style={{ width: 130 }} />
              <col style={{ width: 150 }} />
              <col style={{ width: 36 }} />
            </colgroup>
            <thead>
              <tr>
                <th></th>
                <th className="text-left">Sản phẩm</th>
                <th className="num">Tồn hiện tại</th>
                <th className="num">Số lượng</th>
                <th className="num">Giá nhập</th>
                <th className="num">Thành tiền</th>
                <th className="text-left">Serial</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {fields.length === 0 && (
                <tr><td colSpan={8} className="kv-muted" style={{ textAlign: 'center', padding: '20px 0' }}>Chưa có dòng hàng</td></tr>
              )}
              {fields.map((f) => {
                const line = linesWatch?.[f.name] ?? {}
                const lineTotal = (Number(line.quantity) || 0) * (Number(line.cost_price) || 0)
                const productType = productTypes[f.name]
                const required = Number(line.quantity) || 0
                const filled = (hook.createSerialsRows[f.name] ?? []).filter((r) => r.serial_no.trim() || r.mac_address.trim()).length
                const done = required > 0 && filled >= required
                return (
                  <tr key={f.key} className="kv-line-hover">
                    <td className="kv-line-no">{f.name + 1}</td>
                    <td>
                      {isVariantLocked ? (
                        <Form.Item name={[f.name, 'variant_label']} noStyle>
                          <PlainValueField />
                        </Form.Item>
                      ) : (
                        <Form.Item name={[f.name, 'variant_id']} noStyle rules={[{ required: true, message: 'Chọn SKU' }]}>
                          <VariantSelect style={{ width: '100%' }} onSelectVariant={(v) => v && setProductTypes((prev) => ({ ...prev, [f.name]: v.product_type }))} />
                        </Form.Item>
                      )}
                      {isVariantLocked && <Form.Item name={[f.name, 'variant_id']} hidden><Input /></Form.Item>}
                      <Form.Item name={[f.name, 'po_line_id']} hidden><Input /></Form.Item>
                      <Form.Item name={[f.name, 'manufacturer_warranty_months']} hidden><Input /></Form.Item>
                      <Form.Item name={[f.name, 'manufacturer_warranty_start']} hidden><Input /></Form.Item>
                      <Form.Item name={[f.name, 'customer_warranty_months']} hidden><Input /></Form.Item>
                    </td>

                    <td className="num"><StockQtyCell variantId={line.variant_id} /></td>

                    <td>
                      <Form.Item name={[f.name, 'quantity']} noStyle rules={[{ required: true }]}>
                        <PlainNumberInput align="right" />
                      </Form.Item>
                    </td>

                    <td>
                      <Form.Item name={[f.name, 'cost_price']} noStyle rules={[{ required: true }]}>
                        <PlainNumberInput align="right" format />
                      </Form.Item>
                    </td>

                    <td className="num kv-cell-title">{lineTotal > 0 ? fmt(lineTotal) : '—'}</td>

                    <td>
                      {productType === 'storable' ? (
                        <button
                          type="button"
                          className={`kv-serial-btn ${done ? 'kv-serial-btn--done' : 'kv-serial-btn--missing'}`}
                          onClick={() => hook.setSerialDrawerLine(f.name)}
                        >
                          {done ? <CheckCircle2 /> : <Barcode />}
                          {filled} / {required || 0} serial
                        </button>
                      ) : (
                        <span className="kv-na">Không theo serial</span>
                      )}
                    </td>

                    <td className="text-center">
                      <button type="button" className="kv-icon-btn kv-row-del" aria-label={`Xoá dòng ${f.name + 1}`} onClick={() => handleRemove(f.name)}>
                        <X className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {fields.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={4} className="num kv-strong">Tổng cộng</td>
                  <td></td>
                  <td className="num kv-strong" style={{ fontSize: 15 }}>{fmt(grandTotal)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
            {!isVariantLocked && (
              <tfoot>
                <tr className="kv-addline">
                  <td></td>
                  <td colSpan={7}>
                    <div className="kv-actions">
                      <Barcode className="h-4 w-4" style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                      <VariantSelect
                        key={scanKey}
                        style={{ width: 380 }}
                        placeholder="Quét mã vạch hoặc gõ mã / tên hàng để thêm dòng…"
                        onSelectVariant={(v) => v && handleScanAdd(v)}
                      />
                      <span className="kv-kbd">Enter</span>
                      <span className="kv-muted" style={{ fontSize: 12 }}>Quét trùng SKU sẽ cộng dồn số lượng</span>
                    </div>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
          </div>
          </>
        )
      }}
    </Form.List>
  )
}

// AntD Form.Item tự inject prop `value` vào child duy nhất — hiện text thuần cho field chỉ đọc
// (VD variant_label khi SKU đã khoá theo PO/Shipment) mà không cần input/border gì cả.
function PlainValueField({ value }: { value?: string }) {
  return <div style={{ height: 32, display: 'flex', alignItems: 'center', fontSize: 13 }}>{value}</div>
}

function EditLinesTable({ hook }: { hook: ReturnType<typeof useReceiptForm> }) {
  // Cùng pattern "summary row + expandable detail" như trước — trang Sửa (receipt đã tồn tại)
  // giữ nguyên luồng cũ, không đổi theo mockup import-new.html (mockup chỉ áp cho lúc Tạo mới).
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const linesWatch = Form.useWatch('lines', hook.form) as any[] | undefined
  const grandTotal = (hook.receipt?.lines ?? []).reduce((sum: number, l: any, i: number) => {
    const cost = Number(linesWatch?.[i]?.cost_price ?? l.cost_price) || 0
    return sum + (Number(l.quantity) || 0) * cost
  }, 0)

  return (
    <Form.List name="lines">
      {(fields) => (
        <div className="overflow-x-auto">
        <table className="kv-table" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col />
            <col style={{ width: 70 }} />
            <col style={{ width: 150 }} />
            <col style={{ width: 150 }} />
            <col style={{ width: 100 }} />
          </colgroup>
          <thead>
            <tr>
              <th className="text-left">Sản phẩm</th>
              <th className="num">SL</th>
              <th className="num">Giá nhập</th>
              <th className="num">Thành tiền</th>
              <th className="text-center">Bảo hành</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((f) => {
              const key = String(f.key)
              const isOpen = expanded.has(key)
              const receiptLine = hook.receipt?.lines?.[f.name]
              const costPrice = linesWatch?.[f.name]?.cost_price
              const lineTotal = (Number(receiptLine?.quantity) || 0) * (Number(costPrice ?? receiptLine?.cost_price) || 0)
              return (
                <Fragment key={f.key}>
                  <tr>
                    <td className="truncate" title={`${receiptLine?.item_code ?? ''} — ${receiptLine?.variant_name ?? ''}`}>
                      {receiptLine?.item_code} — {receiptLine?.variant_name}
                      <Form.Item name={[f.name, 'id']} hidden><Input /></Form.Item>
                    </td>
                    <td className="num">{receiptLine?.quantity}</td>
                    <td>
                      <Form.Item name={[f.name, 'cost_price']} noStyle rules={[{ required: true }]}>
                        <PlainNumberInput align="right" format />
                      </Form.Item>
                    </td>
                    <td className="num kv-cell-title">{lineTotal > 0 ? fmt(lineTotal) : '—'}</td>
                    <td className="text-center">
                      <button type="button" className="kv-btn kv-btn--ghost kv-btn--sm" onClick={() => toggle(key)}>
                        {isOpen ? 'Ẩn' : 'Chi tiết'}
                        {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={5} style={{ background: 'var(--bg-subtle)' }}>
                        <div className="kv-2col" style={{ maxWidth: 480, padding: '10px 0' }}>
                          <ExpandField label="BH hãng (tháng)">
                            <Form.Item name={[f.name, 'manufacturer_warranty_months']} noStyle>
                              <PlainNumberInput />
                            </Form.Item>
                          </ExpandField>
                          <ExpandField label="Từ ngày">
                            <Form.Item name={[f.name, 'manufacturer_warranty_start']} noStyle>
                              <DatePicker allowClear style={{ width: '100%' }} />
                            </Form.Item>
                          </ExpandField>
                          <ExpandField label="BH cty (tháng)">
                            <Form.Item name={[f.name, 'customer_warranty_months']} noStyle>
                              <PlainNumberInput />
                            </Form.Item>
                          </ExpandField>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
          {fields.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={3} className="num kv-strong">Tổng cộng</td>
                <td className="num kv-strong" style={{ fontSize: 15 }}>{fmt(grandTotal)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
        </div>
      )}
    </Form.List>
  )
}

function ViewLinesTable({
  lines,
  onViewSN,
}: {
  lines: any[]
  onViewSN: (line: any) => void
}) {
  const grandTotal = lines.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.cost_price) || 0), 0)

  const cols: LineItemsColumn<any>[] = [
    { key: 'variant', label: 'Sản phẩm', width: 300, render: (l) => (
      <span className="truncate" title={`${l.item_code ?? ''} — ${l.variant_name ?? ''}`}>{l.item_code ?? '—'} — {l.variant_name ?? '—'}</span>
    ) },
    { key: 'qty', label: 'SL', align: 'right', width: 70, render: (l) => fmt(l.quantity) },
    { key: 'price', label: 'Giá nhập', align: 'right', width: 120, render: (l) => fmt(l.cost_price) },
    { key: 'total', label: 'Thành tiền', align: 'right', width: 120, render: (l) => <span className="kv-cell-title">{fmt((Number(l.quantity) || 0) * (Number(l.cost_price) || 0))}</span> },
    { key: 'mfg_wty', label: 'BH hãng', align: 'right', width: 90, render: (l) => l.manufacturer_warranty_months != null ? `${l.manufacturer_warranty_months} tháng` : '—' },
    { key: 'mfg_start', label: 'Từ ngày', width: 100, render: (l) => l.manufacturer_warranty_start ? new Date(l.manufacturer_warranty_start).toLocaleDateString('vi-VN') : '—' },
    { key: 'cust_wty', label: 'BH công ty', align: 'right', width: 100, render: (l) => l.customer_warranty_months != null ? `${l.customer_warranty_months} tháng` : '—' },
    { key: 'remaining', label: 'Còn lại (lô)', align: 'right', width: 100, render: (l) => l.qty_remaining != null ? fmt(l.qty_remaining) : '—' },
    { key: 'sn', label: '', width: 90, render: (l) => (
      <div className="text-center">
        {l.product_type === 'storable' && (
          <button type="button" className="kv-btn kv-btn--sm" onClick={() => onViewSN(l)}>Xem SN</button>
        )}
      </div>
    ) },
  ]

  return (
    <LineItemsTable
      cols={cols}
      rows={lines}
      rowKey={(l, i) => l.id ?? i}
      fixedLayout
      maxWidth={1190}
      emptyMessage="Không có sản phẩm"
      footer={
        <tfoot>
          <tr>
            <td colSpan={3} className="num kv-strong">Tổng cộng</td>
            <td className="num kv-strong" style={{ fontSize: 15 }}>{fmt(grandTotal)}</td>
            <td colSpan={5} />
          </tr>
        </tfoot>
      }
    />
  )
}
