import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Table, Button, Typography, Space, Popconfirm, Modal, Input } from 'antd'
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

export default function TransferOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [completeOpen, setCompleteOpen] = useState(false)
  const [serialsText, setSerialsText] = useState<Record<string, string>>({})

  const { data, isLoading } = useQuery({
    queryKey: ['transfers', id],
    queryFn: async () => (await api.get(`/transfers/${id}`)).data,
  })

  const actionOptions = {
    successMessage: 'Thành công',
    invalidateKey: [['transfers', id], ['transfers'], ['inventory']],
  }
  const submitMutation = useApiMutation(() => api.patch(`/transfers/${id}/submit`), actionOptions)
  const approveMutation = useApiMutation(() => api.patch(`/transfers/${id}/approve`), actionOptions)
  const cancelMutation = useApiMutation(() => api.patch(`/transfers/${id}/cancel`), actionOptions)
  const completeMutation = useApiMutation((body: any) => api.patch(`/transfers/${id}/complete`, body), {
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
          .map((s: string) => s.trim())
          .filter(Boolean),
      }))
    completeMutation.mutate({ lines })
  }

  return (
    <div>
      <Typography.Title level={3}>
        Transfer Order {data.code} <StatusTag status={data.status} colorMap={STATUS_COLOR} />
      </Typography.Title>
      <p>
        Loại chuyển: <strong>{data.transfer_type}</strong>
        {data.from_warehouse_name && <> — Kho nguồn: <strong>{data.from_warehouse_name}</strong></>}
        {' '}— Kho đích: <strong>{data.to_warehouse_name}</strong>
      </p>
      {data.note && <p>Ghi chú: {data.note}</p>}

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
          { title: 'Ghi chú', dataIndex: 'note' },
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
    </div>
  )
}
