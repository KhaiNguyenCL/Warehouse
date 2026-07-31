import { useParams } from 'react-router-dom'
import { Table, Button, Popconfirm, Modal, Input, Form } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useTransferOrderDetail } from '../hooks/useTransferOrderDetail'
import { PageHeader } from '../components/ui/PageHeader'
import { StatusBadge } from '../components/ui/StatusBadge'
import CustomFieldsPanel from '../components/CustomFieldsPanel'
import { useState } from 'react'

const TRANSFER_TYPE_LABEL: Record<string, string> = {
  transfer: 'Chuyển kho thông thường', warranty_in: 'Nhận lại sau bảo hành',
  demo_in: 'Nhận lại sau demo', qc_pass: 'Hàng qua QC đạt', sn_ready: 'Đã nhập SN xong',
}

function SectionCard({ title, extra, children }: { title: string; extra?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>{title}</span>
        {extra}
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  )
}

const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'var(--text-2)', marginBottom: 4 }
const valueStyle: React.CSSProperties = { fontSize: 14, color: 'var(--text-1)', minHeight: 28, display: 'flex', alignItems: 'center' }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><div style={labelStyle}>{label}</div><div style={valueStyle}>{children}</div></div>
}
function Val({ v }: { v?: React.ReactNode }) {
  return v != null && v !== '' ? <>{v}</> : <span style={{ color: 'var(--text-3)' }}>—</span>
}

export default function TransferOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const hook = useTransferOrderDetail(id!)
  const [noteForm] = Form.useForm()
  const [editingNote, setEditingNote] = useState(false)

  if (hook.isLoading || !hook.data) return null

  const d = hook.data
  const isDraft = d.status === 'draft'
  const isClosed = ['completed', 'cancelled'].includes(d.status)
  const storableLines = (d.lines as any[]).filter((l: any) => l.product_type === 'storable')

  function startEditNote() { noteForm.setFieldsValue({ note: d.note }); setEditingNote(true) }
  function saveNote() { hook.updateMutation.mutate(noteForm.getFieldsValue()); setEditingNote(false) }

  return (
    <div style={{ padding: '10px 20px 40px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <PageHeader
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {d.code}
            <StatusBadge status={d.status} />
          </span>
        }
        meta={
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => window.history.back()} style={{ padding: '0 4px' }}>
            Phiếu chuyển kho
          </Button>
        }
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            {isDraft && (
              <Button type="primary" onClick={() => hook.setCompleteOpen(true)}>Complete</Button>
            )}
            {!isClosed && (
              <Popconfirm title="Huỷ phiếu này?" onConfirm={() => hook.cancelMutation.mutate()}>
                <Button danger loading={hook.cancelMutation.isPending}>Huỷ</Button>
              </Popconfirm>
            )}
          </div>
        }
      />

      <SectionCard title="Thông tin chung">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px 28px' }}>
          <Field label="Loại chuyển"><Val v={TRANSFER_TYPE_LABEL[d.transfer_type] ?? d.transfer_type} /></Field>
          <Field label="Kho nguồn"><Val v={d.from_warehouse_name} /></Field>
          <Field label="Kho đích"><Val v={d.to_warehouse_name} /></Field>
          <Field label="Ngày tạo">
            <Val v={d.created_at ? new Date(d.created_at).toLocaleDateString('vi-VN') : undefined} />
          </Field>
          <Field label="Ghi chú" style={{ gridColumn: 'span 2' } as any}>
            {editingNote ? (
              <Form form={noteForm} style={{ width: '100%' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', width: '100%' }}>
                  <Form.Item name="note" noStyle>
                    <Input.TextArea rows={2} autoFocus style={{ flex: 1 }} />
                  </Form.Item>
                  <Button size="small" type="primary" onClick={saveNote} loading={hook.updateMutation.isPending}>Lưu</Button>
                  <Button size="small" onClick={() => setEditingNote(false)}>Huỷ</Button>
                </div>
              </Form>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Val v={d.note} />
                {isDraft && <Button type="link" size="small" onClick={startEditNote} style={{ padding: 0, height: 'auto' }}>Sửa</Button>}
              </div>
            )}
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Danh sách sản phẩm">
        <Table
          rowKey="id"
          size="small"
          dataSource={d.lines}
          pagination={false}
          scroll={{ x: 'max-content' }}
          columns={[
            { title: 'STT', width: 52, align: 'center' as const, render: (_: any, __: any, i: number) => i + 1 },
            { title: 'Mã hàng', dataIndex: 'item_code', width: 130 },
            { title: 'Tên sản phẩm', dataIndex: 'variant_name' },
            { title: 'Loại', dataIndex: 'product_type', width: 90 },
            { title: 'Số lượng', dataIndex: 'quantity', width: 80, align: 'right' as const },
            { title: 'Ghi chú dòng', dataIndex: 'note', render: (v: string) => v || '—' },
          ]}
        />
      </SectionCard>

      <CustomFieldsPanel objectType="transfer_order" objectId={id!} />

      {/* Modal nhập Serial Number khi Complete */}
      <Modal
        title="Complete — nhập Serial Number"
        open={hook.completeOpen}
        onCancel={() => hook.setCompleteOpen(false)}
        onOk={hook.submitComplete}
        confirmLoading={hook.completeMutation.isPending}
        okText="Xác nhận Complete"
        width={600}
      >
        {storableLines.length === 0 && (
          <p style={{ color: 'var(--text-2)' }}>Không có dòng storable — bấm OK để Complete.</p>
        )}
        {storableLines.map((l: any) => (
          <div key={l.id} style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{l.variant_name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 8 }}>
              Cần đúng <strong>{l.quantity}</strong> serial — mỗi dòng 1 serial
            </div>
            <Input.TextArea
              rows={4}
              value={hook.serialsText[l.id] ?? ''}
              onChange={(e) => hook.setSerialsText((prev) => ({ ...prev, [l.id]: e.target.value }))}
              placeholder={'SN-001\nSN-002\n...'}
            />
          </div>
        ))}
      </Modal>
    </div>
  )
}
