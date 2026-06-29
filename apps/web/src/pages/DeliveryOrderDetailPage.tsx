import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Table, Button, Typography, Space, Popconfirm, Modal, Input, Tag, Divider } from 'antd'
import type { TableRowSelection } from 'antd/es/table/interface'
import { api } from '../lib/api'
import { useApiMutation } from '../hooks/useApiMutation'
import { StatusTag } from '../components/StatusTag'

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
  const [completeOpen, setCompleteOpen] = useState(false)
  // lineId → serial_no[] đã chọn
  const [selectedSNs, setSelectedSNs] = useState<Record<string, string[]>>({})
  // lineId → AvailableSN[] (fetch khi mở modal)
  const [lineSNs, setLineSNs] = useState<Record<string, AvailableSN[]>>({})
  const [loadingSNs, setLoadingSNs] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['deliveries', id],
    queryFn: async () => (await api.get(`/deliveries/${id}`)).data,
  })

  const actionOptions = {
    successMessage: 'Thành công',
    invalidateKey: [['deliveries', id], ['deliveries'], ['inventory']] as any,
  }
  const submitMutation   = useApiMutation(() => api.patch(`/deliveries/${id}/submit`), actionOptions)
  const approveMutation  = useApiMutation(() => api.patch(`/deliveries/${id}/approve`), actionOptions)
  const cancelMutation   = useApiMutation(() => api.patch(`/deliveries/${id}/cancel`), actionOptions)
  const completeMutation = useApiMutation((body: any) => api.patch(`/deliveries/${id}/complete`, body), {
    ...actionOptions,
    onSuccess: () => setCompleteOpen(false),
  })

  if (isLoading || !data) return null

  async function openComplete() {
    setCompleteOpen(true)
    setSelectedSNs({})
    setLoadingSNs(true)

    const storableLines = (data.lines as any[]).filter((l) => l.product_type === 'storable')
    const snMap: Record<string, AvailableSN[]> = {}

    await Promise.all(
      storableLines.map(async (line) => {
        try {
          const res = await api.get(
            `/inventory/serials?variant_id=${line.variant_id}&warehouse_id=${data.warehouse_id}`,
          )
          snMap[line.id] = res.data as AvailableSN[]
        } catch {
          snMap[line.id] = []
        }
      }),
    )

    setLineSNs(snMap)
    setLoadingSNs(false)
  }

  function submitComplete() {
    const lines = (data.lines as any[])
      .filter((l) => l.product_type === 'storable')
      .map((l) => ({ line_id: l.id, serials: selectedSNs[l.id] ?? [] }))
    completeMutation.mutate({ lines })
  }

  const storableLines = (data.lines as any[]).filter((l) => l.product_type === 'storable')

  return (
    <div>
      <Typography.Title level={3}>
        Delivery Order {data.code} <StatusTag status={data.status} colorMap={STATUS_COLOR} />
      </Typography.Title>
      <p>
        Loại xuất: <strong>{data.export_type}</strong> — Kho: <strong>{data.warehouse_name}</strong>
        {data.company_name && <> — Đối tác: <strong>{data.company_name}</strong></>}
      </p>
      {data.reason && <p>Lý do: {data.reason}</p>}
      {data.note && <p>Ghi chú: {data.note}</p>}

      <Space style={{ marginBottom: 16 }}>
        {data.status === 'draft' && (
          <Button type="primary" onClick={() => submitMutation.mutate()}>Submit</Button>
        )}
        {data.status === 'pending_approval' && (
          <Button type="primary" onClick={() => approveMutation.mutate()}>Approve</Button>
        )}
        {data.status === 'approved' && (
          <Button type="primary" onClick={openComplete}>Complete</Button>
        )}
        {!['completed', 'cancelled'].includes(data.status) && (
          <Popconfirm title="Huỷ phiếu này?" onConfirm={() => cancelMutation.mutate()}>
            <Button danger>Cancel</Button>
          </Popconfirm>
        )}
      </Space>

      <Table
        rowKey="id"
        dataSource={data.lines}
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
        open={completeOpen}
        onCancel={() => setCompleteOpen(false)}
        onOk={submitComplete}
        okText="Xác nhận Complete"
        confirmLoading={completeMutation.isPending}
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
                sns={lineSNs[l.id] ?? []}
                loading={loadingSNs}
                selected={selectedSNs[l.id] ?? []}
                onSelect={(keys) => setSelectedSNs((prev) => ({ ...prev, [l.id]: keys }))}
              />
            </div>

            {/* Hiện SN đã chọn dưới dạng tags để dễ review trước khi submit */}
            {(selectedSNs[l.id]?.length ?? 0) > 0 && (
              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {(selectedSNs[l.id] ?? []).map((sn) => (
                  <Tag
                    key={sn}
                    closable
                    color={(selectedSNs[l.id]?.length ?? 0) >= l.quantity ? 'success' : 'blue'}
                    onClose={() =>
                      setSelectedSNs((prev) => ({
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
    </div>
  )
}
