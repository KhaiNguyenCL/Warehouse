import { useParams } from 'react-router-dom'
import { Table, Button, Typography, Space, Popconfirm, Modal, Input, Form, InputNumber } from 'antd'
import { useReceiptDetail } from '../hooks/useReceiptDetail'
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

const SN_STATUS_COLOR: Record<string, string> = { active: 'blue', sold: 'default', disposed: 'red' }

export default function ReceiptDetailPage() {
  const { id } = useParams<{ id: string }>()
  const hook = useReceiptDetail(id!)

  if (hook.isLoading || !hook.data) return null

  return (
    <div>
      <Typography.Title level={3}>
        Receipt {hook.data.code} <StatusTag status={hook.data.status} colorMap={STATUS_COLOR} />
      </Typography.Title>
      <p>
        Loại nhập: <strong>{hook.data.import_type}</strong> — Kho: <strong>{hook.data.warehouse_name}</strong>
      </p>

      <Space style={{ marginBottom: 16 }}>
        {hook.data.status === 'draft' && (
          <Button onClick={() => hook.editModal.openEdit(hook.data, {
            note: hook.data.note,
            lines: hook.data.lines.map((l: any) => ({
              id: l.id,
              cost_price: l.cost_price,
              manufacturer_warranty_months: l.manufacturer_warranty_months,
              customer_warranty_months: l.customer_warranty_months,
            })),
          })}>Sửa</Button>
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
          { title: 'Giá nhập', dataIndex: 'cost_price' },
          { title: 'BH hãng (tháng)', dataIndex: 'manufacturer_warranty_months' },
          { title: 'BH cty (tháng)', dataIndex: 'customer_warranty_months' },
          { title: 'qty_remaining (lô)', dataIndex: 'qty_remaining' },
          {
            title: '',
            render: (_: any, l: any) =>
              hook.data.status === 'completed' && l.product_type === 'storable' ? (
                <Button size="small" onClick={() => hook.setSerialsFor({ line_id: l.id, label: l.variant_name })}>
                  Xem SN
                </Button>
              ) : null,
          },
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

      <Modal
        title={`Serial Number — ${hook.serialsFor?.label ?? ''}`}
        open={!!hook.serialsFor}
        onCancel={() => hook.setSerialsFor(null)}
        footer={null}
        width={700}
      >
        <Table
          rowKey="id"
          loading={hook.serialsLoading}
          dataSource={hook.serials}
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

      <EntityFormModal
        title="Sửa Receipt"
        open={hook.editModal.open}
        onCancel={hook.editModal.close}
        onFinish={(v) => hook.updateMutation.mutate(v)}
        confirmLoading={hook.updateMutation.isPending}
        form={hook.editModal.form}
        width={780}
      >
        <Form.Item name="note" label="Ghi chú">
          <Input.TextArea rows={2} />
        </Form.Item>

        <Form.List name="lines">
          {(fields) => (
            <Table
              size="small"
              pagination={false}
              dataSource={fields.map((f) => ({ ...f, key: f.key }))}
              columns={[
                {
                  title: 'SKU',
                  render: (_: any, f: any) => {
                    const line = hook.data?.lines?.[f.name]
                    return <span style={{ fontSize: 12 }}>{line?.sku} — {line?.variant_name}</span>
                  },
                },
                {
                  title: 'Giá nhập',
                  render: (_: any, f: any) => (
                    <Form.Item name={[f.name, 'cost_price']} noStyle rules={[{ required: true }]}>
                      <InputNumber min={0} style={{ width: 130 }} />
                    </Form.Item>
                  ),
                },
                {
                  title: 'BH hãng (T)',
                  render: (_: any, f: any) => (
                    <Form.Item name={[f.name, 'manufacturer_warranty_months']} noStyle>
                      <InputNumber min={0} style={{ width: 70 }} />
                    </Form.Item>
                  ),
                },
                {
                  title: 'BH cty (T)',
                  render: (_: any, f: any) => (
                    <Form.Item name={[f.name, 'customer_warranty_months']} noStyle>
                      <InputNumber min={0} style={{ width: 70 }} />
                    </Form.Item>
                  ),
                },
                {
                  title: '',
                  render: (_: any, f: any) => (
                    <Form.Item name={[f.name, 'id']} hidden><Input /></Form.Item>
                  ),
                },
              ]}
            />
          )}
        </Form.List>
      </EntityFormModal>
    </div>
  )
}
