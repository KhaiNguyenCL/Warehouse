import { useState } from 'react'
import { Form } from 'antd'
import { toast } from 'sonner'
import { ArrowLeft, Trash2, Loader2, CheckCircle2, Barcode } from 'lucide-react'
import { usePurchaseOrderForm } from '../hooks/usePurchaseOrderForm'
import POLineItem from '../components/POLineItem'
import VariantSelect, { type VariantData } from '../components/VariantSelect'
import { LineItemsTable, type LineItemsColumn } from '../components/LineItemsTable'
import { StatusBadge } from '@/components/ui/StatusBadge'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

// Port export/purchase-new.html (mockup mới nhất, 29/9) — khối "Thông tin phiếu" đổi hẳn sang
// hiển thị chữ (dl 3 cột), không còn field-box viền cho dữ liệu chỉ-đọc từ Bitrix nữa; bảng
// dòng hàng bỏ cột BH hãng/BH công ty (lấy ngầm theo SKU), VAT dropdown cố định, Ghi chú/custom
// field gộp vào popover (xem POLineItem.tsx), thêm dòng bằng ô quét mã cuối bảng thay nút
// "+ Thêm dòng", tổng tiền nằm ngay trong bảng, thanh hành động cuối trang dùng .kv-footer-bar
// (class đã có sẵn, dùng chung với ReceiptFormPage). Chế độ Xem (mode==='view') giữ nguyên
// LineItemsTable đã đồng bộ ở các bước trước — mockup lần này chỉ vẽ chế độ Tạo/Sửa.
function fmt(n: any) {
  if (n == null) return '—'
  return Number(n).toLocaleString('en-US')
}

function Empty() {
  return <span className="kv-empty">Chưa có trên deal</span>
}

// Đăng ký field vào Form mà không render input thật — dùng cho field chỉ-đọc có thể mang giá
// trị không phải string (VD start_date/end_date là đối tượng dayjs) mà AntD Form.Item vẫn cần
// 1 component để clone/inject value/onChange vào (antd Input sẽ cảnh báo/lỗi nếu value không
// phải string). Xem comment ở nơi gọi để biết vì sao cần đăng ký field không hiện UI này.
function HiddenField(_props: { value?: any; onChange?: any }) {
  return null
}

export default function PurchaseOrderCreatePage() {
  const [isDirty, setIsDirty] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [scanKey, setScanKey] = useState(0)
  const hook = usePurchaseOrderForm({ onUpdateSuccess: () => setIsDirty(false) })
  const { mode, po, form } = hook
  const isView = mode === 'view'
  const isCreate = mode === 'create'

  const contactOptions = hook.companyDetail?.contacts?.map((c: any) => ({ value: c.id, label: c.full_name }))

  // Watch để dl + footer-bar cập nhật tức thời theo form (edit/create) — chế độ view đọc thẳng
  // từ `po` (dữ liệu đã lưu), không cần watch.
  const dealTitle    = Form.useWatch('deal_title', form)
  const dealUrl      = Form.useWatch('bitrix_deal_url', form)
  const contractNo   = Form.useWatch('contract_number', form)
  const region       = Form.useWatch('region', form)
  const address      = Form.useWatch('delivery_location', form)
  const startDate    = Form.useWatch('start_date', form)
  const endDate      = Form.useWatch('end_date', form)
  const contactId    = Form.useWatch('contact_id', form)
  const linesWatch: any[] = Form.useWatch('lines', form) ?? []

  const contactName = contactOptions?.find((o: any) => o.value === contactId)?.label

  const dealTimeRange = (() => {
    const s = startDate?.format?.('DD/MM/YYYY')
    const e = endDate?.format?.('DD/MM/YYYY')
    if (s && e) return `${s} → ${e}`
    return s || e || undefined
  })()

  if (!isCreate && hook.isLoading) return null

  function handleSubmit(v: any) {
    if (!v.company_id) {
      toast.error('Vui lòng Fetch từ Bitrix Deal ID để lấy Nhà cung cấp')
      return
    }

    const filledLines = (v.lines ?? []).filter((l: any) => l?.variant_id)

    if (filledLines.length === 0) {
      toast.error('Cần ít nhất 1 dòng sản phẩm')
      return
    }

    const incomplete = filledLines.filter((l: any) => !l.quantity || l.unit_price == null)
    if (incomplete.length > 0) {
      toast.error('Các dòng sản phẩm đã chọn cần nhập đủ số lượng và đơn giá')
      return
    }

    const payload = {
      ...v,
      // variant_name/variant_code/variant_unit chỉ để hiển thị tĩnh ở POLineItem.tsx (không
      // còn VariantSelect sửa được tại chỗ nữa) — KHÔNG phải cột trong purchase_order_lines,
      // gửi nguyên lên sẽ vỡ insert (đã gặp thực tế: "column variant_code does not exist").
      lines: filledLines.map(({ variant_name, variant_code, variant_unit, ...l }: any) => l),
      start_date: v.start_date?.format('YYYY-MM-DD') ?? undefined,
      end_date:   v.end_date?.format('YYYY-MM-DD') ?? undefined,
    }

    if (isCreate) {
      hook.createMutation.mutate(payload)
    } else {
      hook.updateMutation.mutate(payload)
    }
  }

  // Thêm dòng qua ô "Quét mã / tìm hàng" cuối bảng — quét trùng SKU thì cộng dồn SL, không tạo
  // dòng mới (y hệt ReceiptFormPage.tsx::CreateLinesTable::handleScanAdd).
  function handleScanAdd(variant: VariantData) {
    const current: any[] = form.getFieldValue('lines') ?? []
    const idx = current.findIndex((l) => l?.variant_id === variant.id)
    if (idx >= 0) {
      const next = [...current]
      next[idx] = { ...next[idx], quantity: (Number(next[idx].quantity) || 0) + 1 }
      form.setFieldsValue({ lines: next })
    } else {
      const next = [...current, {
        variant_id: variant.id,
        variant_name: variant.name,
        variant_code: variant.item_code ?? variant.sku,
        variant_unit: variant.unit,
        quantity: 1,
        unit_price: variant.cost_price != null ? Number(variant.cost_price) : undefined,
        vat_percent: variant.vat_percent != null ? Number(variant.vat_percent) : 10,
        manufacturer_warranty_months: variant.manufacturer_warranty_months ?? undefined,
        customer_warranty_months: variant.manufacturer_warranty_months ?? undefined,
      }]
      form.setFieldsValue({ lines: next })
    }
    setScanKey((k) => k + 1)
  }

  // Nguồn dữ liệu tính tổng cho footer-bar — view mode đọc `po.lines` đã lưu, create/edit đọc
  // form đang gõ (linesWatch) để cập nhật tức thời.
  const statLines: any[] = isView ? (po?.lines ?? []) : linesWatch
  const beforeTax = statLines.reduce((sum, l) => (l?.quantity && l?.unit_price != null ? sum + l.quantity * l.unit_price : sum), 0)
  const vatTotal = statLines.reduce((sum, l) => (l?.quantity && l?.unit_price != null ? sum + l.quantity * l.unit_price * ((l.vat_percent ?? 0) / 100) : sum), 0)
  const grandTotal = beforeTax + vatTotal
  const lineCount = statLines.filter((l) => l?.variant_id).length

  return (
    <div className="theme-2a -m-6 mx-auto flex w-full max-w-[1200px] flex-col gap-4 bg-background p-6">

      {/* Header — port .kv-head.kv-head--divided/.kv-crumb/.kv-title--sm nguyên bản */}
      <div className="kv-head kv-head--divided">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button type="button" className="kv-btn kv-btn--ghost" onClick={() => hook.navigate(-1)} style={{ padding: 0, width: 30, flexShrink: 0 }} aria-label="Quay lại">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="kv-crumb">
              <button onClick={() => hook.navigate('/purchase-orders')} style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer' }}>
                Phiếu mua hàng
              </button>
              {' / '}{isCreate ? 'Tạo mới' : (po?.code ?? hook.id)}
            </div>
            <h1 className="kv-title kv-title--sm" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="mono">{isCreate ? 'Tạo phiếu mua hàng' : po?.code}</span>
              {po?.status && <StatusBadge status={po.status} />}
            </h1>
          </div>
        </div>
        <div className="kv-actions">
          {!isCreate && (
            <button
              type="button"
              className="kv-btn kv-btn--primary"
              disabled={po?.status !== 'confirmed'}
              onClick={() => hook.navigate(`/shipments/new?po_id=${po?.id}`)}
            >
              Tạo phiếu nhận hàng
            </button>
          )}
          {mode === 'edit' && (
            <button
              type="button"
              className="kv-btn"
              onClick={() => hook.confirmMutation.mutate()}
              disabled={hook.confirmMutation.isPending}
            >
              Xác nhận
            </button>
          )}
          {!isCreate && po?.status !== 'cancelled' && (
            <button
              type="button"
              className="kv-btn kv-btn--danger"
              onClick={() => setCancelOpen(true)}
              disabled={hook.cancelMutation.isPending}
            >
              Huỷ phiếu
            </button>
          )}
          {!isCreate && (
            <button
              type="button"
              className="kv-btn"
              onClick={() => setDeleteOpen(true)}
              disabled={hook.deleteMutation.isPending}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <Form
        form={form}
        layout="vertical"
        initialValues={isCreate ? { lines: [] } : undefined}
        onFinish={isView ? undefined : handleSubmit}
        onValuesChange={() => { if (!isCreate) setIsDirty(true) }}
        onFinishFailed={({ errorFields }) => {
          setTimeout(() => {
            form.setFields(errorFields.map((f) => ({ name: f.name, errors: [] })))
          }, 3000)
        }}
        className="flex flex-col gap-4"
      >
        {/* ─── Thông tin phiếu — port .kv-form-grid/.kv-fetch/.kv-deal/.kv-dl nguyên bản ─── */}
        <div className="kv-form-grid">
          <div className="kv-group-label">Deal Bitrix</div>
          <div>
            {!isView && (
              <>
                <p className="kv-hint" style={{ marginTop: 0 }}>
                  Nhập Bitrix Deal ID rồi bấm Fetch — các field còn lại tự động điền, không sửa tay được.
                </p>
                <div className="kv-fetch">
                  <div className="kv-field">
                    <label>Bitrix Deal ID</label>
                    <Form.Item name="bitrix_deal_id" noStyle>
                      <input
                        className="kv-input mono"
                        placeholder="Deal ID"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            hook.resolveDeal()
                          }
                        }}
                      />
                    </Form.Item>
                  </div>
                  <button type="button" className="kv-btn" onClick={hook.resolveDeal} disabled={hook.dealResolving}>
                    {hook.dealResolving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Lấy dữ liệu
                  </button>
                  {dealTitle && (
                    <span className="kv-fetch-status"><CheckCircle2 className="h-3.5 w-3.5" />Đã đồng bộ</span>
                  )}
                </div>
              </>
            )}

            {/* Đăng ký các field chỉ-đọc này vào Form (hidden, không hiện gì) — Form.useWatch
                chỉ nhận diện đáng tin cậy những field ĐÃ có Form.Item ở đâu đó trong cây; dl
                bên dưới thuần render text nên không tự đăng ký, nếu bỏ qua bước này thì
                form.setFieldsValue(...) trong resolveDeal() sẽ không phản ánh lên UI (đã gặp
                thực tế lúc test — Fetch chạy xong, API trả dữ liệu đúng, nhưng dl vẫn hiện
                "Chưa có trên deal" vì watch không bắt được thay đổi). company_id cũng phải đăng
                ký ở đây vì usePurchaseOrderForm.ts tự watch nó để suy ra companyDetail (tên NCC
                + danh sách người liên hệ). */}
            <Form.Item name="company_id" noStyle><HiddenField /></Form.Item>
            <Form.Item name="contact_id" noStyle><HiddenField /></Form.Item>
            <Form.Item name="deal_title" noStyle><HiddenField /></Form.Item>
            <Form.Item name="bitrix_deal_url" noStyle><HiddenField /></Form.Item>
            <Form.Item name="deal_amount" noStyle><HiddenField /></Form.Item>
            <Form.Item name="contract_number" noStyle><HiddenField /></Form.Item>
            <Form.Item name="region" noStyle><HiddenField /></Form.Item>
            <Form.Item name="delivery_location" noStyle><HiddenField /></Form.Item>
            <Form.Item name="start_date" noStyle><HiddenField /></Form.Item>
            <Form.Item name="end_date" noStyle><HiddenField /></Form.Item>

            <div className="kv-deal" style={isView ? { marginTop: 0, paddingTop: 0, borderTop: 'none' } : undefined}>
              {dealTitle && (
                <div className="kv-deal-title">
                  <span>{dealTitle}</span>
                  {dealUrl && <a href={dealUrl} target="_blank" rel="noreferrer">Mở trên Bitrix ↗</a>}
                </div>
              )}
              <dl className="kv-dl">
                {isView && (
                  <div><dt>Bitrix Deal ID</dt><dd>{po?.bitrix_deal_id || <Empty />}</dd></div>
                )}
                <div><dt>Nhà cung cấp</dt><dd>{hook.companyDetail?.name || <Empty />}</dd></div>
                <div><dt>Người liên hệ</dt><dd>{contactName || <Empty />}</dd></div>
                <div><dt>Khu vực</dt><dd>{region || <Empty />}</dd></div>
                <div><dt>Số hợp đồng</dt><dd>{contractNo || <Empty />}</dd></div>
                <div><dt>Thời gian deal</dt><dd className="mono">{dealTimeRange || <Empty />}</dd></div>
                <div><dt>Địa chỉ</dt><dd>{address || <Empty />}</dd></div>
              </dl>
            </div>
          </div>

          <div className="kv-group-label">Ghi chú</div>
          <div className="kv-group-body">
            {isView ? (
              <div className="kv-input" style={{ height: 'auto', minHeight: 30, whiteSpace: 'pre-wrap', wordBreak: 'break-word', padding: '5px 9px', display: 'flex', alignItems: 'flex-start' }}>
                {po?.note || <span className="kv-muted">—</span>}
              </div>
            ) : (
              <Form.Item name="note" noStyle>
                <textarea className="kv-input" rows={2} style={{ resize: 'vertical', minHeight: 36 }} placeholder="Tuỳ chọn" />
              </Form.Item>
            )}
          </div>
        </div>

        {/* ─── Danh sách sản phẩm ─────────────────────────────────────────── */}
        <div className="kv-section-head" style={{ paddingTop: 0 }}>
          <div>
            <div className="kv-eyebrow">Dòng hàng</div>
            <h2 className="kv-section-title">Hàng mua{!isView ? ` · ${lineCount} dòng` : ''}</h2>
          </div>
          {!isView && (
            <div className="kv-actions">
              <button type="button" className="kv-btn kv-btn--ghost" disabled title="Chưa hỗ trợ">Lấy sản phẩm từ deal</button>
              <button type="button" className="kv-btn kv-btn--ghost" disabled title="Chưa hỗ trợ">Nhập từ Excel</button>
            </div>
          )}
        </div>

        {isView ? (
          <ViewLinesTable lines={po?.lines ?? []} />
        ) : (
          <div className="overflow-x-auto">
            <Form.List name="lines">
              {(fields, { remove }) => (
                <table className="kv-table kv-lines" style={{ minWidth: 900 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 36 }}>#</th>
                      <th className="text-left">Sản phẩm</th>
                      <th className="num" style={{ width: 90 }}>SL</th>
                      <th className="num" style={{ width: 140 }}>Đơn giá (đ)</th>
                      <th style={{ width: 80 }}>VAT</th>
                      <th className="num" style={{ width: 140 }}>Thành tiền (đ)</th>
                      <th style={{ width: 36 }}></th>
                      <th style={{ width: 36 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.length === 0 && (
                      <tr><td colSpan={8} className="kv-muted" style={{ textAlign: 'center', padding: '20px 0' }}>Chưa có dòng hàng</td></tr>
                    )}
                    {fields.map(({ key, name }) => (
                      <POLineItem key={key} form={form} name={name} remove={() => remove(name)} />
                    ))}
                  </tbody>
                  {fields.length > 0 && (
                    <tfoot>
                      <tr className="kv-total--sub">
                        <td></td><td colSpan={4}>Tổng trước thuế</td>
                        <td className="num">{fmt(beforeTax)}</td><td colSpan={2}></td>
                      </tr>
                      <tr className="kv-total--sub">
                        <td></td><td colSpan={4}>VAT</td>
                        <td className="num">{fmt(vatTotal)}</td><td colSpan={2}></td>
                      </tr>
                      <tr className="kv-total--grand">
                        <td></td><td colSpan={4}>Tổng thanh toán</td>
                        <td className="num">{fmt(grandTotal)}</td><td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  )}
                  <tfoot>
                    <tr className="kv-addline">
                      <td></td>
                      <td colSpan={7}>
                        <div className="kv-actions">
                          <Barcode className="h-4 w-4" style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                          <VariantSelect
                            key={scanKey}
                            excludeTypes={['service']}
                            style={{ width: 380 }}
                            placeholder="Quét mã vạch hoặc gõ mã / tên hàng để thêm dòng…"
                            onSelectVariant={(v) => v && handleScanAdd(v)}
                          />
                          <span className="kv-kbd">Enter</span>
                          <span className="kv-muted" style={{ fontSize: 12 }}>Bảo hành hãng và công ty lấy tự động theo SKU</span>
                        </div>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </Form.List>
          </div>
        )}
      </Form>

      {/* ─── Thanh hành động dính đáy ───────────────────────────────────── */}
      <div className="kv-footer-bar">
        <div className="kv-footer-stat"><div className="kv-fact-label">Số dòng</div><div className="kv-fact-value">{lineCount}</div></div>
        <div className="kv-footer-stat"><div className="kv-fact-label">Trước thuế</div><div className="kv-fact-value">{fmt(beforeTax)} đ</div></div>
        <div className="kv-footer-stat"><div className="kv-fact-label">Tổng thanh toán</div><div className="kv-fact-value">{fmt(grandTotal)} đ</div></div>
        <div className="kv-spacer" />
        <div className="kv-actions">
          <button type="button" className="kv-btn" onClick={() => hook.navigate('/purchase-orders')}>
            Quay lại
          </button>

          {!isView && (
            <button
              type="button"
              className="kv-btn kv-btn--primary"
              onClick={() => form.submit()}
              disabled={(mode === 'edit' && !isDirty) || hook.createMutation.isPending || hook.updateMutation.isPending}
            >
              {(hook.createMutation.isPending || hook.updateMutation.isPending) && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              {isCreate ? 'Tạo phiếu mua hàng' : isDirty ? 'Lưu thay đổi' : 'Sửa'}
            </button>
          )}

          {mode === 'view' && po?.status === 'confirmed' && (
            <button
              type="button"
              className="kv-btn"
              onClick={() => hook.unconfirmMutation.mutate()}
              disabled={hook.unconfirmMutation.isPending}
            >
              Về nháp
            </button>
          )}
        </div>
      </div>

      {/* Huỷ phiếu confirm */}
      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Huỷ phiếu mua hàng này?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Không</AlertDialogCancel>
            <AlertDialogAction
              variant="danger"
              onClick={() => { hook.cancelMutation.mutate(); setCancelOpen(false) }}
            >
              Huỷ phiếu
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Xoá confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá phiếu mua hàng này?</AlertDialogTitle>
            <AlertDialogDescription>
              Phiếu sẽ bị xoá khỏi hệ thống, không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Không</AlertDialogCancel>
            <AlertDialogAction
              variant="danger"
              onClick={() => { hook.deleteMutation.mutate(); setDeleteOpen(false) }}
            >
              Xoá
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Sub-components cho view mode ───────────────────────────────────────────

function ViewLinesTable({ lines }: { lines: any[] }) {
  const cols: LineItemsColumn<any>[] = [
    { key: 'code',     label: 'Mã hàng',    align: 'left',  render: (l) => l.variant_item_code ?? l.variant_sku ?? '—' },
    { key: 'name',     label: 'Tên',        align: 'left',  render: (l) => l.variant_name ?? '—' },
    { key: 'qty',      label: 'SL',         align: 'right', render: (l) => fmt(l.quantity) },
    { key: 'price',    label: 'Đơn giá',    align: 'right', render: (l) => fmt(l.unit_price) },
    { key: 'vat',      label: 'VAT %',      align: 'right', render: (l) => l.vat_percent != null ? `${l.vat_percent}%` : '—' },
    { key: 'total',    label: 'Thành tiền', align: 'right', render: (l) => l.quantity && l.unit_price != null ? fmt(Math.round(l.quantity * l.unit_price * (1 + (l.vat_percent ?? 0) / 100))) : '—' },
    { key: 'mfg_wty',  label: 'BH hãng',    align: 'right', render: (l) => l.manufacturer_warranty_months != null ? `${l.manufacturer_warranty_months}` : '—' },
    { key: 'cust_wty', label: 'BH công ty', align: 'right', render: (l) => l.customer_warranty_months != null ? `${l.customer_warranty_months}` : '—' },
    { key: 'received', label: 'Đã nhận',    align: 'right', render: (l) => fmt(l.received_qty) },
    { key: 'pending',  label: 'Đang chờ',   align: 'right', render: (l) => fmt(l.pending_qty) },
    { key: 'remain',   label: 'Còn lại',    align: 'right', render: (l) => fmt(l.remaining_qty) },
    { key: 'note',     label: 'Ghi chú',    align: 'left',  render: (l) => l.note ?? '—' },
  ]

  return <LineItemsTable cols={cols} rows={lines} rowKey={(l, i) => l.id ?? i} minWidth={1100} />
}
