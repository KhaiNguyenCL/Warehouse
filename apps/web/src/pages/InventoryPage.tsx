import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Table, Input, Select, Space, Tag, Button, Form, Modal, Drawer, Descriptions, Divider, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useInventory } from '../hooks/useInventory'
import { PageHeader } from '../components/PageHeader'
import { StatusTag } from '../components/StatusTag'

const SN_STATUS_COLOR: Record<string, string> = { active: 'blue', sold: 'default', disposed: 'red' }
const SN_STATUS_LABEL: Record<string, string> = { active: 'Trong kho', sold: 'Đã bán', disposed: 'Đã huỷ' }

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

// Drawer chi tiết 1 SN: thông tin + lịch sử di chuyển + nút sửa
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

  useEffect(() => {
    if (sn && editOpen) {
      form.setFieldsValue({
        serial_no: sn.serial_no,
        mac_address: sn.mac_address ?? '',
        note: sn.note ?? '',
      })
    }
  }, [sn, editOpen, form])

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
              <StatusTag status={sn.status} colorMap={SN_STATUS_COLOR} labelMap={SN_STATUS_LABEL} />
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
              <Form form={form} layout="vertical">
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

// Flat SN list của 1 variant — click dòng để mở drawer chi tiết
function SnTable({ variantId }: { variantId: string }) {
  const queryKey = ['inventory', 'serials', 'variant', variantId]
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => (await api.get('/inventory/serials', { params: { variant_id: variantId } })).data,
  })
  const [selected, setSelected] = useState<any>(null)

  return (
    <>
      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={data}
        pagination={false}
        size="small"
        locale={{ emptyText: 'Không có serial nào' }}
        onRow={(r) => ({ onClick: () => setSelected(r), style: { cursor: 'pointer' } })}
        columns={[
          { title: 'Serial No', dataIndex: 'serial_no', width: 180 },
          {
            title: 'Trạng thái',
            dataIndex: 'status',
            width: 100,
            render: (s: string) => <StatusTag status={s} colorMap={SN_STATUS_COLOR} labelMap={SN_STATUS_LABEL} />,
          },
          { title: 'Kho', dataIndex: 'warehouse_name', width: 160 },
          {
            title: 'MAC',
            dataIndex: 'mac_address',
            width: 160,
            render: (v: string | null) => v ?? <span style={{ color: '#bbb' }}>—</span>,
          },
          {
            title: 'Phiếu nhập · Ngày',
            render: (_: any, r: any) => (
              <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
                {fmtReceipt(r.receipt_code, r.completed_at)}
              </span>
            ),
          },
          { title: 'Hết BH hãng', dataIndex: 'manufacturer_warranty_end', width: 120, render: fmt },
          { title: 'Hết BH cty', dataIndex: 'customer_warranty_end', width: 120, render: fmt },
        ]}
      />
      <SnDetailDrawer sn={selected} onClose={() => setSelected(null)} listQueryKey={queryKey} />
    </>
  )
}

// Tra ngược trực tiếp theo serial_no
function SnSearchTable({ search }: { search: string }) {
  const queryKey = ['inventory', 'serials', 'search', search]
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => (await api.get('/inventory/serials', { params: { search } })).data,
  })
  const [selected, setSelected] = useState<any>(null)

  return (
    <>
      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={data}
        pagination={false}
        locale={{ emptyText: 'Không tìm thấy Serial No nào khớp' }}
        onRow={(r) => ({ onClick: () => setSelected(r), style: { cursor: 'pointer' } })}
        columns={[
          { title: 'Serial No', dataIndex: 'serial_no' },
          { title: 'SKU', dataIndex: 'sku' },
          { title: 'Tên SP', dataIndex: 'variant_name' },
          {
            title: 'Trạng thái',
            dataIndex: 'status',
            render: (s: string) => <StatusTag status={s} colorMap={SN_STATUS_COLOR} labelMap={SN_STATUS_LABEL} />,
          },
          { title: 'Kho', dataIndex: 'warehouse_name' },
          {
            title: 'Phiếu nhập · Ngày',
            render: (_: any, r: any) => (
              <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
                {fmtReceipt(r.receipt_code, r.completed_at)}
              </span>
            ),
          },
          { title: 'MAC', dataIndex: 'mac_address' },
          { title: 'Hết BH hãng', dataIndex: 'manufacturer_warranty_end', render: fmt },
          { title: 'Hết BH cty', dataIndex: 'customer_warranty_end', render: fmt },
        ]}
      />
      <SnDetailDrawer sn={selected} onClose={() => setSelected(null)} listQueryKey={queryKey} />
    </>
  )
}

export default function InventoryPage() {
  const hook = useInventory()

  return (
    <div>
      <PageHeader title="Tồn kho" />

      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder="Tìm theo SKU hoặc tên sản phẩm"
          allowClear
          style={{ width: 280 }}
          value={hook.searchInput}
          onChange={(e) => hook.setSearchInput(e.target.value)}
        />
        <Select
          allowClear
          placeholder="Tất cả kho"
          style={{ width: 220 }}
          options={hook.warehouses?.map((w: any) => ({ value: w.id, label: w.name }))}
          onChange={hook.setWarehouseId}
        />
        <Input
          placeholder="Tra SN (không cần biết trước SKU/kho)"
          allowClear
          style={{ width: 300 }}
          value={hook.snSearchInput}
          onChange={(e) => hook.setSnSearchInput(e.target.value)}
        />
      </Space>

      {hook.snSearch ? (
        <SnSearchTable search={hook.snSearch} />
      ) : (
        <Table
          rowKey="variant_id"
          loading={hook.isLoading}
          dataSource={hook.data?.data}
          pagination={false}
          columns={[
            { title: 'SKU', dataIndex: 'sku', width: 160 },
            { title: 'Tên sản phẩm', dataIndex: 'variant_name' },
            {
              title: 'Tồn kho',
              dataIndex: 'qty_on_hand',
              width: 110,
              align: 'right' as const,
              render: (v: number, r: any) => `${v}${r.unit ? ' ' + r.unit : ''}`,
            },
            {
              title: 'Đang giữ',
              dataIndex: 'qty_reserved',
              width: 110,
              align: 'right' as const,
              render: (v: number, r: any) => v ? `${v}${r.unit ? ' ' + r.unit : ''}` : '—',
            },
            {
              title: 'Khả dụng',
              dataIndex: 'qty_available',
              width: 110,
              align: 'right' as const,
              render: (v: number, r: any) => (
                <strong style={{ color: v > 0 ? '#52c41a' : '#ff4d4f' }}>
                  {v}{r.unit ? ' ' + r.unit : ''}
                </strong>
              ),
            },
            {
              title: 'Kho',
              dataIndex: 'warehouse_breakdown',
              render: (wh: { name: string; qty: number }[] | null) => {
                if (!wh?.length) return '—'
                return wh.map((w) => (
                  <span key={w.name} style={{ marginRight: 8, whiteSpace: 'nowrap' }}>
                    {w.name}
                    <span style={{ color: '#888', fontSize: 11, marginLeft: 3 }}>({w.qty})</span>
                  </span>
                ))
              },
            },
            {
              title: 'Giá vốn TB',
              dataIndex: 'avg_cost',
              width: 130,
              align: 'right' as const,
              render: (v: number) => (v ? Number(v).toLocaleString('vi-VN') + ' ₫' : '—'),
            },
          ]}
          expandable={{
            expandedRowRender: (r: any) => <SnTable variantId={r.variant_id} />,
            rowExpandable: (r: any) => r.product_type === 'storable',
          }}
        />
      )}
    </div>
  )
}
