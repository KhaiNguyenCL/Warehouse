import { useParams } from 'react-router-dom'
import { Table, Button, Typography, Space, Popconfirm, InputNumber, Input } from 'antd'
import { useStocktakeDetail } from '../hooks/useStocktakeDetail'
import { StatusTag } from '../components/StatusTag'
import CustomFieldsPanel from '../components/CustomFieldsPanel'

const STATUS_COLOR: Record<string, string> = { in_progress: 'blue', completed: 'green', cancelled: 'red' }

export default function StocktakeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const hook = useStocktakeDetail(id!)

  if (hook.isLoading || !hook.data) return null

  return (
    <div>
      <Typography.Title level={3}>
        Stocktake {hook.data.code} <StatusTag status={hook.data.status} colorMap={STATUS_COLOR} />
      </Typography.Title>
      <p>
        Kho: <strong>{hook.data.warehouse_name}</strong> — Phạm vi: <strong>{hook.data.scope_type}</strong>
      </p>
      {hook.data.note && <p>Ghi chú: {hook.data.note}</p>}

      <Space style={{ marginBottom: 16 }}>
        {hook.data.status === 'in_progress' && (
          <Button type="primary" onClick={hook.submitComplete} loading={hook.completeMutation.isPending}>
            Complete
          </Button>
        )}
        {hook.data.status === 'in_progress' && (
          <Popconfirm title="Huỷ kiểm kê này?" onConfirm={() => hook.cancelMutation.mutate()}>
            <Button danger>Cancel</Button>
          </Popconfirm>
        )}
      </Space>

      {hook.data.result && (
        <div style={{ marginBottom: 16, padding: 12, background: '#f6ffed', border: '1px solid #b7eb8f' }}>
          <p>
            Kết quả: {hook.data.result.total_sku} SKU — Khớp: {hook.data.result.matched} — Thiếu: {hook.data.result.shortage} — Dư:{' '}
            {hook.data.result.surplus}
          </p>
          <p>
            <strong>stocktake_result.id</strong> (dùng làm <code>ref_document_id</code> khi tạo Receipt/Delivery loại
            "adjustment"): <code>{hook.data.result.id}</code>
          </p>
        </div>
      )}

      <Table
        rowKey="id"
        dataSource={hook.data.lines}
        pagination={false}
        columns={[
          { title: 'Mã hàng', dataIndex: 'item_code' },
          { title: 'Tên', dataIndex: 'variant_name' },
          { title: 'Product type', dataIndex: 'product_type' },
          { title: 'Tồn hệ thống (qty_system)', dataIndex: 'qty_system' },
          {
            title: 'Tồn thực tế (qty_actual)',
            render: (_: any, l: any) =>
              hook.data.status === 'in_progress' ? (
                <InputNumber
                  min={0}
                  value={hook.qtyActual[l.id] ?? l.qty_actual}
                  onChange={(v) => hook.setQtyActual((prev) => ({ ...prev, [l.id]: v ?? 0 }))}
                />
              ) : (
                l.qty_actual
              ),
          },
          { title: 'Chênh lệch', dataIndex: 'difference' },
        ]}
        expandable={
          hook.data.status === 'in_progress'
            ? {
                rowExpandable: (l: any) => l.product_type === 'storable',
                expandedRowRender: (l: any) => (
                  <div>
                    <p>Serial quét được thực tế (mỗi dòng 1 serial, để trống nếu không quét):</p>
                    <Input.TextArea
                      rows={3}
                      value={hook.serialsText[l.id] ?? ''}
                      onChange={(e) => hook.setSerialsText((prev) => ({ ...prev, [l.id]: e.target.value }))}
                      placeholder={`SN-001\nSN-002\n...`}
                    />
                  </div>
                ),
              }
            : undefined
        }
      />

      <CustomFieldsPanel objectType="stocktake" objectId={id!} />
    </div>
  )
}
