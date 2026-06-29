import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Table, Button, Typography, Space, Popconfirm, Tag } from 'antd'
import { api } from '../lib/api'
import { useApiMutation } from '../hooks/useApiMutation'
import { StatusTag } from '../components/StatusTag'

const STATUS_COLOR: Record<string, string> = { draft: 'default', confirmed: 'blue', cancelled: 'red' }

export default function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders', id],
    queryFn: async () => (await api.get(`/purchase-orders/${id}`)).data,
  })

  const actionOptions = { successMessage: 'Thành công', invalidateKey: [['purchase-orders', id], ['purchase-orders']] }
  const confirmMutation = useApiMutation(() => api.patch(`/purchase-orders/${id}/confirm`), actionOptions)
  const unconfirmMutation = useApiMutation(() => api.patch(`/purchase-orders/${id}/unconfirm`), actionOptions)
  const cancelMutation = useApiMutation(() => api.patch(`/purchase-orders/${id}/cancel`), actionOptions)

  if (isLoading || !data) return null

  return (
    <div>
      <Typography.Title level={3}>
        PO {data.code} <StatusTag status={data.status} colorMap={STATUS_COLOR} />
      </Typography.Title>
      <p>
        NCC: <strong>{data.company_name}</strong>
        {data.contact_name && <> — Người liên hệ: <strong>{data.contact_name}</strong></>}
        {data.bitrix_deal_id && <> — Bitrix Deal: <strong>{data.bitrix_deal_id}</strong></>}
      </p>
      {data.note && <p>Ghi chú: {data.note}</p>}

      <Space style={{ marginBottom: 16 }}>
        {data.status === 'draft' && (
          <Button type="primary" onClick={() => confirmMutation.mutate()}>
            Confirm
          </Button>
        )}
        {data.status === 'confirmed' && (
          <Button onClick={() => unconfirmMutation.mutate()}>Unconfirm (về Draft)</Button>
        )}
        {data.status !== 'cancelled' && (
          <Popconfirm title="Huỷ PO này?" onConfirm={() => cancelMutation.mutate()}>
            <Button danger>Cancel</Button>
          </Popconfirm>
        )}
        {data.status === 'confirmed' && (
          <Button onClick={() => navigate(`/receipts?po_id=${data.id}`)}>Tạo Receipt từ PO này</Button>
        )}
      </Space>

      <Table
        rowKey="id"
        dataSource={data.lines}
        pagination={false}
        columns={[
          { title: 'SKU', dataIndex: 'variant_sku' },
          { title: 'Tên', dataIndex: 'variant_name' },
          { title: 'Số lượng đặt', dataIndex: 'quantity' },
          { title: 'Đơn giá', dataIndex: 'unit_price' },
          { title: 'BH hãng (tháng)', dataIndex: 'manufacturer_warranty_months' },
          { title: 'BH cty (tháng)', dataIndex: 'customer_warranty_months' },
          { title: 'Đã nhận', dataIndex: 'received_qty' },
          { title: 'Đang chờ', dataIndex: 'pending_qty' },
          { title: 'Còn lại', dataIndex: 'remaining_qty' },
          { title: 'Ghi chú', dataIndex: 'note' },
          {
            title: 'Thông tin thêm',
            dataIndex: 'custom_field_values',
            render: (values: any[]) =>
              values
                ?.filter((v) => v.value !== null && v.value !== undefined)
                .map((v) => (
                  <Tag key={v.field_id}>
                    {v.field_label}: {v.field_type === 'boolean' ? (v.value === 'true' ? 'Có' : 'Không') : v.value}
                  </Tag>
                )),
          },
        ]}
      />
    </div>
  )
}
