import { useState } from 'react'
import { Table, Form, Input, Select, Switch, Button, Modal, Upload, Tag, Popconfirm } from 'antd'
import { UploadOutlined, PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useTemplates } from '../hooks/useTemplates'
import { useApiMutation } from '../hooks/useApiMutation'
import { api } from '../lib/api'
import { PageHeader } from '../components/ui/PageHeader'
import { TableCard } from '../components/ui/TableCard'
import { EntityFormModal } from '../components/EntityFormModal'
import TemplateMappingsPanel from '../components/TemplateMappingsPanel'

const OBJECT_TYPE_LABEL: Record<string, string> = {
  quotation: 'Báo giá',
  receipt: 'Phiếu nhập kho',
  delivery_order: 'Phiếu xuất kho',
}

function SectionCard({ title, children, extra }: { title: string; children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 15, fontWeight: 700, color: 'var(--text-1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>{title}</span>
        {extra}
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  )
}

// ── Mẫu điều khoản ──────────────────────────────────────────────────────────

function TermTemplatesSection() {
  const [form] = Form.useForm()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['term-templates'],
    queryFn: async () => (await api.get('/settings/term-templates')).data,
  })

  const saveMutation = useApiMutation(
    (values: any) => editing
      ? api.patch(`/settings/term-templates/${editing.id}`, values)
      : api.post('/settings/term-templates', values),
    {
      successMessage: editing ? 'Đã cập nhật' : 'Đã tạo mẫu điều khoản',
      onSuccess: () => { refetch(); setModalOpen(false); form.resetFields(); setEditing(null) },
    },
  )

  const deleteMutation = useApiMutation(
    (id: string) => api.delete(`/settings/term-templates/${id}`),
    { successMessage: 'Đã xoá', onSuccess: () => refetch() },
  )

  function openCreate() { setEditing(null); form.resetFields(); setModalOpen(true) }
  function openEdit(record: any) { setEditing(record); form.setFieldsValue({ name: record.name, content: record.content }); setModalOpen(true) }

  return (
    <>
      <SectionCard
        title="Mẫu điều khoản"
        extra={<Button type="primary" size="small" icon={<PlusOutlined />} onClick={openCreate}>Thêm mẫu</Button>}
      >
        <Table
          rowKey="id"
          loading={isLoading}
          dataSource={data ?? []}
          pagination={false}
          size="small"
          columns={[
            { title: 'Tên', dataIndex: 'name', render: (v: string) => <b>{v}</b> },
            {
              title: 'Nội dung',
              dataIndex: 'content',
              render: (v: string) => <span style={{ color: 'var(--text-2)', fontSize: 12 }}>{v?.length > 120 ? v.slice(0, 120) + '…' : v}</span>,
            },
            {
              title: '',
              width: 90,
              render: (_: any, record: any) => (
                <div style={{ display: 'flex', gap: 4 }}>
                  <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
                  <Popconfirm title="Xoá mẫu điều khoản này?" onConfirm={() => deleteMutation.mutate(record.id)} okText="Xoá" cancelText="Huỷ">
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </div>
              ),
            },
          ]}
        />
      </SectionCard>

      <Modal
        title={editing ? `Sửa mẫu "${editing.name}"` : 'Thêm mẫu điều khoản'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditing(null); form.resetFields() }}
        onOk={() => form.submit()}
        okText={editing ? 'Lưu' : 'Tạo'}
        confirmLoading={saveMutation.isPending}
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={(v) => saveMutation.mutate(v)}>
          <Form.Item name="name" label="Tên mẫu" rules={[{ required: true }]}>
            <Input placeholder="VD: Điều khoản thanh toán 30 ngày" />
          </Form.Item>
          <Form.Item name="content" label="Nội dung điều khoản" rules={[{ required: true }]}>
            <Input.TextArea rows={8} placeholder="Nhập nội dung điều khoản..." />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function TemplatesPage() {
  const hook = useTemplates()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader title="Cài đặt báo giá" />

      {/* ── Mẫu điều khoản ── */}
      <TermTemplatesSection />

      {/* ── Mẫu xuất file (báo giá / phiếu) ── */}
      <SectionCard
        title="Mẫu xuất file"
        extra={
          <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => hook.setUploadOpen(true)}>
            Tải lên template
          </Button>
        }
      >
        <Table
          rowKey="id"
          loading={hook.isLoading}
          dataSource={hook.data?.data}
          pagination={{ pageSize: 20, showSizeChanger: false, hideOnSinglePage: true }}
          onRow={(record: any) => ({
            onClick: () => { hook.setDetectedVariables(undefined); hook.openEdit(record) },
            style: { cursor: 'pointer' },
          })}
          columns={[
            { title: 'STT', width: 52, align: 'center' as const, render: (_: any, __: any, i: number) => i + 1 },
            { title: 'Tên', dataIndex: 'name' },
            { title: 'Loại đối tượng', dataIndex: 'object_type', render: (v) => OBJECT_TYPE_LABEL[v] ?? v },
            {
              title: 'Đang dùng',
              dataIndex: 'is_active',
              width: 100,
              render: (v: boolean, r: any) => (
                <Switch
                  checked={v}
                  onClick={(_, e) => e.stopPropagation()}
                  onChange={(checked) => hook.toggleMutation.mutate({ id: r.id, field: 'is_active', value: checked })}
                />
              ),
            },
            {
              title: 'Mặc định',
              dataIndex: 'is_default',
              width: 120,
              render: (v: boolean, r: any) =>
                v ? (
                  <Tag color="blue">Mặc định</Tag>
                ) : (
                  <Button size="small" onClick={(e) => { e.stopPropagation(); hook.toggleMutation.mutate({ id: r.id, field: 'is_default', value: true }) }}>
                    Đặt mặc định
                  </Button>
                ),
            },
            { title: 'Ngày tạo', dataIndex: 'created_at', render: (v) => new Date(v).toLocaleString('vi-VN') },
          ]}
        />
      </SectionCard>

      {/* ── Modals ── */}
      <Modal
        title="Tải lên template mới"
        open={hook.uploadOpen}
        onCancel={() => hook.setUploadOpen(false)}
        onOk={() => hook.uploadMutation.mutate()}
        okButtonProps={{ disabled: !hook.uploadName || !hook.uploadFile, loading: hook.uploadMutation.isPending }}
      >
        <Form layout="vertical">
          <Form.Item label="Tên template" required>
            <Input value={hook.uploadName} onChange={(e) => hook.setUploadName(e.target.value)} placeholder="VD: Báo giá VN" />
          </Form.Item>
          <Form.Item label="Loại đối tượng" required>
            <Select value={hook.uploadObjectType} onChange={hook.setUploadObjectType} options={Object.entries(OBJECT_TYPE_LABEL).map(([value, label]) => ({ value, label }))} />
          </Form.Item>
          <Form.Item label="File Excel (.xlsx)" required>
            <Upload beforeUpload={(file) => { hook.setUploadFile(file); return false }} onRemove={() => hook.setUploadFile(null)} maxCount={1} accept=".xlsx">
              <Button icon={<UploadOutlined />}>Chọn file .xlsx</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      <EntityFormModal
        title={hook.editing ? `Sửa template "${hook.editing.name}"` : ''}
        open={hook.open}
        onCancel={hook.close}
        onFinish={(v) => hook.updateMutation.mutate(v)}
        confirmLoading={hook.updateMutation.isPending}
        form={hook.form}
        width={900}
        extra={hook.editing && <TemplateMappingsPanel templateId={hook.editing.id} detectedVariables={hook.detectedVariables} />}
      >
        <Form.Item name="name" label="Tên template" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Loại đối tượng" className="form-row-full">
          <Input value={hook.editing ? OBJECT_TYPE_LABEL[hook.editing.object_type] ?? hook.editing.object_type : ''} disabled />
        </Form.Item>
      </EntityFormModal>
    </div>
  )
}
