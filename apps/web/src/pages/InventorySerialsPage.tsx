import { useState, useCallback } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Table, Tag, Button, Drawer, Descriptions, Divider, Form, Input, message } from 'antd'
import type { ColumnType } from 'antd/es/table'
import { Resizable } from 'react-resizable'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { Search } from 'lucide-react'
import { api } from '../lib/api'
import { PageHeader } from '../components/ui/PageHeader'
import { TableCard } from '../components/ui/TableCard'
import { StatusBadge } from '../components/ui/StatusBadge'
import { Input as ShadInput } from '@/components/ui/input'

const REF_DOCUMENT_PATH: Record<string, string> = {
  receipt: '/receipts',
  delivery_order: '/deliveries',
  transfer_order: '/transfers',
}
const REF_DOCUMENT_LABEL: Record<string, string> = {
  receipt: 'Phiếu nhập',
  delivery_order: 'Phiếu xuất',
  transfer_order: 'Phiếu chuyển',
}

function fmt(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('vi-VN')
}

// Resizable column header wrapper for Ant Design Table
function ResizableTitle(props: any) {
  const { onResize, width, ...restProps } = props
  if (!width) return <th {...restProps} />
  return (
    <Resizable
      width={width}
      height={0}
      handle={
        <span
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
            zIndex: 1, width: 4, height: '60%', cursor: 'col-resize',
            borderRight: '2px solid var(--border)',
          }}
        />
      }
      onResize={onResize}
      draggableOpts={{ enableUserSelectHack: false }}
    >
      <th {...restProps} style={{ ...restProps.style, position: 'relative' }} />
    </Resizable>
  )
}

function useResizableColumns<T>(initialCols: ColumnType<T>[]) {
  const [cols, setCols] = useState(initialCols)
  const handleResize = useCallback(
    (index: number) => (_: any, { size }: { size: { width: number } }) => {
      setCols((prev) => {
        const next = [...prev]
        next[index] = { ...next[index], width: size.width }
        return next
      })
    },
    [],
  )
  const mergedCols = cols.map((col, i) => ({
    ...col,
    onHeaderCell: (column: ColumnType<T>) => ({
      width: column.width,
      onResize: handleResize(i),
    }),
  }))
  return mergedCols
}

function fmtReceipt(code: string | null, completedAt: string | null) {
  if (!code) return '—'
  if (!completedAt) return code
  return `${code} · ${fmt(completedAt)}`
}

function SnDetailDrawer({
  sn,
  onClose,
  listQueryKey,
}: {
  sn: any | null
  onClose: () => void
  listQueryKey: unknown[]
}) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)

  const { data: movements, isLoading: movLoading } = useQuery({
    queryKey: ['inventory', 'serials', sn?.id, 'movements'],
    queryFn: async () => (await api.get(`/inventory/serials/${sn!.id}/movements`)).data,
    enabled: !!sn,
  })

  async function onSave() {
    const values = form.getFieldsValue()
    setSaving(true)
    try {
      await api.patch(`/inventory/serials/${sn!.id}`, {
        serial_no:   values.serial_no,
        mac_address: values.mac_address || null,
        note:        values.note || null,
      })
      message.success('Đã cập nhật')
      qc.invalidateQueries({ queryKey: listQueryKey })
      setEditOpen(false)
      onClose()
    } catch {
      message.error('Lưu thất bại')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      title={sn?.serial_no ?? ''}
      open={!!sn}
      onClose={() => { setEditOpen(false); onClose() }}
      width={520}
      extra={<Button onClick={() => setEditOpen((v) => !v)}>{editOpen ? 'Huỷ sửa' : 'Sửa'}</Button>}
    >
      {sn && (
        <>
          <div style={{ paddingLeft: 8 }}>
            {[
              { label: 'Trạng thái', value: <StatusBadge status={sn.status} /> },
              { label: 'Kho', value: sn.warehouse_name ?? '—' },
              { label: 'MAC', value: sn.mac_address ?? '—' },
              { label: 'Phiếu nhập · Ngày', value: <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{fmtReceipt(sn.receipt_code, sn.completed_at)}</span> },
              { label: 'BH hãng', value: sn.manufacturer_warranty_months == null ? '—' : sn.manufacturer_warranty_months === 0 ? 'Không BH' : `${sn.manufacturer_warranty_months} tháng` },
              { label: 'BH công ty', value: sn.customer_warranty_months == null ? '—' : sn.customer_warranty_months === 0 ? 'Không BH' : `${sn.customer_warranty_months} tháng` },
              { label: 'Hết BH hãng', value: fmt(sn.manufacturer_warranty_end) },
              { label: 'Hết BH cty', value: fmt(sn.customer_warranty_end) },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', padding: '6px 0' }}>
                <div style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>{label}</div>
                <div style={{ fontSize: 13 }}>{value}</div>
              </div>
            ))}
          </div>

          {editOpen && (
            <>
              <Divider />
              <Form
                form={form}
                layout="vertical"
                initialValues={{ serial_no: sn.serial_no, mac_address: sn.mac_address ?? '', note: sn.note ?? '' }}
              >
                <Form.Item name="serial_no" label="Serial No" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
                <Form.Item name="mac_address" label="MAC Address">
                  <Input placeholder="AA:BB:CC:DD:EE:FF" allowClear />
                </Form.Item>
                <Form.Item name="note" label="Ghi chú">
                  <Input.TextArea rows={2} allowClear />
                </Form.Item>
                <Button type="primary" loading={saving} onClick={onSave}>Lưu</Button>
              </Form>
            </>
          )}

          <Divider>Lịch sử di chuyển</Divider>
          <Table
            rowKey="id"
            loading={movLoading}
            dataSource={movements}
            pagination={false}
            size="small"
            locale={{ emptyText: 'Chưa có lịch sử' }}
            columns={[
              {
                title: 'Loại',
                dataIndex: 'movement_type',
                width: 60,
                render: (v: string) => (
                  <Tag color={v === 'in' ? 'green' : 'red'}>{v === 'in' ? 'Nhập' : 'Xuất'}</Tag>
                ),
              },
              { title: 'Kho', dataIndex: 'warehouse_name' },
              { title: 'Thời gian', dataIndex: 'created_at', render: (d) => new Date(d).toLocaleString('vi-VN') },
              {
                title: 'Phiếu',
                render: (_: any, r: any) =>
                  REF_DOCUMENT_PATH[r.ref_document_type] ? (
                    <a onClick={() => navigate(`${REF_DOCUMENT_PATH[r.ref_document_type]}/${r.ref_document_id}`)}>
                      {REF_DOCUMENT_LABEL[r.ref_document_type]}
                    </a>
                  ) : '—',
              },
            ]}
          />
        </>
      )}
    </Drawer>
  )
}

const INITIAL_COLS: ColumnType<any>[] = [
  { title: '#', width: 52, align: 'center', render: (_: any, __: any, i: number) => i + 1 },
  { title: 'Serial No', dataIndex: 'serial_no', width: 200 },
  { title: 'Trạng thái', dataIndex: 'status', width: 110, render: (s: string) => <StatusBadge status={s} /> },
  { title: 'Kho', dataIndex: 'warehouse_name', width: 180 },
  { title: 'MAC', dataIndex: 'mac_address', width: 160, render: (v: string | null) => v ?? <span style={{ color: 'var(--text-3)' }}>—</span> },
  {
    title: 'Phiếu nhập · Ngày',
    width: 200,
    render: (_: any, r: any) => (
      <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
        {fmtReceipt(r.receipt_code, r.completed_at)}
      </span>
    ),
  },
  {
    title: 'BH hãng',
    dataIndex: 'manufacturer_warranty_months',
    width: 100,
    align: 'center',
    render: (v: number | null) =>
      v == null ? <span style={{ color: 'var(--text-3)' }}>—</span>
        : v === 0 ? <span style={{ color: 'var(--text-3)' }}>Không BH</span>
        : `${v} tháng`,
  },
  {
    title: 'BH công ty',
    dataIndex: 'customer_warranty_months',
    width: 100,
    align: 'center',
    render: (v: number | null) =>
      v == null ? <span style={{ color: 'var(--text-3)' }}>—</span>
        : v === 0 ? <span style={{ color: 'var(--text-3)' }}>Không BH</span>
        : `${v} tháng`,
  },
  { title: 'Hết BH hãng', dataIndex: 'manufacturer_warranty_end', width: 120, render: fmt },
  { title: 'Hết BH cty',  dataIndex: 'customer_warranty_end',      width: 120, render: fmt },
]

export default function InventorySerialsPage() {
  const { variantId } = useParams<{ variantId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [selected, setSelected] = useState<any>(null)
  const [snFilter, setSnFilter] = useState('')

  const itemCode = searchParams.get('code') ?? ''
  const variantName = searchParams.get('name') ?? ''

  const queryKey = ['inventory', 'serials', 'variant', variantId]
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => (await api.get('/inventory/serials', { params: { variant_id: variantId } })).data,
    enabled: !!variantId,
  })

  const filteredData = snFilter.trim()
    ? (data ?? []).filter((r: any) =>
        r.serial_no?.toLowerCase().includes(snFilter.toLowerCase()) ||
        r.mac_address?.toLowerCase().includes(snFilter.toLowerCase()),
      )
    : data

  const columns = useResizableColumns(INITIAL_COLS)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader
        title={
          <span>
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/inventory')}
              style={{ marginRight: 8, padding: '0 4px' }}
            />
            Serial Numbers — {itemCode}{variantName ? ` · ${variantName}` : ''}
          </span>
        }
        meta={data ? `${data.length} serial` : undefined}
        actions={
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <ShadInput
              placeholder="Tìm serial / MAC…"
              value={snFilter}
              onChange={(e) => setSnFilter(e.target.value)}
              className="h-9 w-56 pl-9 text-sm shadow-none focus-visible:ring-1"
            />
          </div>
        }
      />

      <TableCard>
        <Table
          rowKey="id"
          size="small"
          tableLayout="fixed"
          loading={isLoading}
          dataSource={filteredData}
          components={{ header: { cell: ResizableTitle } }}
          pagination={{ pageSize: 50, showSizeChanger: false, hideOnSinglePage: true, showTotal: (t, [from, to]) => `${from}–${to} / ${t}` }}
          locale={{ emptyText: 'Không có serial nào' }}
          onRow={(r) => ({ onClick: () => setSelected(r), style: { cursor: 'pointer' } })}
          columns={columns}
        />
      </TableCard>

      <SnDetailDrawer sn={selected} onClose={() => setSelected(null)} listQueryKey={queryKey} />
    </div>
  )
}
