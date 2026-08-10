import { useParams } from 'react-router-dom'
import { Table, Button, Typography, Space, Popconfirm, Tag, Form, Input } from 'antd'
import { usePurchaseOrderDetail } from '../hooks/usePurchaseOrderDetail'
import { EntityFormModal } from '../components/EntityFormModal'
import { StatusTag } from '../components/StatusTag'
import CustomFieldsPanel from '../components/CustomFieldsPanel'

const STATUS_COLOR: Record<string, string> = { draft: 'default', confirmed: 'blue', cancelled: 'red' }

export default function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const hook = usePurchaseOrderDetail(id!)

  if (hook.isLoading || !hook.data) return null

  return (
    <div>
      <Typography.Title level={3}>
        PO {hook.data.code} <StatusTag status={hook.data.status} colorMap={STATUS_COLOR} />
      </Typography.Title>
      <p>
        NCC: <strong>{hook.data.company_name}</strong>
        {hook.data.contact_name && <> — Người liên hệ: <strong>{hook.data.contact_name}</strong></>}
        {hook.data.bitrix_deal_id && <> — Bitrix Deal: <strong>{hook.data.bitrix_deal_id}</strong></>}
      </p>
      {hook.data.note && <p>Ghi chú: {hook.data.note}</p>}

      <Space style={{ marginBottom: 16 }}>
        {hook.data.status === 'draft' && (
          <Button onClick={() => hook.editModal.openEdit(hook.data, { note: hook.data.note, bitrix_deal_id: hook.data.bitrix_deal_id })}>
            Sửa
          </Button>
        )}
        {hook.data.status === 'draft' && (
          <Button type="primary" onClick={() => hook.confirmMutation.mutate()}>
            Confirm
          </Button>
        )}
        {hook.data.status === 'confirmed' && (
          <Button onClick={() => hook.unconfirmMutation.mutate()}>Unconfirm (về Draft)</Button>
        )}
        {hook.data.status !== 'cancelled' && (
          <Popconfirm title="Huỷ PO này?" onConfirm={() => hook.cancelMutation.mutate()}>
            <Button danger>Cancel</Button>
          </Popconfirm>
        )}
        {hook.data.status === 'confirmed' && (
          <Button onClick={() => hook.navigate(`/receipts?po_id=${hook.data.id}`)}>Tạo Receipt từ PO này</Button>
        )}
      </Space>

      <Table
        rowKey="id"
        size="small"
        dataSource={hook.data.lines}
        pagination={false}
        columns={[
          { title: 'Mã hàng', dataIndex: 'variant_item_code' },
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

      <EntityFormModal
        title="Sửa Purchase Order"
        open={hook.editModal.open}
        onCancel={hook.editModal.close}
        onFinish={(v) => hook.updateMutation.mutate(v)}
        confirmLoading={hook.updateMutation.isPending}
        form={hook.editModal.form}
      >
        <Form.Item name="bitrix_deal_id" label="Bitrix Deal ID">
          <Input />
        </Form.Item>
        <Form.Item name="note" label="Ghi chú">
          <Input.TextArea rows={3} />
        </Form.Item>
      </EntityFormModal>

      <CustomFieldsPanel objectType="purchase_order" objectId={id!} />
    </div>
  )
}
