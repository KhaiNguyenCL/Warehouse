import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Table, Button, Typography, Space, Popconfirm, Modal, Input } from 'antd'
import { api } from '../lib/api'
import { useApiMutation } from '../hooks/useApiMutation'
import { StatusTag } from '../components/StatusTag'
import CustomFieldsPanel from '../components/CustomFieldsPanel'

const STATUS_COLOR: Record<string, string> = {
  draft: 'default',
  pending_approval: 'gold',
  approved: 'blue',
  completed: 'green',
  cancelled: 'red',
}

const SN_STATUS_COLOR: Record<string, string> = { active: 'blue', sold: 'default', disposed: 'red' }

export default function ReceiptDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [completeOpen, setCompleteOpen] = useState(false)
  // serialsText[line_id] = textarea content (mỗi dòng text = 1 serial number)
  const [serialsText, setSerialsText] = useState<Record<string, string>>({})
  const [serialsFor, setSerialsFor] = useState<{ line_id: string; label: string } | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['receipts', id],
    queryFn: async () => (await api.get(`/receipts/${id}`)).data,
  })

  // Chi tiết SN đã nhập cho 1 dòng (chỉ có sau khi Complete).
  const { data: serials, isLoading: serialsLoading } = useQuery({
    queryKey: ['inventory', 'serials', serialsFor?.line_id],
    queryFn: async () =>
      (await api.get('/inventory/serials', { params: { receipt_line_id: serialsFor!.line_id } })).data,
    enabled: !!serialsFor,
  })

  const actionOptions = {
    successMessage: 'Thành công',
    invalidateKey: [['receipts', id], ['receipts'], ['inventory']],
  }
  const submitMutation = useApiMutation(() => api.patch(`/receipts/${id}/submit`), actionOptions)
  const approveMutation = useApiMutation(() => api.patch(`/receipts/${id}/approve`), actionOptions)
  const cancelMutation = useApiMutation(() => api.patch(`/receipts/${id}/cancel`), actionOptions)
  const completeMutation = useApiMutation((body: any) => api.patch(`/receipts/${id}/complete`, body), {
    ...actionOptions,
    onSuccess: () => setCompleteOpen(false),
  })

  if (isLoading || !data) return null

  function submitComplete() {
    const lines = data.lines
      .filter((l: any) => l.product_type === 'storable')
      .map((l: any) => ({
        line_id: l.id,
        serials: (serialsText[l.id] ?? '')
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
      }))
    completeMutation.mutate({ lines })
  }

  return (
    <div>
      <Typography.Title level={3}>
        Receipt {data.code} <StatusTag status={data.status} colorMap={STATUS_COLOR} />
      </Typography.Title>
      <p>
        Loại nhập: <strong>{data.import_type}</strong> — Kho: <strong>{data.warehouse_name}</strong>
      </p>

      <Space style={{ marginBottom: 16 }}>
        {data.status === 'draft' && (
          <Button type="primary" onClick={() => submitMutation.mutate()}>
            Submit
          </Button>
        )}
        {data.status === 'pending_approval' && (
          <Button type="primary" onClick={() => approveMutation.mutate()}>
            Approve
          </Button>
        )}
        {data.status === 'approved' && (
          <Button type="primary" onClick={() => setCompleteOpen(true)}>
            Complete
          </Button>
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
          { title: 'Giá nhập', dataIndex: 'cost_price' },
          { title: 'BH hãng (tháng)', dataIndex: 'manufacturer_warranty_months' },
          { title: 'BH cty (tháng)', dataIndex: 'customer_warranty_months' },
          { title: 'qty_remaining (lô)', dataIndex: 'qty_remaining' },
          {
            title: '',
            render: (_: any, l: any) =>
              data.status === 'completed' && l.product_type === 'storable' ? (
                <Button size="small" onClick={() => setSerialsFor({ line_id: l.id, label: l.variant_name })}>
                  Xem SN
                </Button>
              ) : null,
          },
        ]}
      />

      <Modal
        title="Complete — nhập Serial Number cho từng dòng storable"
        open={completeOpen}
        onCancel={() => setCompleteOpen(false)}
        onOk={submitComplete}
        confirmLoading={completeMutation.isPending}
        width={600}
      >
        {data.lines
          .filter((l: any) => l.product_type === 'storable')
          .map((l: any) => (
            <div key={l.id} style={{ marginBottom: 16 }}>
              <p>
                {l.variant_name} — cần đúng <strong>{l.quantity}</strong> serial (mỗi dòng 1 serial)
              </p>
              <Input.TextArea
                rows={4}
                value={serialsText[l.id] ?? ''}
                onChange={(e) => setSerialsText((prev) => ({ ...prev, [l.id]: e.target.value }))}
                placeholder={`SN-001\nSN-002\n...`}
              />
            </div>
          ))}
        {data.lines.every((l: any) => l.product_type !== 'storable') && (
          <p>Không có dòng storable — không cần nhập serial, bấm OK để Complete.</p>
        )}
      </Modal>

      <Modal
        title={`Serial Number — ${serialsFor?.label ?? ''}`}
        open={!!serialsFor}
        onCancel={() => setSerialsFor(null)}
        footer={null}
        width={700}
      >
        <Table
          rowKey="id"
          loading={serialsLoading}
          dataSource={serials}
          pagination={false}
          size="small"
          columns={[
            { title: 'Serial No', dataIndex: 'serial_no' },
            { title: 'Trạng thái', dataIndex: 'status', render: (s) => <StatusTag status={s} colorMap={SN_STATUS_COLOR} /> },
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

      <CustomFieldsPanel objectType="receipt" objectId={id!} />
    </div>
  )
}
