import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Table, Button as AntButton, Modal, Input, Tag, Divider, Form } from 'antd'
import type { TableRowSelection } from 'antd/es/table/interface'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { useDeliveryOrderDetail } from '../hooks/useDeliveryOrderDetail'
import { StatusBadge } from '@/components/ui/StatusBadge'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import CustomFieldsPanel from '../components/CustomFieldsPanel'
import ActivityTimeline from '../components/ActivityTimeline'
import { LineItemsTable } from '../components/LineItemsTable'
import { api } from '../lib/api'

// Port .kv-head/.kv-form-grid/.kv-table nguyên bản (đồng bộ ProductDetailPage/ReceiptFormPage/
// PurchaseOrderCreatePage — "chi tiết SKU") thay cho SectionCard + usePageHeader trước đây.
// Modal "Complete — chọn Serial Number" (SNPickerTable, rowSelection AntD Table) GIỮ NGUYÊN vì
// là logic chọn SN phức tạp riêng của trang này, không phải component dùng chung — nhưng vẫn
// nằm ngoài phạm vi lần đổi UI này (ưu tiên khung trang + bảng chính trước).
const EXPORT_TYPE_LABEL: Record<string, string> = {
  sale: 'Bán hàng', internal: 'Xuất nội bộ', demo_out: 'Cho mượn demo',
  warranty_out: 'Gửi bảo hành', return_out: 'Trả NCC', dispose: 'Huỷ hàng', adjustment: 'Điều chỉnh',
}

// Luôn wrap xuống dòng (không cắt 1 dòng + title tooltip) — field CHỈ ĐỌC, không phải input
// cần giữ chiều cao cố định.
function BBox({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div title={title} className="kv-input" style={{
      display: 'flex', alignItems: 'flex-start', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      height: 'auto', minHeight: 30, padding: '5px 9px', background: 'var(--bg-card)', color: 'var(--text-1)',
    }}>
      {children}
    </div>
  )
}
function Val({ v }: { v?: React.ReactNode }) {
  return v != null && v !== '' ? <>{v}</> : <span style={{ color: 'var(--text-3)' }}>—</span>
}

interface AvailableSN {
  id: string; serial_no: string; receipt_code: string | null; received_at: string | null
  cost_price: number | null; manufacturer_warranty_months: number | null; customer_warranty_months: number | null
  manufacturer_warranty_end: string | null; customer_warranty_end: string | null; mac_address: string | null; po_code: string | null
}

function WarehouseBreakdown({ variantId, productType }: { variantId: string; productType: string }) {
  const { data } = useQuery({
    queryKey: ['inventory', 'by-variant', variantId],
    queryFn: async () => (await api.get('/inventory/by-variant', { params: { limit: 100 } })).data,
    enabled: productType !== 'service',
  })
  if (productType === 'service') return <span className="kv-muted" style={{ fontSize: 12 }}>Dịch vụ</span>
  const row = data?.data?.find((r: any) => r.variant_id === variantId)
  const breakdown: { name: string; qty: number }[] = row?.warehouse_breakdown ?? []
  if (!breakdown.length) return <span style={{ color: 'var(--s-cancelled-color)', fontSize: 12 }}>Hết hàng</span>
  return (
    <span style={{ fontSize: 12 }}>
      {breakdown.map((w) => (
        <span key={w.name} style={{ marginRight: 8, whiteSpace: 'nowrap' }}>
          {w.name}<span className="kv-muted" style={{ marginLeft: 2 }}>({w.qty})</span>
        </span>
      ))}
    </span>
  )
}

function SNPickerTable({ lineId, quantity, sns, loading, selected, onSelect }: {
  lineId: string; quantity: number; sns: AvailableSN[]; loading: boolean; selected: string[]; onSelect: (k: string[]) => void
}) {
  const [filter, setFilter] = useState('')
  const filtered = filter
    ? sns.filter((s) => [s.serial_no, s.receipt_code, s.po_code, s.mac_address].some((v) => v?.toLowerCase().includes(filter.toLowerCase())))
    : sns
  const selectedSet = new Set(selected)
  const remaining = quantity - selected.length

  const rowSelection: TableRowSelection<AvailableSN> = {
    selectedRowKeys: selected,
    onChange: (keys) => onSelect(keys as string[]),
    getCheckboxProps: (record) => ({ disabled: remaining <= 0 && !selectedSet.has(record.serial_no) }),
    columnWidth: 40,
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <Input.Search placeholder="Lọc SN, lô, PO, MAC..." allowClear size="small" style={{ width: 240 }}
          onChange={(e) => setFilter(e.target.value)} />
        <AntButton size="small" disabled={!sns.length} onClick={() => onSelect(sns.slice(0, quantity).map((s) => s.serial_no))}>Auto FIFO</AntButton>
        <AntButton size="small" disabled={!sns.length} onClick={() => onSelect([...sns].reverse().slice(0, quantity).map((s) => s.serial_no))}>Auto LIFO</AntButton>
        {selected.length > 0 && <AntButton size="small" danger onClick={() => onSelect([])}>Xóa hết</AntButton>}
        <span style={{ fontSize: 13, color: remaining <= 0 ? 'var(--s-completed-color)' : '#ff4d4f' }}>
          {selected.length}/{quantity} SN đã chọn
        </span>
      </div>
      <Table<AvailableSN>
        rowKey="serial_no" size="small" loading={loading} dataSource={filtered}
        rowSelection={rowSelection} pagination={false} scroll={{ y: 220 }}
        columns={[
          { title: 'Serial No', dataIndex: 'serial_no', width: 160, ellipsis: true },
          { title: 'Lô nhập', dataIndex: 'receipt_code', width: 120, render: (v: string | null) => v ?? '—' },
          { title: 'PO', dataIndex: 'po_code', width: 100, render: (v: string | null) => v ?? '—' },
          { title: 'Giá vốn', dataIndex: 'cost_price', width: 110, render: (v: number | null) => v != null ? v.toLocaleString('en-US') + ' ₫' : '—' },
          { title: 'BH hãng', dataIndex: 'manufacturer_warranty_months', width: 75, render: (v: number | null) => v != null ? `${v}T` : '—' },
          { title: 'BH cty', dataIndex: 'customer_warranty_months', width: 70, render: (v: number | null) => v != null ? `${v}T` : '—' },
          { title: 'MAC', dataIndex: 'mac_address', width: 130, ellipsis: true, render: (v: string | null) => v ?? '—' },
        ]}
      />
    </div>
  )
}

export default function DeliveryOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const hook = useDeliveryOrderDetail(id!)
  const [noteForm] = Form.useForm()
  const [editingNote, setEditingNote] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)

  const d = hook.data

  if (hook.isLoading || !d) return null

  const isDraft = d.status === 'draft'
  const isClosed = ['completed', 'cancelled'].includes(d.status ?? '')
  const storableLines = (d.lines as any[]).filter((l) => l.product_type === 'storable')

  function startEditNote() {
    noteForm.setFieldsValue({ note: d.note })
    setEditingNote(true)
  }
  function saveNote() {
    hook.updateMutation.mutate(noteForm.getFieldsValue())
    setEditingNote(false)
  }

  return (
    <div className="theme-2a -m-6 flex flex-col gap-4 bg-background p-6">

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Huỷ phiếu này?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Đóng</AlertDialogCancel>
            <AlertDialogAction
              variant="danger"
              onClick={() => { hook.cancelMutation.mutate(); setCancelOpen(false) }}
            >
              Huỷ phiếu
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header — port .kv-head.kv-head--divided/.kv-crumb/.kv-title--sm nguyên bản */}
      <div className="kv-head kv-head--divided">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button type="button" className="kv-btn kv-btn--ghost" onClick={() => navigate(-1)} style={{ padding: 0, width: 30, flexShrink: 0 }} aria-label="Quay lại">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="kv-crumb">
              <button onClick={() => navigate('/deliveries')} style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer' }}>
                Phiếu xuất kho
              </button>
              {' / '}{d.code}
            </div>
            <h1 className="kv-title kv-title--sm" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="mono">{d.code}</span>
              <StatusBadge status={d.status} />
            </h1>
          </div>
        </div>
        <div className="kv-actions">
          {isDraft && (
            <button type="button" className="kv-btn kv-btn--primary" onClick={hook.openComplete}>Complete</button>
          )}
          {!isClosed && (
            <button type="button" className="kv-btn kv-btn--danger" onClick={() => setCancelOpen(true)} disabled={hook.cancelMutation.isPending}>
              Huỷ
            </button>
          )}
        </div>
      </div>

      {/* Thông tin chung — port .kv-form-grid/.kv-group-label/.kv-field nguyên bản */}
      <div className="kv-form-grid">
        <div className="kv-group-label">Thông tin chung</div>
        <div className="kv-group-body kv-stack" style={{ maxWidth: 640 }}>
          <div className="kv-2col">
            <div className="kv-field"><label>Loại xuất</label><BBox><Val v={EXPORT_TYPE_LABEL[d.export_type] ?? d.export_type} /></BBox></div>
            <div className="kv-field"><label>Kho xuất</label><BBox><Val v={d.warehouse_name} /></BBox></div>
            <div className="kv-field"><label>Lý do</label><BBox><Val v={d.reason} /></BBox></div>
            <div className="kv-field">
              <label>Ngày tạo</label>
              <BBox><Val v={d.created_at ? new Date(d.created_at).toLocaleDateString('vi-VN') : undefined} /></BBox>
            </div>
          </div>
          <div className="kv-2col">
            <div className="kv-field"><label>Khách hàng / NCC</label><BBox title={d.company_name ?? ''}><Val v={d.company_name} /></BBox></div>
            <div className="kv-field"><label>Người liên hệ</label><BBox><Val v={d.contact_name} /></BBox></div>
          </div>
          <div className="kv-field">
            <label>Ghi chú</label>
            {editingNote ? (
              <Form form={noteForm}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <Form.Item name="note" noStyle>
                    <textarea className="kv-input" rows={2} autoFocus style={{ flex: 1, resize: 'vertical' }} />
                  </Form.Item>
                  <button type="button" className="kv-btn kv-btn--primary kv-btn--sm" onClick={saveNote} disabled={hook.updateMutation.isPending}>Lưu</button>
                  <button type="button" className="kv-btn kv-btn--sm" onClick={() => setEditingNote(false)}>Huỷ</button>
                </div>
              </Form>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <BBox><Val v={d.note} /></BBox>
                {isDraft && <button type="button" className="kv-btn kv-btn--ghost kv-btn--sm" onClick={startEditNote} style={{ flexShrink: 0 }}>Sửa</button>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Danh sách sản phẩm — port .kv-section-head/.kv-table nguyên bản */}
      <div className="kv-section-head">
        <div>
          <div className="kv-eyebrow">Dòng hàng</div>
          <h2 className="kv-section-title">Danh sách sản phẩm</h2>
        </div>
      </div>
      <LineItemsTable
        cols={[
          { key: 'no', label: '#', align: 'center', width: '5%', render: (_l, i) => <span className="kv-muted">{i + 1}</span> },
          { key: 'code', label: 'Mã hàng', width: '13%', render: (l) => <span className="mono truncate" title={l.item_code ?? ''}>{l.item_code}</span> },
          { key: 'name', label: 'Tên sản phẩm', render: (l) => <span className="truncate" title={l.variant_name ?? ''}>{l.variant_name}</span> },
          { key: 'type', label: 'Loại', width: '10%', render: (l) => l.product_type },
          { key: 'qty', label: 'SL', align: 'right', width: '9%', render: (l) => l.quantity },
          { key: 'wh', label: 'Tồn kho theo kho', width: '22%', render: (l) => <WarehouseBreakdown variantId={l.variant_id} productType={l.product_type} /> },
          { key: 'note', label: 'Ghi chú dòng', width: '16%', render: (l) => <span className="kv-muted truncate" title={l.note ?? ''}>{l.note || '—'}</span> },
        ]}
        rows={d.lines as any[]}
        rowKey={(l) => l.id}
        fixedLayout
        minWidth={900}
      />

      <div className="kv-section-head">
        <div>
          <div className="kv-eyebrow">Thông tin bổ sung</div>
          <h2 className="kv-section-title">Trường tùy chỉnh</h2>
        </div>
      </div>
      <CustomFieldsPanel objectType="delivery_order" objectId={id!} />

      <div className="kv-section-head">
        <div>
          <div className="kv-eyebrow">Nhật ký</div>
          <h2 className="kv-section-title">Lịch sử hoạt động</h2>
        </div>
      </div>
      <ActivityTimeline objectType="delivery_order" objectId={id!} />

      {/* Modal chọn Serial Number khi Complete — giữ nguyên AntD, xem ghi chú đầu file */}
      <Modal
        title="Complete — chọn Serial Number"
        open={hook.completeOpen}
        onCancel={() => hook.setCompleteOpen(false)}
        onOk={hook.submitComplete}
        okText="Xác nhận Complete"
        confirmLoading={hook.completeMutation.isPending}
        width={820}
      >
        {storableLines.length === 0 && (
          <p style={{ color: 'var(--text-2)' }}>Không có dòng Thiết bị — bấm OK để Complete.</p>
        )}
        {storableLines.map((l: any, idx: number) => (
          <div key={l.id}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{l.variant_name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 8 }}>Cần chọn {l.quantity} SN</div>
            <SNPickerTable
              lineId={l.id} quantity={l.quantity}
              sns={hook.lineSNs[l.id] ?? []} loading={hook.loadingSNs}
              selected={hook.selectedSNs[l.id] ?? []}
              onSelect={(keys) => hook.setSelectedSNs((prev) => ({ ...prev, [l.id]: keys }))}
            />
            {(hook.selectedSNs[l.id]?.length ?? 0) > 0 && (
              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {(hook.selectedSNs[l.id] ?? []).map((sn) => (
                  <Tag key={sn} closable
                    color={(hook.selectedSNs[l.id]?.length ?? 0) >= l.quantity ? 'success' : 'blue'}
                    onClose={() => hook.setSelectedSNs((prev) => ({ ...prev, [l.id]: prev[l.id].filter((s) => s !== sn) }))}>
                    {sn}
                  </Tag>
                ))}
              </div>
            )}
            {idx < storableLines.length - 1 && <Divider style={{ margin: '16px 0' }} />}
          </div>
        ))}
      </Modal>
    </div>
  )
}
