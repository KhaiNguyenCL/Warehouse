import { useState } from 'react'
import {
  Button, Form, Input, Select, InputNumber, DatePicker,
  Space, Modal, Table, Upload, message,
} from 'antd'
import { ArrowLeftOutlined, QrcodeOutlined, UploadOutlined, PaperClipOutlined } from '@ant-design/icons'
import type { UploadFile } from 'antd'
import { api } from '../lib/api'
import { useReceiptForm } from '../hooks/useReceiptForm'
import { StatusBadge } from '../components/ui/StatusBadge'
import { SnScanGrid } from '../components/SnScanGrid'
import { BatchQRPrint } from '../components/BatchQRPrint'
import VariantSelect from '../components/VariantSelect'
import { moneyProps } from '../lib/utils'

// ── Shared display helpers ────────────────────────────────────────────────────

function BBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      height: 32, display: 'flex', alignItems: 'center', padding: '0 11px',
      border: '1px solid var(--border, #d9d9d9)', borderRadius: 6,
      background: 'var(--bg-subtle)', fontSize: 14, userSelect: 'text',
    }}>
      {children}
    </div>
  )
}

const ph = <span style={{ color: 'var(--text-3, #bbb)' }}>—</span>

function ReadOnlyText({ value }: { value?: string }) {
  return (
    <div style={{
      height: 32, display: 'flex', alignItems: 'center', padding: '0 11px',
      border: '1px solid var(--border, #d9d9d9)', borderRadius: 6,
      background: 'var(--bg-subtle)', fontSize: 14,
      cursor: 'not-allowed', userSelect: 'text',
    }}>
      {value}
    </div>
  )
}

function fmt(n: any) {
  if (n == null) return '—'
  return Number(n).toLocaleString('en-US')
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ReceiptFormPage() {
  const [isDirty, setIsDirty] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelFiles, setCancelFiles] = useState<UploadFile[]>([])
  const [cancelLoading, setCancelLoading] = useState(false)
  const hook = useReceiptForm({ onUpdateSuccess: () => setIsDirty(false) })
  const { mode, receipt } = hook
  const importTypeValue = Form.useWatch('import_type', hook.form)

  const isCreate = mode === 'create'
  const isEdit = mode === 'edit'
  const isView = mode === 'view'

  if (!isCreate && hook.isLoading) return null

  async function handleCancel() {
    if (!cancelReason.trim()) {
      message.warning('Vui lòng nhập lý do hủy')
      return
    }
    setCancelLoading(true)
    try {
      // AntD Upload tự gọi lại onChange sau khi customRequest báo onSuccess, dùng fileList
      // do nó tự tính lại (chỉ giữ `response`, không giữ field `url` mình tự gắn thêm trong
      // customRequest) — field `url` gắn tay có thể bị ghi đè mất trước lúc submit. Đọc từ
      // `f.response.url` (payload thật của /uploads/file) mới đáng tin cậy.
      const uploaded = cancelFiles
        .filter((f) => f.url || f.response?.url)
        .map((f) => ({ url: (f.url ?? f.response?.url) as string, originalName: f.name }))
      await hook.cancelMutation.mutateAsync({ reason: cancelReason.trim(), attachments: uploaded })
      setCancelOpen(false)
      setCancelReason('')
      setCancelFiles([])
    } finally {
      setCancelLoading(false)
    }
  }

  // ── Submit handler ──────────────────────────────────────────────────────

  function handleSubmit(v: any) {
    if (isCreate) {
      hook.createMutation.mutate(v)
    } else {
      hook.updateMutation.mutate(v)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '0 0 48px' }}>

      {/* ─── Breadcrumb + action row ──────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => hook.navigate('/receipts')}
          style={{ padding: '4px 8px' }}
        />
        <span
          style={{ color: 'var(--text-3)', fontSize: 14, cursor: 'pointer' }}
          onClick={() => hook.navigate('/receipts')}
        >
          Phiếu nhập kho
        </span>
        <span style={{ color: 'var(--text-3)', fontSize: 14 }}>/</span>
        <span style={{ fontSize: 14 }}>
          {isCreate ? 'Tạo mới' : (receipt?.code ?? hook.id)}
        </span>
        {receipt?.status && <StatusBadge status={receipt.status} />}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Complete — chỉ hiện khi draft */}
          {isEdit && (
            <Button
              type="primary"
              disabled={hook.completeMode}
              onClick={() => hook.setCompleteMode(true)}
              style={{ background: 'var(--s-completed-color)', borderColor: 'var(--s-completed-color)' }}
            >
              Complete
            </Button>
          )}

          {/* Huỷ phiếu */}
          {!isCreate && !['completed', 'cancelled'].includes(receipt?.status ?? '') && (
            <Button danger onClick={() => setCancelOpen(true)}>Huỷ phiếu</Button>
          )}

          {/* In nhãn QR lô — chỉ khi completed */}
          {receipt?.status === 'completed' && (
            <Button icon={<QrcodeOutlined />} onClick={() => setQrOpen(true)}>
              In nhãn QR
            </Button>
          )}
        </div>
      </div>

      {receipt?.status === 'completed' && (
        <BatchQRPrint
          open={qrOpen}
          onClose={() => setQrOpen(false)}
          receiptCode={receipt.code}
          completedAt={receipt.completed_at ?? null}
          warehouseName={receipt.warehouse_name}
          lines={receipt.lines ?? []}
        />
      )}

      <Form
        form={hook.form}
        layout="vertical"
        initialValues={isCreate ? { import_type: hook.shipmentIdFromQuery ? 'purchase' : undefined, lines: [{}] } : undefined}
        onFinish={isView ? undefined : handleSubmit}
        onValuesChange={() => { if (!isCreate) setIsDirty(true) }}
      >

        {isCreate && hook.shipmentDetail && (
          <div style={{
            marginBottom: 16, padding: '10px 16px', borderRadius: 8,
            background: 'var(--s-completed-bg)', color: 'var(--s-completed-color)', fontSize: 13,
          }}>
            Đang tạo từ Phiếu nhận hàng <strong>{hook.shipmentDetail.code}</strong> — dòng hàng đã điền theo số lượng thực nhận.
          </div>
        )}

        {/* ─── Card 1: Thông tin phiếu ──────────────────────────────── */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '20px 24px', marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, color: 'var(--text-1)' }}>
            Thông tin phiếu
          </div>

          {/* Row 1 — 3 field ngắn, cùng chiều cao */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '0 16px' }}>
            <Form.Item
              name="import_type" label="Loại nhập" style={{ gridColumn: 'span 4' }}
              rules={isCreate ? [{ required: true }] : undefined}
            >
              {isCreate ? (
                <Select
                  disabled={!!hook.shipmentIdFromQuery}
                  options={hook.importTypes?.map((t: any) => ({ value: t.key, label: t.label }))}
                  placeholder="Chọn loại nhập"
                  onChange={(v) => { if (v !== 'purchase') hook.setShipmentId(undefined) }}
                />
              ) : (
                <BBox>{receipt?.import_type ?? ph}</BBox>
              )}
            </Form.Item>

            <Form.Item name="warehouse_id" label="Kho nhập" style={{ gridColumn: 'span 5' }} rules={isCreate ? [{ required: true }] : undefined}>
              {isCreate ? (
                <Select
                  options={hook.warehouses?.map((w: any) => ({ value: w.id, label: `${w.name} (${w.code})` }))}
                  placeholder="Chọn kho nhập"
                />
              ) : (
                <BBox>{receipt?.warehouse_name ?? ph}</BBox>
              )}
            </Form.Item>

            <Form.Item name="received_date" label="Ngày nhập kho" style={{ gridColumn: 'span 3' }}>
              {isView ? (
                <BBox>{receipt?.received_date ? new Date(receipt.received_date).toLocaleDateString('vi-VN') : ph}</BBox>
              ) : (
                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} placeholder="Ngày hàng về kho" />
              )}
            </Form.Item>
          </div>

          {/* Row 2 — chọn Phiếu nhận hàng (bắt buộc khi Loại nhập = "purchase") + PO/NCC
              đọc ra từ đó (nếu Shipment có gắn PO). Có thể tới từ query (bấm "Tạo phiếu
              nhập kho" trên trang Shipment, lúc đó khoá lại) hoặc tự chọn tay ở đây. */}
          {isCreate && importTypeValue === 'purchase' && (
            <div style={{ display: 'grid', gridTemplateColumns: hook.poDetail ? '2fr 1fr' : '1fr', gap: '0 16px', maxWidth: '66%' }}>
              <Form.Item label="Phiếu nhận hàng" required style={{ marginBottom: 12 }}>
                <Select
                  disabled={!!hook.shipmentIdFromQuery}
                  value={hook.shipmentId}
                  placeholder="Chọn Phiếu nhận hàng đã xác nhận nhận hàng"
                  options={hook.receivedShipments?.data?.map((s: any) => ({
                    value: s.id,
                    label: [s.code, s.supplier_name].filter(Boolean).join(' — '),
                  }))}
                  onChange={(v) => hook.setShipmentId(v)}
                />
              </Form.Item>
              {hook.poDetail && (
                <Form.Item label="NCC" style={{ marginBottom: 12 }}>
                  <BBox>
                    {hook.poDetail?.company_name
                      ? <span>{hook.poDetail.company_name}</span>
                      : <span style={{ color: 'var(--text-3, #bbb)' }}>—</span>}
                  </BBox>
                </Form.Item>
              )}
            </div>
          )}
          {isCreate && (
            <>
              <Form.Item name="po_id" hidden><Input /></Form.Item>
              <Form.Item name="company_id" hidden><Input /></Form.Item>
              <Form.Item name="shipment_id" hidden><Input /></Form.Item>
            </>
          )}
          {!isCreate && receipt?.po_code && (
            <Form.Item label="PO liên kết" style={{ maxWidth: '66%', marginBottom: 12 }}>
              <BBox>{receipt.po_code}</BBox>
            </Form.Item>
          )}

          {/* Row 3 — Ghi chú full width */}
          <Form.Item name="note" label="Ghi chú" style={{ marginBottom: 0 }}>
            {isView ? (
              <div style={{
                minHeight: 32, padding: '4px 11px',
                border: '1px solid var(--border, #d9d9d9)', borderRadius: 6,
                background: 'var(--bg-subtle)', fontSize: 14, userSelect: 'text',
                whiteSpace: 'pre-wrap', lineHeight: 1.5,
                color: receipt?.note ? undefined : 'var(--text-3, #bbb)',
              }}>
                {receipt?.note || '—'}
              </div>
            ) : (
              <Input.TextArea rows={2} placeholder="Ghi chú (tuỳ chọn)" />
            )}
          </Form.Item>
        </div>

        {/* ─── Card 2: Danh sách sản phẩm ──────────────────────────── */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '20px 24px', marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, color: 'var(--text-1)' }}>
            Danh sách sản phẩm
          </div>

          {isView ? (
            <ViewLinesTable
              lines={receipt?.lines ?? []}
              onViewSN={(line) => hook.setSerialsFor({ line_id: line.id, label: line.variant_name })}
            />
          ) : isEdit ? (
            <EditLinesTable hook={hook} />
          ) : (
            <CreateLinesTable hook={hook} />
          )}
        </div>

        {/* ─── Card 3: Nhập Serial Number ───────────────────────────── */}
        {hook.completeMode && (
          <div style={{
            background: 'var(--bg-card)', border: '2px solid var(--s-completed-color)',
            borderRadius: 8, padding: '20px 24px', marginBottom: 16,
          }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>
              Nhập Serial Number
            </div>

            {(receipt?.lines ?? []).filter((l: any) => l.product_type === 'storable').map((l: any) => (
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

            {(receipt?.lines ?? []).every((l: any) => l.product_type !== 'storable') && (
              <p style={{ color: 'var(--text-2)' }}>Không có dòng Thiết bị — bấm xác nhận để Complete.</p>
            )}

            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <Button onClick={() => hook.setCompleteMode(false)}>Huỷ</Button>
              <Button
                type="primary"
                onClick={hook.submitComplete}
                loading={hook.completeMutation.isPending}
                style={{ background: 'var(--s-completed-color)', borderColor: 'var(--s-completed-color)' }}
              >
                Xác nhận Complete
              </Button>
            </div>
          </div>
        )}

        {/* ─── Lý do hủy — chỉ hiện khi phiếu đã bị hủy ──────────────── */}
        {receipt?.status === 'cancelled' && (receipt?.cancel_reason || receipt?.cancel_attachments?.length > 0) && (
          <div style={{
            background: 'var(--s-cancelled-bg)', border: '1px solid var(--s-cancelled-color)',
            borderRadius: 8, padding: '20px 24px', marginBottom: 16,
          }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, color: 'var(--s-cancelled-color)' }}>
              Lý do hủy
            </div>
            {receipt.cancel_reason && (
              <div style={{ color: 'var(--text-1)', whiteSpace: 'pre-wrap', marginBottom: receipt.cancel_attachments?.length ? 12 : 0 }}>
                {receipt.cancel_reason}
              </div>
            )}
            {receipt.cancel_attachments?.length > 0 && (
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>Đính kèm:</div>
                <Space wrap>
                  {receipt.cancel_attachments.map((f: any, i: number) => (
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

        {/* ─── Bottom actions ───────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button onClick={() => hook.navigate('/receipts')}>Quay lại</Button>

          {!isView && (
            <Button
              type="primary"
              htmlType="submit"
              disabled={isEdit && !isDirty}
              loading={hook.createMutation.isPending || hook.updateMutation.isPending}
            >
              {isCreate ? 'Tạo phiếu nhập' : isDirty ? 'Lưu thay đổi' : 'Sửa'}
            </Button>
          )}
        </div>
      </Form>

      {/* ─── SN View Modal ────────────────────────────────────────────── */}
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
            { title: 'Trạng thái', dataIndex: 'status' },
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

      {/* ─── Cancel Modal ────────────────────────────────────────────── */}
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
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CreateLinesTable({ hook }: { hook: ReturnType<typeof useReceiptForm> }) {
  return (
    <Form.List name="lines">
      {(fields, { add, remove }) => (
        <>
          <div style={{ overflowX: 'auto' }}>
            <Table
              size="small"
              pagination={false}
              dataSource={fields.map((f) => ({ ...f, key: f.key }))}
              locale={{ emptyText: 'Chưa có dòng hàng' }}
              columns={[
                {
                  title: 'SKU / Tên sản phẩm',
                  width: 280,
                  render: (_: any, f: any) =>
                    hook.poId ? (
                      <Form.Item name={[f.name, 'variant_label']} noStyle>
                        <ReadOnlyText />
                      </Form.Item>
                    ) : (
                      <Form.Item name={[f.name, 'variant_id']} noStyle rules={[{ required: true, message: 'Chọn SKU' }]}>
                        <VariantSelect style={{ width: '100%' }} />
                      </Form.Item>
                    ),
                },
                {
                  title: 'Số lượng',
                  width: 100,
                  render: (_: any, f: any) => (
                    <Form.Item name={[f.name, 'quantity']} noStyle rules={[{ required: true }]}>
                      <InputNumber min={1} style={{ width: 80 }} />
                    </Form.Item>
                  ),
                },
                {
                  title: 'Giá nhập',
                  width: 140,
                  render: (_: any, f: any) => (
                    <Form.Item name={[f.name, 'cost_price']} noStyle rules={[{ required: true }]}>
                      <InputNumber {...moneyProps} min={0} style={{ width: 120 }} />
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
                  width: 60,
                  render: (_: any, f: any) => (
                    <>
                      {hook.poId && (
                        <Form.Item name={[f.name, 'variant_id']} hidden><Input /></Form.Item>
                      )}
                      <Form.Item name={[f.name, 'po_line_id']} hidden><Input /></Form.Item>
                      <Button size="small" danger onClick={() => remove(f.name)}>Xóa</Button>
                    </>
                  ),
                },
              ]}
            />
          </div>
          {!hook.poId && (
            <Button style={{ marginTop: 8 }} onClick={() => add({ quantity: 1 })}>
              + Thêm dòng
            </Button>
          )}
        </>
      )}
    </Form.List>
  )
}

function EditLinesTable({ hook }: { hook: ReturnType<typeof useReceiptForm> }) {
  return (
    <Form.List name="lines">
      {(fields) => (
        <div style={{ overflowX: 'auto' }}>
          <Table
            size="small"
            pagination={false}
            dataSource={fields.map((f) => ({ ...f, key: f.key }))}
            columns={[
              {
                title: 'Mã hàng',
                render: (_: any, f: any) => {
                  const line = hook.receipt?.lines?.[f.name]
                  return (
                    <span style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
                      {line?.item_code} — {line?.variant_name}
                    </span>
                  )
                },
              },
              {
                title: 'SL',
                width: 70,
                render: (_: any, f: any) => {
                  const line = hook.receipt?.lines?.[f.name]
                  return <span>{line?.quantity ?? '—'}</span>
                },
              },
              {
                title: 'Giá nhập',
                width: 150,
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
                width: 0,
                render: (_: any, f: any) => (
                  <Form.Item name={[f.name, 'id']} hidden><Input /></Form.Item>
                ),
              },
            ]}
          />
        </div>
      )}
    </Form.List>
  )
}

function ViewLinesTable({
  lines,
  onViewSN,
}: {
  lines: any[]
  onViewSN: (line: any) => void
}) {
  const thStyle: React.CSSProperties = {
    padding: '8px 10px', textAlign: 'left', fontSize: 13,
    fontWeight: 500, color: 'var(--text-2, #666)',
    background: 'var(--bg-subtle)',
    borderBottom: '1px solid var(--border, #f0f0f0)',
    whiteSpace: 'nowrap',
  }
  const tdStyle: React.CSSProperties = {
    padding: '8px 10px', fontSize: 14,
    borderBottom: '1px solid var(--border, #f0f0f0)',
    whiteSpace: 'nowrap',
  }

  const cols: { key: string; label: string; render: (l: any) => React.ReactNode }[] = [
    { key: 'code',     label: 'Mã hàng',       render: (l) => l.item_code ?? '—' },
    { key: 'name',     label: 'Tên',            render: (l) => l.variant_name ?? '—' },
    { key: 'qty',      label: 'SL',             render: (l) => fmt(l.quantity) },
    { key: 'price',    label: 'Giá nhập',       render: (l) => fmt(l.cost_price) },
    { key: 'mfg_wty', label: 'BH hãng (th)',   render: (l) => l.manufacturer_warranty_months != null ? String(l.manufacturer_warranty_months) : '—' },
    { key: 'cst_wty', label: 'BH cty (th)',    render: (l) => l.customer_warranty_months != null ? String(l.customer_warranty_months) : '—' },
    { key: 'qty_rem', label: 'Còn lại (lô)',   render: (l) => l.qty_remaining != null ? fmt(l.qty_remaining) : '—' },
    {
      key: 'sn',
      label: '',
      render: (l) =>
        l.product_type === 'storable' ? (
          <Button size="small" onClick={() => onViewSN(l)}>Xem SN</Button>
        ) : null,
    },
  ]

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {cols.map((c) => <th key={c.key} style={thStyle}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={l.id ?? i}>
              {cols.map((c) => <td key={c.key} style={tdStyle}>{c.render(l)}</td>)}
            </tr>
          ))}
          {lines.length === 0 && (
            <tr>
              <td colSpan={cols.length} style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-3, #bbb)', padding: '20px 0' }}>
                Không có sản phẩm
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
