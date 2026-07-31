import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Table, Button, Popconfirm, Modal, Input, Tag, Divider, Form } from 'antd'
import type { TableRowSelection } from 'antd/es/table/interface'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useDeliveryOrderDetail } from '../hooks/useDeliveryOrderDetail'
import { PageHeader } from '../components/ui/PageHeader'
import { StatusBadge } from '../components/ui/StatusBadge'
import CustomFieldsPanel from '../components/CustomFieldsPanel'
import { api } from '../lib/api'

const EXPORT_TYPE_LABEL: Record<string, string> = {
  sale: 'Bán hàng', internal: 'Xuất nội bộ', demo_out: 'Cho mượn demo',
  warranty_out: 'Gửi bảo hành', return_out: 'Trả NCC', dispose: 'Huỷ hàng', adjustment: 'Điều chỉnh',
}

function SectionCard({ title, extra, children }: { title: string; extra?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>{title}</span>
        {extra}
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  )
}

const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'var(--text-2)', marginBottom: 4 }
const valueStyle: React.CSSProperties = { fontSize: 14, color: 'var(--text-1)', minHeight: 28, display: 'flex', alignItems: 'center' }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><div style={labelStyle}>{label}</div><div style={valueStyle}>{children}</div></div>
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
  if (productType === 'service') return <span style={{ color: 'var(--text-3)', fontSize: 12 }}>Dịch vụ</span>
  const row = data?.data?.find((r: any) => r.variant_id === variantId)
  const breakdown: { name: string; qty: number }[] = row?.warehouse_breakdown ?? []
  if (!breakdown.length) return <span style={{ color: '#ff4d4f', fontSize: 12 }}>Hết hàng</span>
  return (
    <span style={{ fontSize: 12 }}>
      {breakdown.map((w) => (
        <span key={w.name} style={{ marginRight: 8, whiteSpace: 'nowrap' }}>
          {w.name}<span style={{ color: 'var(--text-3)', marginLeft: 2 }}>({w.qty})</span>
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
        <Button size="small" disabled={!sns.length} onClick={() => onSelect(sns.slice(0, quantity).map((s) => s.serial_no))}>Auto FIFO</Button>
        <Button size="small" disabled={!sns.length} onClick={() => onSelect([...sns].reverse().slice(0, quantity).map((s) => s.serial_no))}>Auto LIFO</Button>
        {selected.length > 0 && <Button size="small" danger onClick={() => onSelect([])}>Xóa hết</Button>}
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
  const hook = useDeliveryOrderDetail(id!)
  const [noteForm] = Form.useForm()
  const [editingNote, setEditingNote] = useState(false)

  if (hook.isLoading || !hook.data) return null

  const d = hook.data
  const isDraft = d.status === 'draft'
  const isClosed = ['completed', 'cancelled'].includes(d.status)
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
    <div style={{ padding: '10px 20px 40px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <PageHeader
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {d.code}
            <StatusBadge status={d.status} />
          </span>
        }
        meta={
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => window.history.back()} style={{ padding: '0 4px' }}>
            Phiếu xuất kho
          </Button>
        }
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            {isDraft && (
              <Button type="primary" onClick={hook.openComplete}>Complete</Button>
            )}
            {!isClosed && (
              <Popconfirm title="Huỷ phiếu này?" onConfirm={() => hook.cancelMutation.mutate()}>
                <Button danger loading={hook.cancelMutation.isPending}>Huỷ</Button>
              </Popconfirm>
            )}
          </div>
        }
      />

      <SectionCard title="Thông tin chung">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px 28px' }}>
          <Field label="Loại xuất"><Val v={EXPORT_TYPE_LABEL[d.export_type] ?? d.export_type} /></Field>
          <Field label="Kho xuất"><Val v={d.warehouse_name} /></Field>
          <Field label="Khách hàng / NCC"><Val v={d.company_name} /></Field>
          <Field label="Người liên hệ"><Val v={d.contact_name} /></Field>
          <Field label="Lý do"><Val v={d.reason} /></Field>
          <Field label="Ngày tạo">
            <Val v={d.created_at ? new Date(d.created_at).toLocaleDateString('vi-VN') : undefined} />
          </Field>
          <Field label="Ghi chú">
            {editingNote ? (
              <Form form={noteForm} style={{ width: '100%' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', width: '100%' }}>
                  <Form.Item name="note" noStyle>
                    <Input.TextArea rows={2} autoFocus style={{ flex: 1 }} />
                  </Form.Item>
                  <Button size="small" type="primary" onClick={saveNote} loading={hook.updateMutation.isPending}>Lưu</Button>
                  <Button size="small" onClick={() => setEditingNote(false)}>Huỷ</Button>
                </div>
              </Form>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                <Val v={d.note} />
                {isDraft && <Button type="link" size="small" onClick={startEditNote} style={{ padding: 0, height: 'auto' }}>Sửa</Button>}
              </div>
            )}
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Danh sách sản phẩm">
        <Table
          rowKey="id"
          size="small"
          dataSource={d.lines}
          pagination={false}
          scroll={{ x: 'max-content' }}
          columns={[
            { title: 'STT', width: 52, align: 'center' as const, render: (_: any, __: any, i: number) => i + 1 },
            { title: 'Mã hàng', dataIndex: 'item_code', width: 130 },
            { title: 'Tên sản phẩm', dataIndex: 'variant_name' },
            { title: 'Loại', dataIndex: 'product_type', width: 90 },
            { title: 'Số lượng', dataIndex: 'quantity', width: 80, align: 'right' as const },
            {
              title: 'Tồn kho theo kho',
              render: (_: any, r: any) => <WarehouseBreakdown variantId={r.variant_id} productType={r.product_type} />,
            },
            { title: 'Ghi chú dòng', dataIndex: 'note', render: (v: string) => v || '—' },
          ]}
        />
      </SectionCard>

      <CustomFieldsPanel objectType="delivery_order" objectId={id!} />

      {/* Modal chọn Serial Number khi Complete */}
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
          <p style={{ color: 'var(--text-2)' }}>Không có dòng storable — bấm OK để Complete.</p>
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
