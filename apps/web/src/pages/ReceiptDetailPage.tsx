import { useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import { Table, Button, Typography, Space, Modal, Input, Form, InputNumber, DatePicker, Upload, message } from 'antd'
import { QrcodeOutlined, PaperClipOutlined, UploadOutlined } from '@ant-design/icons'
import type { UploadFile } from 'antd'
import { api } from '../lib/api'
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
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelFiles, setCancelFiles] = useState<UploadFile[]>([])
  const [cancelLoading, setCancelLoading] = useState(false)

  async function handleCancel() {
    if (!cancelReason.trim()) {
      message.warning('Vui lòng nhập lý do hủy')
      return
    }
    setCancelLoading(true)
    try {
      // Upload files trước, lấy URL
      const uploaded: Array<{ url: string; originalName: string }> = []
      for (const f of cancelFiles) {
        if (f.url) {
          // file đã upload xong (có url từ customRequest)
          uploaded.push({ url: f.url as string, originalName: f.name })
        }
      }
      await hook.cancelMutation.mutateAsync({ reason: cancelReason.trim(), attachments: uploaded })
      setCancelOpen(false)
      setCancelReason('')
      setCancelFiles([])
    } finally {
      setCancelLoading(false)
    }
  }

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
          <Button danger onClick={() => setCancelOpen(true)}>Hủy phiếu</Button>
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
                <span style={{ fontWeight: 400, color: 'var(--text-2)', marginLeft: 8 }}>
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
          <p>Không có dòng Thiết bị — không cần nhập serial, bấm OK để Complete.</p>
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

      {/* Hiển thị lý do hủy nếu phiếu đã cancelled */}
      {hook.data.status === 'cancelled' && (hook.data.cancel_reason || hook.data.cancel_attachments?.length) && (
        <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--s-cancelled-bg)', border: '1px solid var(--s-cancelled-color)', borderRadius: 8 }}>
          <div style={{ fontWeight: 600, color: 'var(--s-cancelled-color)', marginBottom: 6 }}>Lý do hủy</div>
          {hook.data.cancel_reason && (
            <div style={{ color: 'var(--text-1)', whiteSpace: 'pre-wrap', marginBottom: 8 }}>{hook.data.cancel_reason}</div>
          )}
          {hook.data.cancel_attachments?.length > 0 && (
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>Đính kèm:</div>
              <Space wrap>
                {hook.data.cancel_attachments.map((f: any, i: number) => (
                  <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                    <PaperClipOutlined /> {f.originalName}
                  </a>
                ))}
              </Space>
            </div>
          )}
        </div>
      )}

      <CustomFieldsPanel objectType="receipt" objectId={id!} />

      {/* Modal hủy phiếu — yêu cầu lý do + đính kèm chứng từ */}
      <Modal
        title="Hủy phiếu nhập kho"
        open={cancelOpen}
        onCancel={() => { setCancelOpen(false); setCancelReason(''); setCancelFiles([]) }}
        onOk={handleCancel}
        okText="Xác nhận hủy"
        okButtonProps={{ danger: true, loading: cancelLoading }}
        cancelText="Đóng"
        width={520}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
          <div>
            <div style={{ fontWeight: 500, marginBottom: 6 }}>
              Lý do hủy <span style={{ color: 'var(--s-cancelled-color)' }}>*</span>
            </div>
            <Input.TextArea
              rows={4}
              placeholder="Nhập lý do hủy phiếu..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>
          <div>
            <div style={{ fontWeight: 500, marginBottom: 6 }}>Đính kèm chứng từ (tuỳ chọn)</div>
            <Upload
              fileList={cancelFiles}
              accept="image/*,.pdf"
              multiple
              customRequest={async ({ file, onSuccess, onError }) => {
                try {
                  const form = new FormData()
                  form.append('file', file as File)
                  const res = await api.post('/uploads/file', form, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                  })
                  // Gán url vào fileList để handleCancel lấy ra
                  setCancelFiles((prev) =>
                    prev.map((f) =>
                      f.uid === (file as any).uid
                        ? { ...f, url: res.data.url, status: 'done' }
                        : f,
                    ),
                  )
                  onSuccess?.(res.data)
                } catch (err: any) {
                  onError?.(err)
                }
              }}
              onChange={({ fileList }) => setCancelFiles(fileList)}
              listType="text"
            >
              <Button icon={<UploadOutlined />}>Chọn file (ảnh / PDF, tối đa 20 MB)</Button>
            </Upload>
          </div>
        </div>
      </Modal>

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
