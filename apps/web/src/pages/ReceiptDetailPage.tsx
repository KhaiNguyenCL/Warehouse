import { useState } from 'react'
import { useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import { Table, Button, Typography, Space, Popconfirm, Modal, Input, Form, InputNumber, DatePicker } from 'antd'
import { QrcodeOutlined } from '@ant-design/icons'
import { useReceiptDetail } from '../hooks/useReceiptDetail'
import { moneyProps } from '../lib/utils'
import { SnScanGrid } from '../components/SnScanGrid'
import { EntityFormModal } from '../components/EntityFormModal'
import { StatusTag } from '../components/StatusTag'
import { BatchQRPrint } from '../components/BatchQRPrint'
import CustomFieldsPanel from '../components/CustomFieldsPanel'

const STATUS_COLOR: Record<string, string> = {
  draft: 'default',
  completed: 'green',
  cancelled: 'red',
}

const SN_STATUS_COLOR: Record<string, string> = { active: 'blue', sold: 'default', disposed: 'red' }

export default function ReceiptDetailPage() {
  const { id } = useParams<{ id: string }>()
  const hook = useReceiptDetail(id!)
  const [qrOpen, setQrOpen] = useState(false)

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
              manufacturer_warranty_months: l.manufacturer_warranty_months ?? undefined,
              manufacturer_warranty_start: l.manufacturer_warranty_start ? dayjs(l.manufacturer_warranty_start) : undefined,
              customer_warranty_months: l.customer_warranty_months ?? undefined,
            })),
          })}>Sửa</Button>
        )}
        {hook.data.status === 'draft' && (
          <Button type="primary" onClick={() => hook.setCompleteOpen(true)}>
            Complete
          </Button>
        )}
        {!['completed', 'cancelled'].includes(hook.data.status) && (
          <Popconfirm title="Huỷ phiếu này?" onConfirm={() => hook.cancelMutation.mutate()}>
            <Button danger>Cancel</Button>
          </Popconfirm>
        )}
        {hook.data.status === 'completed' && (
          <Button icon={<QrcodeOutlined />} onClick={() => setQrOpen(true)}>
            In nhãn QR
          </Button>
        )}
      </Space>

      <Table
        rowKey="id"
        size="small"
        dataSource={hook.data.lines}
        pagination={false}
        columns={[
          { title: 'Mã hàng', dataIndex: 'item_code' },
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
        title="Complete — nhập Serial Number"
        open={hook.completeOpen}
        onCancel={() => hook.setCompleteOpen(false)}
        onOk={hook.submitComplete}
        confirmLoading={hook.completeMutation.isPending}
        width={720}
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
      >
        {hook.data.lines
          .filter((l: any) => l.product_type === 'storable')
          .map((l: any) => (
            <div key={l.id} style={{ marginBottom: 24 }}>
              <p style={{ fontWeight: 600, marginBottom: 8 }}>
                {l.item_code} — {l.variant_name}
                <span style={{ fontWeight: 400, color: '#888', marginLeft: 8 }}>
                  (cần {l.quantity} SN)
                </span>
              </p>
              <SnScanGrid
                quantity={l.quantity}
                rows={hook.serialsRows[l.id] ?? []}
                onChange={(rows) => hook.setSerialsRows((prev) => ({ ...prev, [l.id]: rows }))}
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

      <BatchQRPrint
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        receiptCode={hook.data.code}
        completedAt={hook.data.completed_at ?? null}
        warehouseName={hook.data.warehouse_name}
        lines={hook.data.lines}
      />

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
                    return <span style={{ fontSize: 12 }}>{line?.item_code} — {line?.variant_name}</span>
                  },
                },
                {
                  title: 'Giá nhập',
                  render: (_: any, f: any) => (
                    <Form.Item name={[f.name, 'cost_price']} noStyle rules={[{ required: true }]}>
                      <InputNumber {...moneyProps} min={0} style={{ width: 130 }} />
                    </Form.Item>
                  ),
                },
                {
                  title: 'BH hãng (tháng)',
                  width: 230,
                  render: (_: any, f: any) => (
                    <Space size={4}>
                      <Form.Item name={[f.name, 'manufacturer_warranty_months']} noStyle>
                        <InputNumber controls={false} min={0} style={{ width: 70 }} placeholder="Tháng" />
                      </Form.Item>
                      <Form.Item name={[f.name, 'manufacturer_warranty_start']} noStyle>
                        <DatePicker style={{ width: 130 }} placeholder="Từ ngày" allowClear />
                      </Form.Item>
                    </Space>
                  ),
                },
                {
                  title: 'BH cty (tháng)',
                  width: 110,
                  render: (_: any, f: any) => (
                    <Form.Item name={[f.name, 'customer_warranty_months']} noStyle>
                      <InputNumber controls={false} min={0} style={{ width: 90 }} placeholder="Tháng" />
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
