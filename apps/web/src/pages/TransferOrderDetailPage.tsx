import { useParams } from 'react-router-dom'
import { Button as AntButton, Modal, Input, Form } from 'antd'
import { ArrowLeft } from 'lucide-react'
import { useTransferOrderDetail } from '../hooks/useTransferOrderDetail'
import { StatusBadge } from '../components/ui/StatusBadge'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { usePageHeader } from '@/layout/PageHeaderSlot'
import CustomFieldsPanel from '../components/CustomFieldsPanel'
import ActivityTimeline from '../components/ActivityTimeline'
import { LineItemsTable } from '../components/LineItemsTable'
import { useState } from 'react'

const TRANSFER_TYPE_LABEL: Record<string, string> = {
  transfer: 'Chuyển kho thông thường', warranty_in: 'Nhận lại sau bảo hành',
  demo_in: 'Nhận lại sau demo', qc_pass: 'Hàng qua QC đạt', sn_ready: 'Đã nhập SN xong',
}

function SectionCard({ title, extra, children }: { title: string; extra?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>{title}</span>
        {extra}
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  )
}

const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: 'var(--text-2)', marginBottom: 4 }
// Luôn wrap xuống dòng (không cắt 1 dòng) — field CHỈ ĐỌC, không phải input cần giữ chiều cao
// cố định.
const valueStyle: React.CSSProperties = {
  fontSize: 14, color: 'var(--text-1)', minHeight: 32, display: 'flex', alignItems: 'flex-start',
  padding: '5px 11px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg-card)',
  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={style}><div style={labelStyle}>{label}</div><div style={valueStyle}>{children}</div></div>
}
function Val({ v }: { v?: React.ReactNode }) {
  return v != null && v !== '' ? <>{v}</> : <span style={{ color: 'var(--text-3)' }}>—</span>
}

export default function TransferOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const hook = useTransferOrderDetail(id!)
  const [noteForm] = Form.useForm()
  const [editingNote, setEditingNote] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)

  const d = hook.data
  const isDraft = d?.status === 'draft'
  const isClosed = ['completed', 'cancelled'].includes(d?.status ?? '')

  // usePageHeader là hook — PHẢI gọi vô điều kiện trước early return bên dưới (xem CLAUDE.md mục 22).
  usePageHeader(
    <div className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-2">
        <Button variant="ghost" size="icon-sm" onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="flex min-w-0 items-baseline gap-2 truncate text-sm font-semibold tracking-tight">
          <span className="text-muted-foreground">Phiếu chuyển kho</span>
          <span className="text-muted-foreground">/</span>
          <span className="truncate text-foreground">{d?.code}</span>
        </h1>
        {d?.status && <StatusBadge status={d.status} />}
      </div>

      <div className="flex flex-shrink-0 items-center gap-2">
        {isDraft && (
          <Button size="sm" variant="success" onClick={() => hook.setCompleteOpen(true)}>Complete</Button>
        )}
        {!isClosed && (
          <Button size="sm" variant="danger" onClick={() => setCancelOpen(true)} disabled={hook.cancelMutation.isPending}>
            Huỷ
          </Button>
        )}
      </div>
    </div>,
  )

  if (hook.isLoading || !d) return null

  const storableLines = (d.lines as any[]).filter((l: any) => l.product_type === 'storable')

  function startEditNote() { noteForm.setFieldsValue({ note: d.note }); setEditingNote(true) }
  function saveNote() { hook.updateMutation.mutate(noteForm.getFieldsValue()); setEditingNote(false) }

  return (
    <div className="theme-2a" style={{ padding: '10px 20px 40px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Huỷ phiếu này?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Đóng</AlertDialogCancel>
            <AlertDialogAction
              variant="danger"
              onClick={() => { hook.cancelMutation.mutate(); setCancelOpen(false) }}
            >
              Huỷ phiếu
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SectionCard title="Thông tin chung">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '16px 28px' }}>
          <Field label="Loại chuyển" style={{ gridColumn: 'span 3' }}><Val v={TRANSFER_TYPE_LABEL[d.transfer_type] ?? d.transfer_type} /></Field>
          <Field label="Kho nguồn" style={{ gridColumn: 'span 3' }}><Val v={d.from_warehouse_name} /></Field>
          <Field label="Kho đích" style={{ gridColumn: 'span 3' }}><Val v={d.to_warehouse_name} /></Field>
          <Field label="Ngày tạo" style={{ gridColumn: 'span 3' }}>
            <Val v={d.created_at ? new Date(d.created_at).toLocaleDateString('vi-VN') : undefined} />
          </Field>
          <Field label="Ghi chú" style={{ gridColumn: 'span 12' }}>
            {editingNote ? (
              <Form form={noteForm} style={{ width: '100%' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', width: '100%' }}>
                  <Form.Item name="note" noStyle>
                    <Input.TextArea rows={2} autoFocus style={{ flex: 1 }} />
                  </Form.Item>
                  <AntButton size="small" type="primary" onClick={saveNote} loading={hook.updateMutation.isPending}>Lưu</AntButton>
                  <AntButton size="small" onClick={() => setEditingNote(false)}>Huỷ</AntButton>
                </div>
              </Form>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Val v={d.note} />
                {isDraft && <AntButton type="link" size="small" onClick={startEditNote} style={{ padding: 0, height: 'auto' }}>Sửa</AntButton>}
              </div>
            )}
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Danh sách sản phẩm">
        <LineItemsTable
          cols={[
            { key: 'no', label: 'STT', align: 'center', width: 52, render: (_l, i) => i + 1 },
            { key: 'code', label: 'Mã hàng', width: 130, render: (l) => l.item_code },
            { key: 'name', label: 'Tên sản phẩm', render: (l) => l.variant_name },
            { key: 'type', label: 'Loại', width: 90, render: (l) => l.product_type },
            { key: 'qty', label: 'Số lượng', align: 'right', width: 80, render: (l) => l.quantity },
            { key: 'note', label: 'Ghi chú dòng', render: (l) => l.note || '—' },
          ]}
          rows={d.lines as any[]}
          rowKey={(l) => l.id}
        />
      </SectionCard>

      <CustomFieldsPanel objectType="transfer_order" objectId={id!} />

      <div style={{ marginTop: 24, padding: '16px 20px', border: '1px solid var(--border)', borderRadius: 8 }}>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Lịch sử hoạt động</div>
        <ActivityTimeline objectType="transfer_order" objectId={id!} />
      </div>

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
          <p style={{ color: 'var(--text-2)' }}>Không có dòng Thiết bị — bấm OK để Complete.</p>
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
