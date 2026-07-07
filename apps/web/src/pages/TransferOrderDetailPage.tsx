import { useParams } from 'react-router-dom'
import { Table, Button, Typography, Space, Popconfirm, Modal, Input, Form } from 'antd'
import { useTransferOrderDetail } from '../hooks/useTransferOrderDetail'
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

export default function TransferOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const hook = useTransferOrderDetail(id!)

  if (hook.isLoading || !hook.data) return null

  return (
    <div>
      <Typography.Title level={3}>
        Transfer Order {hook.data.code} <StatusTag status={hook.data.status} colorMap={STATUS_COLOR} />
      </Typography.Title>
      <p>
        Loại chuyển: <strong>{hook.data.transfer_type}</strong>
        {hook.data.from_warehouse_name && <> — Kho nguồn: <strong>{hook.data.from_warehouse_name}</strong></>}
        {' '}— Kho đích: <strong>{hook.data.to_warehouse_name}</strong>
      </p>
      {hook.data.note && <p>Ghi chú: {hook.data.note}</p>}

      <Space style={{ marginBottom: 16 }}>
        {hook.data.status === 'draft' && (
          <Button onClick={() => hook.editModal.openEdit(hook.data, { note: hook.data.note })}>Sửa</Button>
        )}
        {hook.data.status === 'draft' && (
          <Button type="primary" onClick={() => hook.submitMutation.mutate()}>
            Submit
          </Button>
        )}
        {hook.data.status === 'pending_approval' && (
          <Button type="primary" onClick={() => hook.approveMutation.mutate()}>
            Approve
          </Button>
        )}
        {hook.data.status === 'approved' && (
          <Button type="primary" onClick={() => hook.setCompleteOpen(true)}>
            Complete
          </Button>
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
        title="Complete — nhập Serial Number cho từng dòng storable"
        open={hook.completeOpen}
        onCancel={() => hook.setCompleteOpen(false)}
        onOk={hook.submitComplete}
        confirmLoading={hook.completeMutation.isPending}
        width={600}
      >
        {hook.data.lines
          .filter((l: any) => l.product_type === 'storable')
          .map((l: any) => (
            <div key={l.id} style={{ marginBottom: 16 }}>
              <p>
                {l.variant_name} — cần đúng <strong>{l.quantity}</strong> serial (mỗi dòng 1 serial)
              </p>
              <Input.TextArea
                rows={4}
                value={hook.serialsText[l.id] ?? ''}
                onChange={(e) => hook.setSerialsText((prev) => ({ ...prev, [l.id]: e.target.value }))}
                placeholder={`SN-001\nSN-002\n...`}
              />
            </div>
          ))}
        {hook.data.lines.every((l: any) => l.product_type !== 'storable') && (
          <p>Không có dòng storable — không cần nhập serial, bấm OK để Complete.</p>
        )}
      </Modal>

      <EntityFormModal
        title="Sửa Transfer Order"
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

      <CustomFieldsPanel objectType="transfer_order" objectId={id!} />
    </div>
  )
}
