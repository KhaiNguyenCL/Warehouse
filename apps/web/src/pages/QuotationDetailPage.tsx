import React from 'react'
import { useParams } from 'react-router-dom'
import {
  Form, Input, InputNumber, Select, Tag, Skeleton,
  DatePicker, Button as AntButton,
} from 'antd'
import { SyncOutlined } from '@ant-design/icons'
import {
  ArrowLeft, Pencil, RefreshCw, FileSpreadsheet, FileDown, Eye, User, Copy,
  MoreHorizontal, Loader2,
} from 'lucide-react'
import dayjs from 'dayjs'
import { useQuotationDetail } from '../hooks/useQuotationDetail'
import { useTermTemplates } from '../hooks/useTermTemplates'

function toRoman(n: number): string {
  const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1]
  const syms = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I']
  let s = ''
  for (let i = 0; i < vals.length; i++) {
    while (n >= vals[i]) { s += syms[i]; n -= vals[i] }
  }
  return s
}
import { StatusBadge } from '../components/ui/StatusBadge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { usePageHeader } from '@/layout/PageHeaderSlot'
import { fieldTier } from '@/styles/fieldWidths'
import CustomFieldsPanel from '../components/CustomFieldsPanel'
import ActivityTimeline from '../components/ActivityTimeline'
import QuotationSectionItem from '../components/QuotationSectionItem'
import { LineItemsTable, type LineItemsColumn } from '../components/LineItemsTable'

function makeLineCols(retail: boolean): LineItemsColumn<any>[] {
  return [
    { key: 'product',  label: 'Sản phẩm',   render: (l) => l.bundle_name ?? l.variant_name ?? l.description ?? '—' },
    { key: 'code',     label: 'Mã hàng',    render: (l) => l.bundle_item_code ?? l.variant_item_code ?? '—' },
    { key: 'qty',      label: 'SL',         align: 'right', render: (l) => l.quantity },
    {
      key: 'price',
      label: retail ? 'Đơn giá (đã VAT)' : 'Đơn giá',
      align: 'right',
      render: (l) => {
        const base = Number(l.unit_price ?? 0)
        const vat = Number(l.vat_percent ?? 0)
        return fmt(retail ? base * (1 + vat / 100) : base)
      },
    },
    ...(!retail ? [{ key: 'vat', label: 'VAT%', align: 'right' as const, render: (l: any) => l.vat_percent }] : []),
    {
      key: 'total',
      label: 'Thành tiền',
      align: 'right',
      render: (l) => {
        const lineTotal = Number(l.line_total ?? 0)
        const vat = Number(l.vat_percent ?? 0)
        return fmt(retail ? lineTotal * (1 + vat / 100) : lineTotal)
      },
    },
    ...(!retail ? [{ key: 'vat_amount', label: 'Tiền VAT', align: 'right' as const, render: (l: any) => fmt(l.vat_amount) }] : []),
    { key: 'warranty', label: 'Bảo hành', render: (l) => l.warranty },
    { key: 'reserved', label: 'Giữ chỗ', render: (l) => <Tag color={l.is_reserved ? 'blue' : 'default'}>{l.is_reserved ? 'Có' : 'Không'}</Tag> },
    { key: 'exported', label: 'Đã xuất', align: 'right', render: (l) => l.exported_qty },
    { key: 'pending',  label: 'Chờ xuất', align: 'right', render: (l) => l.pending_qty },
    { key: 'remain',   label: 'Còn lại', align: 'right', render: (l) => l.remaining_qty },
    { key: 'note',     label: 'Ghi chú', render: (l) => l.note },
  ]
}

function LineTable({ rows, nested, retail }: { rows: any[]; nested?: boolean; retail?: boolean }) {
  if (!rows.length) return null
  return <LineItemsTable cols={makeLineCols(!!retail)} rows={rows} rowKey={(l) => l.id} nested={nested} />
}

function SectionCard({ title, extra, children }: { title: string; extra?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>{title}</span>
        {extra}
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: 12, color: 'var(--text-2)', fontWeight: 700,
  marginBottom: 4,
}
const valueStyle: React.CSSProperties = {
  fontSize: 14, color: 'var(--text-1)', minHeight: 32, display: 'flex', alignItems: 'center',
}
const valueViewStyle: React.CSSProperties = {
  ...valueStyle,
  border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px',
  backgroundColor: 'var(--muted)',
}

function Field({ label, children, editing }: { label: string; children: React.ReactNode; editing?: boolean }) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      <div style={editing ? valueStyle : valueViewStyle}>{children}</div>
    </div>
  )
}

function Val({ v }: { v?: React.ReactNode }) {
  return v != null && v !== '' ? <>{v}</> : <span style={{ color: 'var(--text-3)' }}>—</span>
}

function fmt(n: any) {
  if (n == null) return '—'
  return Number(n).toLocaleString('en-US')
}

export default function QuotationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const hook = useQuotationDetail(id!)
  const { data: termTemplates } = useTermTemplates()
  const [retailMode, setRetailMode] = React.useState(false)
  const [cancelOpen, setCancelOpen] = React.useState(false)
  const [expireOpen, setExpireOpen] = React.useState(false)

  // Computed expiry preview trong edit mode
  const watchQuoteDate = Form.useWatch('quote_date', hook.form)
  const watchValidDays = Form.useWatch('valid_days', hook.form)
  const computedExpiry = watchQuoteDate && watchValidDays
    ? dayjs(watchQuoteDate).add(Number(watchValidDays), 'day').format('DD/MM/YYYY')
    : null

  const q = hook.data
  const isDraft = hook.isNew || q?.status === 'draft'
  const isConfirmed = q?.status === 'confirmed'
  const allDone = q?.sections?.every((s: any) => s.line_items?.every((l: any) => Number(l.remaining_qty) <= 0))

  // usePageHeader là hook — PHẢI gọi vô điều kiện trước early return bên dưới (xem CLAUDE.md
  // mục 22 — lỗi từng gặp ở SettingsBitrixPage/PurchaseOrderCreatePage khi đặt sau early return).
  // Giai đoạn 1: gộp toàn bộ nút hành động (trước đây 8 nút tràn hàng, phải cuộn ngang) —
  // giữ lộ ra nút hay dùng nhất (Khách lẻ, Xuất PDF, Excel, action theo trạng thái), dồn nút
  // ít dùng hơn (Xem trước, Nhân bản, Về Draft, Hết hạn, Huỷ) vào menu "···".
  usePageHeader(
    <div className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-2">
        <Button variant="ghost" size="icon-sm" onClick={() => hook.navigate('/quotations')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="flex min-w-0 items-baseline gap-2 truncate text-sm font-semibold tracking-tight">
          <button
            onClick={() => hook.navigate('/quotations')}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Báo giá
          </button>
          <span className="text-muted-foreground">/</span>
          <span className="truncate text-foreground">{hook.isNew ? 'Tạo mới' : q?.code}</span>
        </h1>
        {!hook.isNew && q && <StatusBadge status={q.status} />}
      </div>

      <div className="flex flex-shrink-0 items-center gap-2">
        {hook.isEditing ? (
          <>
            <Button size="sm" variant="outline" onClick={hook.cancelEdit}>Huỷ</Button>
            <Button size="sm" onClick={hook.saveEdit} disabled={hook.savePending}>
              {hook.savePending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {hook.isNew ? 'Tạo báo giá' : 'Lưu'}
            </Button>
          </>
        ) : (
          <>
            {!hook.isNew && (
              <>
                <Button
                  size="sm" variant={retailMode ? 'default' : 'outline'}
                  title={retailMode ? 'Đang hiện giá gộp VAT (khách lẻ)' : 'Chuyển sang giá gộp VAT (khách lẻ)'}
                  onClick={() => setRetailMode((v) => !v)}
                >
                  <User className="mr-1.5 h-4 w-4" />
                  Khách lẻ
                </Button>
                <Button size="sm" onClick={hook.handlePdfExport} disabled={hook.exporting}>
                  {hook.exporting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <FileDown className="mr-1.5 h-4 w-4" />}
                  Xuất PDF
                </Button>
                <Select
                  placeholder="Template Excel"
                  style={{ width: 150 }}
                  size="small"
                  options={hook.templates?.data?.map((t: any) => ({ value: t.id, label: t.name }))}
                  onChange={hook.setTemplateId}
                  notFoundContent="Chưa có template"
                />
                <Button
                  size="sm" variant="outline"
                  disabled={!hook.templateId || hook.exporting}
                  onClick={() => hook.handleExport('xlsx')}
                >
                  <FileSpreadsheet className="mr-1.5 h-4 w-4" />
                  Excel
                </Button>
              </>
            )}

            {isDraft && (
              <Button size="sm" variant="outline" onClick={hook.startEdit}>Sửa</Button>
            )}
            {isDraft && !hook.isNew && (
              <Button size="sm" variant="success" onClick={() => hook.confirmMutation.mutate()} disabled={hook.confirmMutation.isPending}>
                Confirm
              </Button>
            )}
            {isConfirmed && (
              <Button size="sm" disabled={allDone} onClick={() => hook.navigate(`/deliveries?quotation_id=${q!.id}`)}>
                Tạo Delivery Order
              </Button>
            )}

            {!hook.isNew && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon-sm" title="Thao tác khác">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={hook.handlePdfPreview} disabled={hook.exporting}>
                    <Eye className="mr-2 h-4 w-4" />
                    Xem trước PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => hook.cloneMutation.mutate()} disabled={hook.cloneMutation.isPending}>
                    <Copy className="mr-2 h-4 w-4" />
                    Nhân bản
                  </DropdownMenuItem>
                  {isConfirmed && (
                    <DropdownMenuItem onClick={() => hook.unconfirmMutation.mutate()} disabled={hook.unconfirmMutation.isPending}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Về Draft
                    </DropdownMenuItem>
                  )}
                  {isConfirmed && (
                    <DropdownMenuItem onClick={() => setExpireOpen(true)}>
                      Đánh dấu hết hạn
                    </DropdownMenuItem>
                  )}
                  {!['cancelled', 'expired'].includes(q?.status ?? '') && (
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setCancelOpen(true)}
                    >
                      Huỷ báo giá
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </>
        )}
      </div>
    </div>,
  )

  if (!hook.isNew && (hook.isLoading || !hook.data)) return <Skeleton active style={{ padding: 20 }} />

  return (
    <div className="theme-2a" style={{ padding: '10px 20px 40px', display: 'flex', flexDirection: 'column', gap: 28 }}>
      <Form form={hook.form} layout="vertical"
        style={{ display: 'flex', flexDirection: 'column', gap: 28 }}
        initialValues={hook.isNew ? { sections: [{ name: 'Nhóm 1', line_items: [{}] }] } : undefined}>

        {/* ── Thông tin báo giá ── */}
        <SectionCard title="Thông tin báo giá">
          {/* Tỷ lệ cột lệch (1.4/1.1/0.8) thay vì chia đều 3 cột bằng nhau — cột 1 (Khách
              hàng/Bitrix Deal ID/Địa điểm) cần rộng vì chứa tên công ty/địa chỉ dài, cột 3
              (Hiệu lực/Ngày báo giá/Hết hạn) chỉ cần đủ chỗ cho 1 con số/ngày ngắn. */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.1fr 0.8fr', gap: '22px 28px' }}>

            {/* Row 1: Bitrix ID+Fetch | Số báo giá | Ngày báo giá — cả 3 field này chỉ chứa
                giá trị ngắn (ID, mã số, ngày) nên giới hạn maxWidth thay vì kéo giãn hết cỡ
                cột (cột 1.4fr vốn để dành cho Khách hàng/Địa điểm ở các hàng dưới, không phải
                Bitrix Deal ID). */}
            <div style={{ maxWidth: fieldTier.long }}>
              <div style={labelStyle}>Bitrix Deal ID</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <Input
                  placeholder="Deal ID (tuỳ chọn)"
                  value={hook.dealId}
                  onChange={(e) => hook.setDealId(e.target.value)}
                  onPressEnter={hook.fetchFromBitrix}
                  style={{ flex: 1, minWidth: 0 }}
                  disabled={!hook.isEditing}
                />
                {hook.isEditing && (
                  <AntButton icon={<SyncOutlined />} loading={hook.bitrixLoading}
                    onClick={hook.fetchFromBitrix} disabled={!hook.dealId.trim()}
                    title="Fetch & điền form từ Bitrix" />
                )}
              </div>
              {hook.bitrixError && <div style={{ color: 'var(--s-cancelled-color)', fontSize: 12, marginTop: 4 }}>{hook.bitrixError}</div>}
              {hook.bitrixInfo  && <div style={{ color: 'var(--s-completed-color)', fontSize: 12, marginTop: 4 }}>{hook.bitrixInfo}</div>}
            </div>

            <div style={{ maxWidth: fieldTier.long }}>
              <Field editing={hook.isEditing} label="Số báo giá">
                {hook.isEditing
                  ? <Form.Item name="quote_number" noStyle><Input style={{ width: '100%' }} placeholder="VD: BG-2026-001" /></Form.Item>
                  : <Val v={q?.quote_number} />}
              </Field>
            </div>

            <div style={{ maxWidth: fieldTier.medium }}>
              <Field editing={hook.isEditing} label="Ngày báo giá">
                {hook.isEditing
                  ? <Form.Item name="quote_date" noStyle><DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} /></Form.Item>
                  : <Val v={q?.quote_date ? new Date(q.quote_date).toLocaleDateString('vi-VN') : undefined} />}
              </Field>
            </div>

            {/* Row 2: Khách hàng | Người liên hệ | Hiệu lực */}
            <Field editing={hook.isEditing} label="Khách hàng">
              {hook.isEditing
                ? <Form.Item name="company_id" noStyle rules={[{ required: true, message: 'Bắt buộc chọn khách hàng' }]}>
                    <Select showSearch optionFilterProp="label" style={{ width: '100%' }} placeholder="Chọn khách hàng"
                      options={[
                        ...(hook.companies?.data ?? []),
                        ...(hook.bitrixCompany && !hook.companies?.data?.find((c: any) => c.id === hook.bitrixCompany!.id) ? [hook.bitrixCompany] : []),
                      ].map((c: any) => ({ value: c.id, label: c.name }))}
                      onChange={() => hook.form.setFieldValue('contact_id', undefined)} />
                  </Form.Item>
                : <Val v={q?.company_name} />}
            </Field>

            <Field editing={hook.isEditing} label="Người liên hệ">
              {hook.isEditing
                ? <Form.Item name="contact_id" noStyle>
                    <Select allowClear style={{ width: '100%' }} disabled={!hook.companyId}
                      placeholder={hook.companyId ? 'Chọn người liên hệ' : 'Chọn khách hàng trước'}
                      options={hook.companyDetail?.contacts?.map((c: any) => ({ value: c.id, label: c.full_name }))} />
                  </Form.Item>
                : <Val v={q?.contact_name} />}
            </Field>

            <div style={{ maxWidth: fieldTier.short }}>
              <Field editing={hook.isEditing} label="Hiệu lực (ngày)">
                {hook.isEditing
                  ? <Form.Item name="valid_days" noStyle><InputNumber controls={false} min={1} style={{ width: '100%' }} /></Form.Item>
                  : <Val v={q?.valid_days != null ? `${q.valid_days} ngày` : undefined} />}
              </Field>
            </div>

            {/* Row 3: Tên dự án (full width) */}
            <div style={{ gridColumn: '1 / -1' }}>
              <Field editing={hook.isEditing} label="Tên dự án">
                {hook.isEditing
                  ? <Form.Item name="project_name" noStyle><Input style={{ width: '100%' }} placeholder="Tên dự án / công trình" /></Form.Item>
                  : <Val v={q?.project_name} />}
              </Field>
            </div>

            {/* Row 4: Địa điểm | Kho xuất | Hết hạn */}
            <Field editing={hook.isEditing} label="Địa điểm giao hàng">
              {hook.isEditing
                ? <Form.Item name="delivery_location" noStyle><Input style={{ width: '100%' }} /></Form.Item>
                : <Val v={q?.delivery_location} />}
            </Field>

            <Field editing={hook.isEditing} label="Kho xuất">
              {hook.isEditing
                ? <Form.Item name="warehouse_id" noStyle>
                    <Select allowClear style={{ width: '100%' }} placeholder="Bắt buộc khi có dòng giữ chỗ"
                      options={hook.warehouses?.map((w: any) => ({ value: w.id, label: w.name }))} />
                  </Form.Item>
                : <Val v={q?.warehouse_name} />}
            </Field>

            <Field editing={hook.isEditing} label="Hết hạn">
              {hook.isEditing
                ? <span style={{ fontSize: 14, color: computedExpiry ? 'var(--text-1)' : 'var(--text-3)' }}>
                    {computedExpiry ?? '— nhập Ngày BG + Hiệu lực'}
                  </span>
                : <Val v={q?.expired_at ? new Date(q.expired_at).toLocaleDateString('vi-VN') : undefined} />}
            </Field>

            {/* Điều khoản: label 1 lần, Select chọn mẫu + TextArea */}
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={labelStyle}>Điều khoản</div>
              {hook.isEditing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <Select
                    allowClear
                    placeholder="Chọn mẫu điều khoản (tuỳ chọn)"
                    style={{ width: '100%' }}
                    options={termTemplates?.map((t) => ({ value: t.id, label: t.name }))}
                    onChange={(tid) => {
                      const tpl = termTemplates?.find((t) => t.id === tid)
                      if (tpl) hook.form.setFieldValue('terms', tpl.content)
                    }}
                  />
                  <Form.Item name="terms" noStyle>
                    <Input.TextArea rows={4} style={{ width: '100%' }} placeholder="Nội dung điều khoản..." />
                  </Form.Item>
                </div>
              ) : (
                <div style={{ ...valueViewStyle, whiteSpace: 'pre-wrap' }}><Val v={q?.terms} /></div>
              )}
            </div>

            {/* Ghi chú */}
            <div style={{ gridColumn: '1 / -1' }}>
              <Field editing={hook.isEditing} label="Ghi chú">
                {hook.isEditing
                  ? <Form.Item name="note" noStyle><Input.TextArea rows={2} style={{ width: '100%' }} /></Form.Item>
                  : <Val v={q?.note} />}
              </Field>
            </div>

          </div>

          {!hook.isNew && (
            <div style={{ marginTop: 16 }}>
              <CustomFieldsPanel objectType="quotation" objectId={id!} inline />
            </div>
          )}
        </SectionCard>

        {/* ── Danh sách sản phẩm ── */}
        {hook.isEditing ? (
          <SectionCard title="Danh sách sản phẩm">
            <Form.List name="sections">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name }, idx) => (
                    <QuotationSectionItem key={key} form={hook.form} name={name} sectionIndex={idx} remove={() => remove(name)} />
                  ))}
                  <AntButton style={{ marginTop: 8 }} onClick={() => add({ name: `Nhóm ${fields.length + 1}`, line_items: [{}] })}>
                    + Thêm nhóm
                  </AntButton>
                </>
              )}
            </Form.List>
          </SectionCard>
        ) : (
          q?.sections?.map((section: any, sIdx: number) => {
            const sectionRetailTotal = retailMode
              ? (section.line_items ?? []).reduce((acc: number, l: any) => {
                  const lineTotal = Number(l.line_total ?? 0)
                  const vat = Number(l.vat_percent ?? 0)
                  return acc + lineTotal * (1 + vat / 100)
                }, 0)
              : null
            return (
              <SectionCard key={section.id} title={`${toRoman(sIdx + 1)}. ${section.name}`}>
                <LineTable rows={section.line_items ?? []} retail={retailMode} />
                {(section.sub_sections ?? []).map((ss: any, ssIdx: number) => (
                  <div key={ss.id} style={{ marginTop: 10 }}>
                    <div style={{
                      padding: '4px 10px',
                      background: 'var(--accent-bg)',
                      border: '1px solid var(--accent)',
                      borderBottom: 'none',
                      borderRadius: '6px 6px 0 0',
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--accent-text)',
                    }}>
                      <span style={{ marginRight: 6 }}>{ssIdx + 1}.</span>
                      {ss.name}
                      {ss.product_name && ss.product_name !== ss.name && (
                        <span style={{ fontWeight: 400, color: 'var(--accent)', marginLeft: 6, fontSize: 12 }}>
                          ({ss.product_name})
                        </span>
                      )}
                    </div>
                    <LineTable rows={ss.line_items ?? []} nested retail={retailMode} />
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '6px 0 0', fontSize: 13, color: 'var(--text-2)' }}>
                  Tổng nhóm: <strong style={{ marginLeft: 8 }}>{fmt(retailMode ? sectionRetailTotal : section.subtotal)}</strong>
                </div>
              </SectionCard>
            )
          })
        )}

        {/* ── Tổng cộng (chỉ hiện khi đang xem báo giá đã có) ── */}
        {!hook.isNew && !hook.isEditing && q && (
          <SectionCard title="Tổng cộng">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
              {!retailMode && (
                <>
                  <div style={{ display: 'flex', gap: 32, fontSize: 14 }}>
                    <span style={{ color: 'var(--text-2)' }}>Tạm tính</span>
                    <span style={{ minWidth: 140, textAlign: 'right' }}>{fmt(q.subtotal)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 32, fontSize: 14 }}>
                    <span style={{ color: 'var(--text-2)' }}>Tiền VAT</span>
                    <span style={{ minWidth: 140, textAlign: 'right' }}>{fmt(q.vat_total)}</span>
                  </div>
                </>
              )}
              {Number(q.discount) > 0 && (
                <div style={{ display: 'flex', gap: 32, fontSize: 14 }}>
                  <span style={{ color: 'var(--text-2)' }}>Giảm giá</span>
                  <span style={{ minWidth: 140, textAlign: 'right', color: 'var(--s-cancelled-color)' }}>- {fmt(q.discount)}</span>
                </div>
              )}
              <div style={{ display: 'flex', gap: 32, fontSize: 16, fontWeight: 700, borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4 }}>
                <span>Tổng cộng</span>
                <span style={{ minWidth: 140, textAlign: 'right' }}>{fmt(q.grand_total)}</span>
              </div>
            </div>
          </SectionCard>
        )}

      </Form>

      {!hook.isNew && id && (
        <div style={{ marginTop: 24, padding: '16px 20px', border: '1px solid var(--border)', borderRadius: 8 }}>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Lịch sử hoạt động</div>
          <ActivityTimeline objectType="quotation" objectId={id} />
        </div>
      )}

      {/* Đánh dấu hết hạn confirm */}
      <AlertDialog open={expireOpen} onOpenChange={setExpireOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Đánh dấu hết hạn?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Không</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { hook.expireMutation.mutate(); setExpireOpen(false) }}
            >
              Đánh dấu hết hạn
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Huỷ báo giá confirm */}
      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Huỷ báo giá này?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Không</AlertDialogCancel>
            <AlertDialogAction
              variant="danger"
              onClick={() => { hook.cancelMutation.mutate(); setCancelOpen(false) }}
            >
              Huỷ báo giá
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
