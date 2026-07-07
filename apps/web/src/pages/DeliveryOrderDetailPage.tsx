import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Table, Button, Typography, Space, Popconfirm, Modal, Input, Tag, Divider, Form } from 'antd'
import type { TableRowSelection } from 'antd/es/table/interface'
import { useDeliveryOrderDetail } from '../hooks/useDeliveryOrderDetail'
import { EntityFormModal } from '../components/EntityFormModal'
import { StatusTag } from '../components/StatusTag'
import CustomFieldsPanel from '../components/CustomFieldsPanel'

const STATUS_COLOR: Record<string, string> = {
  draft: 'default',
  pending_approval: 'gold',
  approved: 'blue',
  completed: 'green',
  cancelled: 'red',
}

interface AvailableSN {
  id: string
  serial_no: string
  receipt_code: string | null
  received_at: string | null
  cost_price: number | null
  manufacturer_warranty_months: number | null
  customer_warranty_months: number | null
  manufacturer_warranty_end: string | null
  customer_warranty_end: string | null
  mac_address: string | null
  po_code: string | null
}

// Bảng SN có thể filter + chọn checkbox cho 1 dòng storable
function SNPickerTable({
  lineId,
  quantity,
  sns,
  loading,
  selected,
  onSelect,
}: {
  lineId: string
  quantity: number
  sns: AvailableSN[]
  loading: boolean
  selected: string[]           // serial_no[]
  onSelect: (keys: string[]) => void
}) {
  const [filter, setFilter] = useState('')

  const filtered = filter
    ? sns.filter((s) =>
        [s.serial_no, s.receipt_code, s.po_code, s.mac_address, s.cost_price?.toString(), s.manufacturer_warranty_months?.toString(), s.customer_warranty_months?.toString()]
          .some((v) => v && v.toLowerCase().includes(filter.toLowerCase())),
      )
    : sns

  const selectedSet = new Set(selected)
  const remaining = quantity - selected.length

  const rowSelection: TableRowSelection<AvailableSN> = {
    selectedRowKeys: selected,
    onChange: (keys) => onSelect(keys as string[]),
    // Không cho chọn quá số lượng cần; nếu đã đủ thì disable các row chưa chọn
    getCheckboxProps: (record) => ({
      disabled: remaining <= 0 && !selectedSet.has(record.serial_no),
    }),
    columnWidth: 40,
  }

  return (
    <div>
      <Space style={{ marginBottom: 8, display: 'flex', flexWrap: 'wrap' }}>
        <Input.Search
          placeholder="Lọc theo SN, lô, PO, MAC, giá..."
          allowClear
          size="small"
          style={{ width: 240 }}
          onChange={(e) => setFilter(e.target.value)}
        />
        <Button
          size="small"
          disabled={sns.length === 0}
          onClick={() => {
            // FIFO: sns đã sort sẵn theo received_at asc — lấy đầu danh sách
            onSelect(sns.slice(0, quantity).map((s) => s.serial_no))
          }}
        >
          Auto FIFO
        </Button>
        <Button
          size="small"
          disabled={sns.length === 0}
          onClick={() => {
            // LIFO: đảo ngược thứ tự
            onSelect([...sns].reverse().slice(0, quantity).map((s) => s.serial_no))
          }}
        >
          Auto LIFO
        </Button>
        {selected.length > 0 && (
          <Button size="small" danger onClick={() => onSelect([])}>
            Xóa hết
          </Button>
        )}
        <Typography.Text type={remaining <= 0 ? 'success' : 'danger'} style={{ fontSize: 13 }}>
          {selected.length}/{quantity} SN đã chọn
        </Typography.Text>
      </Space>

      <Table<AvailableSN>
        rowKey="serial_no"
        size="small"
        loading={loading}
        dataSource={filtered}
        rowSelection={rowSelection}
        pagination={false}
        scroll={{ y: 220 }}
        columns={[
          { title: 'Serial No', dataIndex: 'serial_no', width: 160, ellipsis: true },
          {
            title: 'Lô nhập',
            dataIndex: 'receipt_code',
            width: 120,
            render: (v: string | null) => v ?? '—',
          },
          {
            title: 'PO',
            dataIndex: 'po_code',
            width: 100,
            render: (v: string | null) => v ?? '—',
          },
          {
            title: 'Giá vốn',
            dataIndex: 'cost_price',
            width: 110,
            render: (v: number | null) =>
              v != null ? v.toLocaleString('vi-VN') + ' ₫' : '—',
          },
          {
            title: 'BH hãng',
            dataIndex: 'manufacturer_warranty_months',
            width: 75,
            render: (v: number | null) => (v != null ? `${v}T` : '—'),
          },
          {
            title: 'BH cty',
            dataIndex: 'customer_warranty_months',
            width: 70,
            render: (v: number | null) => (v != null ? `${v}T` : '—'),
          },
          {
            title: 'MAC',
            dataIndex: 'mac_address',
            width: 130,
            ellipsis: true,
            render: (v: string | null) => v ?? '—',
          },
        ]}
      />
    </div>
  )
}

export default function DeliveryOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const hook = useDeliveryOrderDetail(id!)

  if (hook.isLoading || !hook.data) return null

  const storableLines = (hook.data.lines as any[]).filter((l) => l.product_type === 'storable')

  return (
    <div>
      <Typography.Title level={3}>
        Delivery Order {hook.data.code} <StatusTag status={hook.data.status} colorMap={STATUS_COLOR} />
      </Typography.Title>
      <p>
        Loại xuất: <strong>{hook.data.export_type}</strong> — Kho: <strong>{hook.data.warehouse_name}</strong>
        {hook.data.company_name && <> — Đối tác: <strong>{hook.data.company_name}</strong></>}
      </p>
      {hook.data.reason && <p>Lý do: {hook.data.reason}</p>}
      {hook.data.note && <p>Ghi chú: {hook.data.note}</p>}

      <Space style={{ marginBottom: 16 }}>
        {hook.data.status === 'draft' && (
          <Button onClick={() => hook.editModal.openEdit(hook.data, { note: hook.data.note })}>Sửa</Button>
        )}
        {hook.data.status === 'draft' && (
          <Button type="primary" onClick={() => hook.submitMutation.mutate()}>Submit</Button>
        )}
        {hook.data.status === 'pending_approval' && (
          <Button type="primary" onClick={() => hook.approveMutation.mutate()}>Approve</Button>
        )}
        {hook.data.status === 'approved' && (
          <Button type="primary" onClick={hook.openComplete}>Complete</Button>
        )}
        {!['completed', 'cancelled'].includes(hook.data.status) && (
          <Popconfirm title="Huỷ phiếu này?" onConfirm={() => hook.cancelMutation.mutate()}>
            <Button danger>Cancel</Button>
          </Popconfirm>
        )}
      </Space>

      <Table
        rowKey="id"
        dataSource={hook.data.lines}
        pagination={false}
        columns={[
          { title: 'SKU', dataIndex: 'sku' },
          { title: 'Tên', dataIndex: 'variant_name' },
          { title: 'Product type', dataIndex: 'product_type' },
          { title: 'Số lượng', dataIndex: 'quantity' },
          { title: 'Ghi chú', dataIndex: 'note' },
        ]}
      />

      <Modal
        title="Complete — chọn Serial Number"
        open={hook.completeOpen}
        onCancel={() => hook.setCompleteOpen(false)}
        onOk={hook.submitComplete}
        okText="Xác nhận Complete"
        confirmLoading={hook.completeMutation.isPending}
        width={780}
      >
        {storableLines.length === 0 && (
          <p>Không có dòng storable — không cần chọn serial, bấm OK để Complete.</p>
        )}

        {storableLines.map((l: any, idx: number) => (
          <div key={l.id}>
            <Typography.Text strong>{l.variant_name}</Typography.Text>
            <Typography.Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
              cần chọn {l.quantity} SN
            </Typography.Text>

            <div style={{ marginTop: 8 }}>
              <SNPickerTable
                lineId={l.id}
                quantity={l.quantity}
                sns={hook.lineSNs[l.id] ?? []}
                loading={hook.loadingSNs}
                selected={hook.selectedSNs[l.id] ?? []}
                onSelect={(keys) => hook.setSelectedSNs((prev) => ({ ...prev, [l.id]: keys }))}
              />
            </div>

            {/* Hiện SN đã chọn dưới dạng tags để dễ review trước khi submit */}
            {(hook.selectedSNs[l.id]?.length ?? 0) > 0 && (
              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {(hook.selectedSNs[l.id] ?? []).map((sn) => (
                  <Tag
                    key={sn}
                    closable
                    color={(hook.selectedSNs[l.id]?.length ?? 0) >= l.quantity ? 'success' : 'blue'}
                    onClose={() =>
                      hook.setSelectedSNs((prev) => ({
                        ...prev,
                        [l.id]: (prev[l.id] ?? []).filter((s) => s !== sn),
                      }))
                    }
                  >
                    {sn}
                  </Tag>
                ))}
              </div>
            )}

            {idx < storableLines.length - 1 && <Divider style={{ margin: '16px 0' }} />}
          </div>
        ))}
      </Modal>

      <EntityFormModal
        title="Sửa Delivery Order"
        open={hook.editModal.open}
        onCancel={hook.editModal.close}
        onFinish={(v) => hook.updateMutation.mutate(v)}
        confirmLoading={hook.updateMutation.isPending}
        form={hook.editModal.form}
      >
        <Form.Item name="note" label="Ghi chú">
          <Input.TextArea rows={3} />
        </Form.Item>
      </EntityFormModal>

      <CustomFieldsPanel objectType="delivery_order" objectId={id!} />
    </div>
  )
}
