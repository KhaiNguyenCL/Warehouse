import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Table, Button, Typography, Space, Popconfirm, InputNumber, Input, message } from 'antd'
import { api } from '../lib/api'
import { useApiMutation } from '../hooks/useApiMutation'
import { StatusTag } from '../components/StatusTag'

const STATUS_COLOR: Record<string, string> = { in_progress: 'blue', completed: 'green', cancelled: 'red' }

export default function StocktakeDetailPage() {
  const { id } = useParams<{ id: string }>()
  // qtyActual[line_id] = số lượng thực tế nhập tay; serialsText[line_id] = serial quét được (storable)
  const [qtyActual, setQtyActual] = useState<Record<string, number>>({})
  const [serialsText, setSerialsText] = useState<Record<string, string>>({})

  const { data, isLoading } = useQuery({
    queryKey: ['stocktakes', id],
    queryFn: async () => (await api.get(`/stocktakes/${id}`)).data,
  })

  const actionOptions = { successMessage: 'Thành công', invalidateKey: [['stocktakes', id], ['stocktakes']] }
  const cancelMutation = useApiMutation(() => api.patch(`/stocktakes/${id}/cancel`), actionOptions)
  const completeMutation = useApiMutation((body: any) => api.patch(`/stocktakes/${id}/complete`, body), actionOptions)

  if (isLoading || !data) return null

  function submitComplete() {
    const lines = data.lines
      .filter((l: any) => qtyActual[l.id] !== undefined)
      .map((l: any) => ({
        line_id: l.id,
        qty_actual: qtyActual[l.id],
        found_serials:
          l.product_type === 'storable'
            ? (serialsText[l.id] ?? '').split('\n').map((s: string) => s.trim()).filter(Boolean)
            : undefined,
      }))
    if (lines.length !== data.lines.length) {
      message.error('Phải nhập số lượng thực tế cho tất cả dòng trước khi Complete')
      return
    }
    completeMutation.mutate({ lines })
  }

  return (
    <div>
      <Typography.Title level={3}>
        Stocktake {data.code} <StatusTag status={data.status} colorMap={STATUS_COLOR} />
      </Typography.Title>
      <p>
        Kho: <strong>{data.warehouse_name}</strong> — Phạm vi: <strong>{data.scope_type}</strong>
      </p>
      {data.note && <p>Ghi chú: {data.note}</p>}

      <Space style={{ marginBottom: 16 }}>
        {data.status === 'in_progress' && (
          <Button type="primary" onClick={submitComplete} loading={completeMutation.isPending}>
            Complete
          </Button>
        )}
        {data.status === 'in_progress' && (
          <Popconfirm title="Huỷ kiểm kê này?" onConfirm={() => cancelMutation.mutate()}>
            <Button danger>Cancel</Button>
          </Popconfirm>
        )}
      </Space>

      {data.result && (
        <div style={{ marginBottom: 16, padding: 12, background: '#f6ffed', border: '1px solid #b7eb8f' }}>
          <p>
            Kết quả: {data.result.total_sku} SKU — Khớp: {data.result.matched} — Thiếu: {data.result.shortage} — Dư:{' '}
            {data.result.surplus}
          </p>
          <p>
            <strong>stocktake_result.id</strong> (dùng làm <code>ref_document_id</code> khi tạo Receipt/Delivery loại
            "adjustment"): <code>{data.result.id}</code>
          </p>
        </div>
      )}

      <Table
        rowKey="id"
        dataSource={data.lines}
        pagination={false}
        columns={[
          { title: 'SKU', dataIndex: 'sku' },
          { title: 'Tên', dataIndex: 'variant_name' },
          { title: 'Product type', dataIndex: 'product_type' },
          { title: 'Tồn hệ thống (qty_system)', dataIndex: 'qty_system' },
          {
            title: 'Tồn thực tế (qty_actual)',
            render: (_: any, l: any) =>
              data.status === 'in_progress' ? (
                <InputNumber
                  min={0}
                  value={qtyActual[l.id] ?? l.qty_actual}
                  onChange={(v) => setQtyActual((prev) => ({ ...prev, [l.id]: v ?? 0 }))}
                />
              ) : (
                l.qty_actual
              ),
          },
          { title: 'Chênh lệch', dataIndex: 'difference' },
        ]}
        expandable={
          data.status === 'in_progress'
            ? {
                rowExpandable: (l: any) => l.product_type === 'storable',
                expandedRowRender: (l: any) => (
                  <div>
                    <p>Serial quét được thực tế (mỗi dòng 1 serial, để trống nếu không quét):</p>
                    <Input.TextArea
                      rows={3}
                      value={serialsText[l.id] ?? ''}
                      onChange={(e) => setSerialsText((prev) => ({ ...prev, [l.id]: e.target.value }))}
                      placeholder={`SN-001\nSN-002\n...`}
                    />
                  </div>
                ),
              }
            : undefined
        }
      />
    </div>
  )
}
