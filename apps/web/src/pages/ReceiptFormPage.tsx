import { Fragment, useState } from 'react'
import {
  Button as AntButton, Form, Input, DatePicker,
  Space, Modal, Table, Upload, message,
} from 'antd'
import { QrcodeOutlined, UploadOutlined, PaperClipOutlined } from '@ant-design/icons'
import type { UploadFile } from 'antd'
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react'
import { api } from '../lib/api'
import { useReceiptForm } from '../hooks/useReceiptForm'
import { StatusBadge } from '../components/ui/StatusBadge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { usePageHeader } from '@/layout/PageHeaderSlot'
import { SnScanGrid } from '../components/SnScanGrid'
import { BatchQRPrint } from '../components/BatchQRPrint'
import VariantSelect from '../components/VariantSelect'

// ── Shared display helpers ────────────────────────────────────────────────────

// Card "Thông tin phiếu" theo đúng pattern form shadcn/ui đã dùng ở WarehousesPage (label
// TRÊN input, input rounded-lg border-border-md có hover/focus ring) thay vì tự chế viền/kích
// thước AntD như trước — để đồng bộ với phần còn lại của app thay vì tự sáng tạo style riêng.
// Vẫn giữ antd `Form`/`Form.Item` để dùng chung state với `Form.List` (bảng dòng hàng) và
// validate rules; chỉ đổi CONTROL bên trong mỗi Form.Item sang component shadcn.
const FIELD_MAX_WIDTH = 420

// Field ngắn (enum/tên kho/ngày) không cần rộng bằng field chứa tên công ty/mã phiếu dài —
// 3 mức giống fieldTier đã dùng ở các trang khác (VariantDetailPage...), chỉ khác tên hằng vì
// scope riêng cho trang này (đang ở kiểu form khác — label trên, không phải grid nhiều cột).
const W_SHORT = 220   // Loại nhập, Ngày nhập kho, PO liên kết — giá trị enum/ngày/mã ngắn
const W_MEDIUM = 300  // Kho nhập — tên kho + mã, dài vừa
const W_WIDE = 640     // Phiếu nhận hàng, NCC, Phiếu xuất kho, Khách hàng — chứa tên công ty dài

// Adapter: Form.Item tự inject `value`/`onChange` kiểu antd (onChange(value) trực tiếp), còn
// Select shadcn (Radix) dùng `value`/`onValueChange` — cầu nối 2 convention này.
function ShadSelectField({
  value, onChange, placeholder, options, disabled, maxWidth = FIELD_MAX_WIDTH,
}: {
  value?: string
  onChange?: (v: string) => void
  placeholder?: string
  options?: { value: string; label: string }[]
  disabled?: boolean
  maxWidth?: number
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger size="sm" className="w-full text-base" style={{ maxWidth }}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options?.map((o) => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// Ô readonly (view mode) — nhìn giống input shadcn bị disabled: cùng bo góc/viền/chiều cao,
// chỉ khác nền hơi xám để phân biệt không sửa được, theo đúng token đã dùng ở theme.ts.
// h-8 (không phải h-9 mặc định của Input) — form này nhiều field/dòng liên tiếp, gọn hơn
// đọc dễ hơn so với size mặc định của Sheet 1 form đơn lẻ như WarehousesPage.
function BBox({ children, title, maxWidth = FIELD_MAX_WIDTH }: { children: React.ReactNode; title?: string; maxWidth?: number }) {
  return (
    <div
      title={title}
      className="flex h-8 w-full items-center overflow-hidden text-ellipsis whitespace-nowrap rounded-lg border border-border-md bg-muted/40 px-3 text-base text-foreground"
      style={{ maxWidth }}
    >
      {children}
    </div>
  )
}

const ph = <span style={{ color: 'var(--text-3, #bbb)' }}>—</span>

function fmt(n: any) {
  if (n == null) return '—'
  return Number(n).toLocaleString('en-US')
}

// Input số THUẦN tự viết (không dùng antd InputNumber) cho 4 cột số của bảng dòng hàng —
// theo yêu cầu: input/select AntD chỉ đáng dùng ở cột cần tính năng thật sự cần (SKU cần
// search/autocomplete, Từ ngày cần lịch chọn) — cột số đơn giản thì tự viết `<input>` nhẹ hơn
// nhiều so với việc liên tục đè CSS lên control AntD (bo góc, text-align, focus ring...).
// Tương thích Form.Item: nhận `value`/`onChange` theo đúng convention AntD tự inject.
function PlainNumberInput({
  value, onChange, onBlur, autoFocus, align, className, format,
}: {
  value?: number
  onChange?: (v: number | undefined) => void
  onBlur?: () => void
  autoFocus?: boolean
  align?: 'left' | 'center' | 'right'
  className?: string
  // Format="thousand" — thêm dấu phẩy ngăn cách hàng nghìn ngay khi gõ (giống moneyProps cũ
  // của antd InputNumber), dùng cho Giá nhập. Các field số khác (số lượng, số tháng) không
  // cần vì giá trị luôn nhỏ, không có ý nghĩa phân cách.
  format?: boolean
}) {
  // value có thể là string thập phân từ backend (Postgres NUMERIC serialize dạng "2500000.00")
  // chứ không chắc luôn là number — ép Number() trước khi format/hiển thị, nếu không
  // String.prototype.toLocaleString() sẽ trả nguyên "2500000.00" không đổi (không phải lỗi
  // hiển thị số, mà do gọi nhầm hàm của string thay vì number).
  const numValue = value != null ? Number(value) : undefined
  const display = numValue != null && !Number.isNaN(numValue) ? (format ? numValue.toLocaleString('en-US') : String(numValue)) : ''
  return (
    <input
      type="text"
      inputMode="numeric"
      autoFocus={autoFocus}
      value={display}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^0-9]/g, '')
        onChange?.(raw === '' ? undefined : Number(raw))
      }}
      onBlur={onBlur}
      className={className}
      style={{
        width: '100%', height: 32, border: 'none', outline: 'none', background: 'transparent',
        padding: '0 8px', fontSize: 14, textAlign: align ?? 'left',
        fontFamily: 'inherit', color: 'inherit',
      }}
    />
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ReceiptFormPage() {
  const [isDirty, setIsDirty] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelFiles, setCancelFiles] = useState<UploadFile[]>([])
  const [cancelLoading, setCancelLoading] = useState(false)
  const hook = useReceiptForm({ onUpdateSuccess: () => setIsDirty(false) })
  const { mode, receipt } = hook
  const importTypeValue = Form.useWatch('import_type', hook.form)

  const isCreate = mode === 'create'
  const isEdit = mode === 'edit'
  const isView = mode === 'view'

  // usePageHeader là hook — PHẢI gọi vô điều kiện trước early return bên dưới (xem CLAUDE.md
  // mục 22). Chỉ tối đa 2 nút cùng lúc (Complete/Huỷ phiếu, hoặc In nhãn QR) nên không cần
  // dropdown "···" như Quotation/PO — giữ hiện trực tiếp.
  usePageHeader(
    <div className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-2">
        <Button variant="ghost" size="icon-sm" onClick={() => hook.navigate('/receipts')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="flex min-w-0 items-baseline gap-2 truncate text-sm font-semibold tracking-tight">
          <button
            onClick={() => hook.navigate('/receipts')}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Phiếu nhập kho
          </button>
          <span className="text-muted-foreground">/</span>
          <span className="truncate text-foreground">{isCreate ? 'Tạo mới' : (receipt?.code ?? hook.id)}</span>
        </h1>
        {receipt?.status && <StatusBadge status={receipt.status} />}
      </div>

      <div className="flex flex-shrink-0 items-center gap-2">
        {isEdit && (
          <Button size="sm" variant="success" disabled={hook.completeMode} onClick={() => hook.setCompleteMode(true)}>
            Complete
          </Button>
        )}
        {!isCreate && !['completed', 'cancelled'].includes(receipt?.status ?? '') && (
          <Button size="sm" variant="danger" onClick={() => setCancelOpen(true)}>Huỷ phiếu</Button>
        )}
        {receipt?.status === 'completed' && (
          <Button size="sm" variant="outline" onClick={() => setQrOpen(true)}>
            <QrcodeOutlined style={{ marginRight: 6 }} />
            In nhãn QR
          </Button>
        )}
      </div>
    </div>,
  )

  if (!isCreate && hook.isLoading) return null

  async function handleCancel() {
    if (!cancelReason.trim()) {
      message.warning('Vui lòng nhập lý do hủy')
      return
    }
    setCancelLoading(true)
    try {
      // AntD Upload tự gọi lại onChange sau khi customRequest báo onSuccess, dùng fileList
      // do nó tự tính lại (chỉ giữ `response`, không giữ field `url` mình tự gắn thêm trong
      // customRequest) — field `url` gắn tay có thể bị ghi đè mất trước lúc submit. Đọc từ
      // `f.response.url` (payload thật của /uploads/file) mới đáng tin cậy.
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

  // ── Submit handler ──────────────────────────────────────────────────────

  function handleSubmit(v: any) {
    if (isCreate) {
      hook.createMutation.mutate(v)
    } else {
      hook.updateMutation.mutate(v)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '0 0 48px' }}>

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

      <Form
        form={hook.form}
        layout="vertical"
        initialValues={isCreate ? { import_type: hook.shipmentIdFromQuery ? 'purchase' : undefined, lines: [{}] } : undefined}
        onFinish={isView ? undefined : handleSubmit}
        onValuesChange={() => { if (!isCreate) setIsDirty(true) }}
      >

        {isCreate && hook.shipmentDetail && hook.shipmentFullyReceipted && (
          <div style={{
            marginBottom: 16, padding: '10px 16px', borderRadius: 8,
            background: 'var(--s-cancelled-bg)', color: 'var(--s-cancelled-color)', fontSize: 13,
          }}>
            ⚠️ Phiếu nhận hàng <strong>{hook.shipmentDetail.code}</strong> đã được nhập kho đủ số lượng.
            Không thể tạo thêm phiếu nhập kho từ phiếu này.
          </div>
        )}

        {isCreate && hook.shipmentDetail && !hook.shipmentFullyReceipted && (
          <div style={{
            marginBottom: 16, padding: '10px 16px', borderRadius: 8,
            background: 'var(--s-completed-bg)', color: 'var(--s-completed-color)', fontSize: 13,
          }}>
            Đang tạo từ Phiếu nhận hàng <strong>{hook.shipmentDetail.code}</strong> — dòng hàng đã điền theo số lượng thực nhận.
          </div>
        )}

        {/* ─── Thông tin phiếu ──────────────────────────────── */}
        {/* Layout kiểu HOÁ ĐƠN (invoice) — bỏ hẳn khung/box bao quanh từng phần (đã thử "card"
            nhiều vòng, người dùng vẫn thấy rối), thay bằng heading + 1 đường kẻ ngang phân
            cách section, giống Stripe/QuickBooks/Wave khi tạo hoá đơn: field xếp theo lưới
            ngang gọn, không có "hộp" nào bao ngoài. Field bên trong (Select/BBox/Textarea) giữ
            nguyên component đã tinh chỉnh — chỉ đổi phần KHUNG bao quanh. */}
        <style>{`
          .receipt-info-card .ant-form-item { margin-bottom: 0; }
          .receipt-info-card .ant-form-item-label { padding-bottom: 4px; }
          .receipt-info-card .ant-form-item-label > label {
            font-size: 14px !important;
            height: auto !important;
          }
          .receipt-info-card .ant-picker {
            border-radius: 8px !important;
            border-color: var(--border-md) !important;
            font-size: 14px !important;
          }
          .receipt-info-card .ant-picker-input > input { font-size: 14px !important; }
        `}</style>
        <div className="receipt-info-card" style={{ paddingBottom: 32, marginBottom: 32, borderBottom: '1px solid var(--border)' }}>
          <div className="mb-5 text-base font-semibold text-foreground">
            Thông tin phiếu
          </div>

          <div className="grid grid-cols-3 gap-x-8 gap-y-5">
            <Form.Item
              name="import_type" label="Loại nhập"
              rules={isCreate ? [{ required: true }] : undefined}
            >
              {isCreate ? (
                <ShadSelectField
                  disabled={!!hook.shipmentIdFromQuery}
                  options={hook.importTypes?.map((t: any) => ({ value: t.key, label: t.label }))}
                  placeholder="Chọn loại nhập"
                  onChange={(v) => { if (v !== 'purchase') hook.setShipmentId(undefined) }}
                  maxWidth={W_SHORT}
                />
              ) : (
                <BBox maxWidth={W_SHORT}>{receipt?.import_type ?? ph}</BBox>
              )}
            </Form.Item>

            <Form.Item name="warehouse_id" label="Kho nhập" rules={isCreate ? [{ required: true }] : undefined}>
              {isCreate ? (
                <ShadSelectField
                  options={hook.warehouses?.map((w: any) => ({ value: w.id, label: `${w.name} (${w.code})` }))}
                  placeholder="Chọn kho nhập"
                  maxWidth={W_MEDIUM}
                />
              ) : (
                <BBox maxWidth={W_MEDIUM}>{receipt?.warehouse_name ?? ph}</BBox>
              )}
            </Form.Item>

            <Form.Item name="received_date" label="Ngày nhập kho">
              {isView ? (
                <BBox maxWidth={W_SHORT}>{receipt?.received_date ? new Date(receipt.received_date).toLocaleDateString('vi-VN') : ph}</BBox>
              ) : (
                <DatePicker format="DD/MM/YYYY" style={{ width: '100%', maxWidth: W_SHORT }} placeholder="Ngày hàng về kho" />
              )}
            </Form.Item>

            {/* Chọn Phiếu nhận hàng (bắt buộc khi Loại nhập = "purchase") + NCC đọc ra từ đó
                (nếu Shipment có gắn PO). Có thể tới từ query (bấm "Tạo phiếu nhập kho" trên
                trang Shipment, lúc đó khoá lại) hoặc tự chọn tay ở đây. Chiếm trọn hàng (col-
                span-3) vì chứa tên phiếu/công ty dài, không hợp nhồi vào 1/3 cột như field ngắn. */}
            {isCreate && importTypeValue === 'purchase' && (
              <>
                <Form.Item label="Phiếu nhận hàng" required className="col-span-3">
                  <ShadSelectField
                    disabled={!!hook.shipmentIdFromQuery}
                    value={hook.shipmentId}
                    placeholder="Chọn Phiếu nhận hàng đã xác nhận nhận hàng"
                    options={hook.receivedShipments?.data?.map((s: any) => ({
                      value: s.id,
                      label: [s.code, s.supplier_name].filter(Boolean).join(' — '),
                    }))}
                    onChange={(v) => hook.setShipmentId(v)}
                    maxWidth={W_WIDE}
                  />
                </Form.Item>
                {hook.poDetail && (
                  <Form.Item label="NCC" className="col-span-3">
                    <BBox title={hook.poDetail?.company_name ?? ''} maxWidth={W_WIDE}>
                      {hook.poDetail?.company_name
                        ? <span>{hook.poDetail.company_name}</span>
                        : <span style={{ color: 'var(--text-3, #bbb)' }}>—</span>}
                    </BBox>
                  </Form.Item>
                )}
              </>
            )}
            {/* Chọn Phiếu xuất kho (khi Loại nhập = "return_in") */}
            {isCreate && importTypeValue === 'return_in' && (
              <>
                <Form.Item label="Phiếu xuất kho (khách hàng trả lại)" required className="col-span-3">
                  <ShadSelectField
                    value={hook.returnDoId}
                    placeholder="Chọn Phiếu xuất kho đã hoàn thành"
                    options={hook.completedDOs?.data?.map((d: any) => ({
                      value: d.id,
                      label: [d.code, d.company_name].filter(Boolean).join(' — '),
                    }))}
                    onChange={(v) => hook.setReturnDoId(v)}
                    maxWidth={W_WIDE}
                  />
                </Form.Item>
                {hook.returnDoDetail && (
                  <Form.Item label="Khách hàng" className="col-span-3">
                    <BBox title={hook.returnDoDetail?.company_name ?? ''} maxWidth={W_WIDE}>
                      {hook.returnDoDetail?.company_name
                        ? <span>{hook.returnDoDetail.company_name}</span>
                        : ph}
                    </BBox>
                  </Form.Item>
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
              <Form.Item label="PO liên kết">
                <BBox maxWidth={W_SHORT}>{receipt.po_code}</BBox>
              </Form.Item>
            )}

            <Form.Item name="note" label="Ghi chú" className="col-span-3">
              {isView ? (
                <div
                  className="min-h-8 whitespace-pre-wrap rounded-lg border border-border-md bg-muted/40 px-3 py-1.5 text-base text-foreground"
                  style={{ color: receipt?.note ? undefined : 'var(--text-3, #bbb)' }}
                >
                  {receipt?.note || '—'}
                </div>
              ) : (
                <Textarea
                  rows={2}
                  placeholder="Ghi chú (tuỳ chọn)"
                  className="min-h-0 py-1.5 text-base"
                  style={{ maxWidth: FIELD_MAX_WIDTH * 2 }}
                />
              )}
            </Form.Item>
          </div>
        </div>

        {/* ─── Danh sách sản phẩm ──────────────────────────── */}
        {/* Bảng kiểu HOÁ ĐƠN (invoice line items) — đã thử qua nhiều style (Excel-grid viền
            đen, click-to-edit...) đều bị chê rối. Chuyển hẳn sang pattern thật của QuickBooks/
            Xero/Wave: KHÔNG có viền dọc giữa các cột, chỉ 1 đường kẻ đậm dưới header + 1 đường
            mảnh dưới mỗi dòng — input/select trong suốt, hoà vào dòng thay vì "ô" riêng. Có
            thêm cột "Thành tiền" (SL × Giá) và dòng tổng cộng cuối bảng, đúng cấu trúc 1 hoá
            đơn/phiếu thật. */}
        <style>{`
          .receipt-lines-card table { border-collapse: collapse; width: 100%; table-layout: fixed; }
          .receipt-lines-card thead th {
            border-bottom: 2px solid var(--text-1);
            padding-bottom: 8px;
          }
          .receipt-lines-card tbody > tr > td {
            border-bottom: 1px solid var(--border);
            padding: 10px 8px;
          }
          .receipt-lines-card td > div { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          /* SKU (Select) và Từ ngày (DatePicker) là control AntD duy nhất còn lại — bỏ hết
             viền/nền riêng để hoà vào dòng, đúng tinh thần input "trong suốt" của hoá đơn. */
          .receipt-lines-card .ant-select-selector,
          .receipt-lines-card .ant-picker {
            border: none !important;
            background: transparent !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            padding-left: 0 !important;
          }
        `}</style>
        <div className="receipt-lines-card" style={{ paddingBottom: 32, marginBottom: 32, borderBottom: '1px solid var(--border)' }}>
          <div className="mb-5 text-base font-semibold text-foreground">
            Danh sách sản phẩm
          </div>

          {isView ? (
            <ViewLinesTable
              lines={receipt?.lines ?? []}
              onViewSN={(line) => hook.setSerialsFor({ line_id: line.id, label: line.variant_name })}
            />
          ) : isEdit ? (
            <EditLinesTable hook={hook} />
          ) : (
            <CreateLinesTable hook={hook} />
          )}
        </div>

        {/* ─── Card 3: Nhập Serial Number ───────────────────────────── */}
        {hook.completeMode && (
          <div style={{
            background: 'var(--bg-card)', border: '2px solid var(--s-completed-color)',
            borderRadius: 8, padding: '20px 24px', marginBottom: 16,
          }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>
              Nhập Serial Number
            </div>

            {(receipt?.lines ?? []).filter((l: any) => l.product_type === 'storable').map((l: any) => (
              <div key={l.id} style={{ marginBottom: 24 }}>
                <p style={{ fontWeight: 600, marginBottom: 8 }}>
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
              <p style={{ color: 'var(--text-2)' }}>Không có dòng Thiết bị — bấm xác nhận để Complete.</p>
            )}

            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <AntButton onClick={() => hook.setCompleteMode(false)}>Huỷ</AntButton>
              <AntButton
                type="primary"
                onClick={hook.submitComplete}
                loading={hook.completeMutation.isPending}
                style={{ background: 'var(--s-completed-color)', borderColor: 'var(--s-completed-color)' }}
              >
                Xác nhận Complete
              </AntButton>
            </div>
          </div>
        )}

        {/* ─── Lý do hủy — chỉ hiện khi phiếu đã bị hủy ──────────────── */}
        {receipt?.status === 'cancelled' && (receipt?.cancel_reason || receipt?.cancel_attachments?.length > 0) && (
          <div style={{
            background: 'var(--s-cancelled-bg)', border: '1px solid var(--s-cancelled-color)',
            borderRadius: 8, padding: '20px 24px', marginBottom: 16,
          }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, color: 'var(--s-cancelled-color)' }}>
              Lý do hủy
            </div>
            {receipt.cancel_reason && (
              <div style={{ color: 'var(--text-1)', whiteSpace: 'pre-wrap', marginBottom: receipt.cancel_attachments?.length ? 12 : 0 }}>
                {receipt.cancel_reason}
              </div>
            )}
            {receipt.cancel_attachments?.length > 0 && (
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>Đính kèm:</div>
                <Space wrap>
                  {receipt.cancel_attachments.map((f: any, i: number) => (
                    <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                      <PaperClipOutlined /> {f.originalName}
                    </a>
                  ))}
                </Space>
              </div>
            )}
          </div>
        )}

        {/* ─── Bottom actions ───────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <AntButton onClick={() => hook.navigate('/receipts')}>Quay lại</AntButton>

          {!isView && (
            <AntButton
              type="primary"
              htmlType="submit"
              disabled={(isEdit && !isDirty) || (isCreate && hook.shipmentFullyReceipted)}
              loading={hook.createMutation.isPending || hook.updateMutation.isPending}
            >
              {isCreate ? 'Tạo phiếu nhập' : isDirty ? 'Lưu thay đổi' : 'Sửa'}
            </AntButton>
          )}
        </div>
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

// Nhãn nhỏ cho field trong panel mở rộng (bảo hành) — label TRÊN input, giống pattern shadcn
// đã dùng ở Card 1, chỉ nhỏ hơn 1 chút vì đây là field phụ chứ không phải field chính của dòng.
function ExpandField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

function CreateLinesTable({ hook }: { hook: ReturnType<typeof useReceiptForm> }) {
  // Khi tạo từ PO hoặc từ Shipment → variant đã xác định, hiện text thuần (không cho sửa)
  const isVariantLocked = !!(hook.poId || hook.shipmentId)
  // Dòng hàng có 6 field — nhồi hết vào 1 hàng bảng luôn bị chật/cắt chữ dù chỉnh CSS thế nào
  // (đã thử nhiều cách). Theo pattern "summary row + expandable detail" (Xero/QuickBooks dùng
  // cho dòng hoá đơn): hàng chính chỉ hiện 3 field hay dùng nhất để quét mắt theo cột (SKU, Số
  // lượng, Giá nhập) — 3 field bảo hành (ít khi cần xem lại) gộp vào panel mở rộng bên dưới,
  // hiện dạng form label-trên-input rộng rãi, không giới hạn bởi độ rộng cột bảng nữa.
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const th: React.CSSProperties = {
    padding: '6px 8px', textAlign: 'center', fontSize: 14, fontWeight: 600,
    color: 'var(--text-1)', background: '#fff', whiteSpace: 'nowrap',
  }

  return (
    <Form.List name="lines">
      {(fields, { add, remove }) => (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <colgroup>
                <col />
                <col style={{ width: 130 }} />
                <col style={{ width: 160 }} />
                <col style={{ width: 100 }} />
                <col style={{ width: 70 }} />
              </colgroup>
              <thead>
                <tr>
                  <th style={th}>SKU / Tên sản phẩm</th>
                  <th style={th}>Số lượng</th>
                  <th style={th}>Giá nhập</th>
                  <th style={th}>Bảo hành</th>
                  <th style={th} />
                </tr>
              </thead>
              <tbody>
                {fields.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-3, #bbb)', padding: '20px 0' }}>
                      Chưa có dòng hàng
                    </td>
                  </tr>
                )}
                {fields.map((f) => {
                  const key = String(f.key)
                  const isOpen = expanded.has(key)
                  return (
                    <Fragment key={f.key}>
                      <tr>
                        <td>
                          {isVariantLocked ? (
                            <Form.Item name={[f.name, 'variant_label']} noStyle>
                              <PlainValueField />
                            </Form.Item>
                          ) : (
                            <Form.Item name={[f.name, 'variant_id']} noStyle rules={[{ required: true, message: 'Chọn SKU' }]}>
                              <VariantSelect style={{ width: '100%' }} />
                            </Form.Item>
                          )}
                          {isVariantLocked && <Form.Item name={[f.name, 'variant_id']} hidden><Input /></Form.Item>}
                          <Form.Item name={[f.name, 'po_line_id']} hidden><Input /></Form.Item>
                        </td>

                        <td>
                          <Form.Item name={[f.name, 'quantity']} noStyle rules={[{ required: true }]}>
                            <PlainNumberInput align="center" />
                          </Form.Item>
                        </td>

                        <td>
                          <Form.Item name={[f.name, 'cost_price']} noStyle rules={[{ required: true }]}>
                            <PlainNumberInput align="right" format />
                          </Form.Item>
                        </td>

                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => toggle(key)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                            title="Thông tin bảo hành"
                          >
                            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                        </td>

                        <td style={{ textAlign: 'center' }}>
                          <AntButton size="small" danger onClick={() => remove(f.name)}>Xóa</AntButton>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr>
                          <td colSpan={5} style={{ background: 'var(--bg-subtle, #fafafa)', padding: '14px 16px' }}>
                            <div className="grid max-w-2xl grid-cols-3 gap-4">
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
            </table>
          </div>
          {!isVariantLocked && (
            <AntButton style={{ marginTop: 8 }} onClick={() => add({ quantity: 1 })}>
              + Thêm dòng
            </AntButton>
          )}
        </>
      )}
    </Form.List>
  )
}

// AntD Form.Item tự inject prop `value` vào child duy nhất — dùng để hiện text thuần cho field
// chỉ đọc (VD variant_label khi SKU đã khoá theo PO/Shipment) mà không cần input/border gì cả.
function PlainValueField({ value }: { value?: string }) {
  return (
    <div style={{ height: 32, display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: 14 }}>
      {value}
    </div>
  )
}

function EditLinesTable({ hook }: { hook: ReturnType<typeof useReceiptForm> }) {
  // Cùng pattern "summary row + expandable detail" như CreateLinesTable — xem comment ở đó.
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const th: React.CSSProperties = {
    padding: '6px 8px', textAlign: 'center', fontSize: 14, fontWeight: 600,
    color: 'var(--text-1)', background: '#fff', whiteSpace: 'nowrap',
  }

  return (
    <Form.List name="lines">
      {(fields) => (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <colgroup>
              <col />
              <col style={{ width: 70 }} />
              <col style={{ width: 150 }} />
              <col style={{ width: 100 }} />
            </colgroup>
            <thead>
              <tr>
                <th style={th}>Mã hàng</th>
                <th style={th}>SL</th>
                <th style={th}>Giá nhập</th>
                <th style={th}>Bảo hành</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((f) => {
                const key = String(f.key)
                const isOpen = expanded.has(key)
                const receiptLine = hook.receipt?.lines?.[f.name]
                return (
                  <Fragment key={f.key}>
                    <tr>
                      <td>
                        <div style={{ height: 32, display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: 13, whiteSpace: 'nowrap' }}>
                          {receiptLine?.item_code} — {receiptLine?.variant_name}
                        </div>
                        <Form.Item name={[f.name, 'id']} hidden><Input /></Form.Item>
                      </td>
                      <td>
                        <div style={{ height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8px', fontSize: 14 }}>
                          {receiptLine?.quantity}
                        </div>
                      </td>
                      <td>
                        <Form.Item name={[f.name, 'cost_price']} noStyle rules={[{ required: true }]}>
                          <PlainNumberInput align="right" format />
                        </Form.Item>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => toggle(key)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                          title="Thông tin bảo hành"
                        >
                          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={4} style={{ background: 'var(--bg-subtle, #fafafa)', padding: '14px 16px' }}>
                          <div className="grid max-w-2xl grid-cols-3 gap-4">
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
  // Cùng pattern "summary row + expandable detail" như Create/EditLinesTable — hàng chính chỉ
  // hiện SKU/SL/Giá nhập, các field ít cần xem lại (BH hãng/BH cty/Từ ngày/Còn lại lô) gộp vào
  // panel mở rộng. "Xem SN" giữ lại ở hàng chính vì đó là hành động chính hay dùng, không phải
  // thông tin phụ.
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const thStyle: React.CSSProperties = {
    padding: '6px 8px', textAlign: 'center', fontSize: 14,
    fontWeight: 600, color: 'var(--text-1)',
    background: '#fff', whiteSpace: 'nowrap',
  }
  const tdStyle: React.CSSProperties = {
    padding: '4px 8px', fontSize: 14, whiteSpace: 'nowrap',
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table>
        <colgroup>
          <col />
          <col style={{ width: 90 }} />
          <col style={{ width: 130 }} />
          <col style={{ width: 100 }} />
          <col style={{ width: 90 }} />
        </colgroup>
        <thead>
          <tr>
            <th style={thStyle}>SKU / Tên sản phẩm</th>
            <th style={thStyle}>SL</th>
            <th style={thStyle}>Giá nhập</th>
            <th style={thStyle}>Bảo hành</th>
            <th style={thStyle} />
          </tr>
        </thead>
        <tbody>
          {lines.length === 0 && (
            <tr>
              <td colSpan={5} style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-3, #bbb)', padding: '20px 0' }}>
                Không có sản phẩm
              </td>
            </tr>
          )}
          {lines.map((l, i) => {
            const key = String(l.id ?? i)
            const isOpen = expanded.has(key)
            return (
              <Fragment key={key}>
                <tr>
                  <td style={tdStyle}>{l.item_code ?? '—'} — {l.variant_name ?? '—'}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{fmt(l.quantity)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(l.cost_price)}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => toggle(key)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                      title="Thông tin bảo hành"
                    >
                      {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    {l.product_type === 'storable' && (
                      <AntButton size="small" onClick={() => onViewSN(l)}>Xem SN</AntButton>
                    )}
                  </td>
                </tr>
                {isOpen && (
                  <tr>
                    <td colSpan={5} style={{ background: 'var(--bg-subtle, #fafafa)', padding: '14px 16px' }}>
                      <div className="grid max-w-2xl grid-cols-4 gap-4">
                        <ExpandField label="BH hãng (tháng)">
                          <div className="flex h-8 items-center text-base text-foreground">
                            {l.manufacturer_warranty_months != null ? String(l.manufacturer_warranty_months) : '—'}
                          </div>
                        </ExpandField>
                        <ExpandField label="Từ ngày">
                          <div className="flex h-8 items-center text-base text-foreground">
                            {l.manufacturer_warranty_start ? new Date(l.manufacturer_warranty_start).toLocaleDateString('vi-VN') : '—'}
                          </div>
                        </ExpandField>
                        <ExpandField label="BH cty (tháng)">
                          <div className="flex h-8 items-center text-base text-foreground">
                            {l.customer_warranty_months != null ? String(l.customer_warranty_months) : '—'}
                          </div>
                        </ExpandField>
                        <ExpandField label="Còn lại (lô)">
                          <div className="flex h-8 items-center text-base text-foreground">
                            {l.qty_remaining != null ? fmt(l.qty_remaining) : '—'}
                          </div>
                        </ExpandField>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
