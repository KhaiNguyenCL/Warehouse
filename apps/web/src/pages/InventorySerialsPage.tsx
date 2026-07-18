import { useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Table, Tag, Button, Drawer, Descriptions, Divider, Form, Input, message } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { api } from '../lib/api'
import { PageHeader } from '../components/ui/PageHeader'
import { TableCard } from '../components/ui/TableCard'
import { StatusBadge } from '../components/ui/StatusBadge'

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
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="Trạng thái">
              <StatusBadge status={sn.status} />
            </Descriptions.Item>
            <Descriptions.Item label="Kho">{sn.warehouse_name ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="MAC">{sn.mac_address ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Phiếu nhập · Ngày">
              <span style={{ fontFamily: 'monospace' }}>{fmtReceipt(sn.receipt_code, sn.completed_at)}</span>
            </Descriptions.Item>
            <Descriptions.Item label="Hết BH hãng">{fmt(sn.manufacturer_warranty_end)}</Descriptions.Item>
            <Descriptions.Item label="Hết BH cty">{fmt(sn.customer_warranty_end)}</Descriptions.Item>
          </Descriptions>

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

export default function InventorySerialsPage() {
  const { variantId } = useParams<{ variantId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [selected, setSelected] = useState<any>(null)

  const itemCode = searchParams.get('code') ?? ''
  const variantName = searchParams.get('name') ?? ''

  const queryKey = ['inventory', 'serials', 'variant', variantId]
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => (await api.get('/inventory/serials', { params: { variant_id: variantId } })).data,
    enabled: !!variantId,
  })

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
      />

      <TableCard>
        <Table
          rowKey="id"
          loading={isLoading}
          dataSource={data}
          pagination={{ pageSize: 20, showSizeChanger: false, hideOnSinglePage: true, showTotal: (t) => `Tổng ${t}` }}
          locale={{ emptyText: 'Không có serial nào' }}
          onRow={(r) => ({ onClick: () => setSelected(r), style: { cursor: 'pointer' } })}
          columns={[
            { title: 'STT', width: 52, align: 'center' as const, render: (_: any, __: any, i: number) => i + 1 },
            { title: 'Serial No', dataIndex: 'serial_no', width: 200 },
            {
              title: 'Trạng thái',
              dataIndex: 'status',
              width: 110,
              render: (s: string) => <StatusBadge status={s} />,
            },
            { title: 'Kho', dataIndex: 'warehouse_name', width: 180 },
            {
              title: 'MAC',
              dataIndex: 'mac_address',
              width: 160,
              render: (v: string | null) => v ?? <span style={{ color: 'var(--text-3)' }}>—</span>,
            },
            {
              title: 'Phiếu nhập · Ngày',
              render: (_: any, r: any) => (
                <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
                  {fmtReceipt(r.receipt_code, r.completed_at)}
                </span>
              ),
            },
            {
              title: 'Hết BH hãng',
              dataIndex: 'manufacturer_warranty_end',
              width: 120,
              render: fmt,
            },
            {
              title: 'Hết BH cty',
              dataIndex: 'customer_warranty_end',
              width: 120,
              render: fmt,
            },
          ]}
        />
      </TableCard>

      <SnDetailDrawer sn={selected} onClose={() => setSelected(null)} listQueryKey={queryKey} />
    </div>
  )
}
