// Quản lý document_templates (CLAUDE.md mục 14): upload file Excel, hệ thống detect biến,
// admin map biến → field. Export thực tế (Xuất Excel/PDF) đã làm ở QuotationDetailPage —
// trang này chỉ quản lý template + mapping, không export trực tiếp ở đây.
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Table, Form, Input, Select, Switch, Button, Modal, Upload, Tag, message } from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import { api } from '../lib/api'
import { useApiMutation } from '../hooks/useApiMutation'
import { useEntityModal } from '../hooks/useEntityModal'
import { PageHeader } from '../components/PageHeader'
import { EntityFormModal } from '../components/EntityFormModal'
import TemplateMappingsPanel from '../components/TemplateMappingsPanel'

const OBJECT_TYPE_LABEL: Record<string, string> = {
  quotation: 'Báo giá',
  receipt: 'Phiếu nhập kho',
  delivery_order: 'Phiếu xuất kho',
}

export default function TemplatesPage() {
  const qc = useQueryClient()
  const { open, editing, form, openEdit, close } = useEntityModal()
  const [detectedVariables, setDetectedVariables] = useState<string[] | undefined>(undefined)

  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadName, setUploadName] = useState('')
  const [uploadObjectType, setUploadObjectType] = useState<string>('quotation')
  const [uploadFile, setUploadFile] = useState<File | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => (await api.get('/templates')).data,
  })

  // Cần đọc response (detected_variables, id) để mở luôn mapping editor sau khi upload —
  // useApiMutation không trả data qua onSuccess nên dùng useMutation trực tiếp ở đây.
  const uploadMutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData()
      fd.append('name', uploadName)
      fd.append('object_type', uploadObjectType)
      fd.append('file', uploadFile as File)
      return (await api.post('/templates', fd)).data
    },
    onSuccess: (template: any) => {
      message.success('Tải lên template thành công')
      qc.invalidateQueries({ queryKey: ['templates'] })
      setUploadOpen(false)
      setUploadName('')
      setUploadFile(null)
      setDetectedVariables(template.detected_variables)
      openEdit(template)
    },
    onError: (err: any) => message.error(err.response?.data?.error ?? 'Lỗi'),
  })

  const updateMutation = useApiMutation((values: any) => api.patch(`/templates/${editing.id}`, values), {
    successMessage: 'Cập nhật thành công',
    invalidateKey: ['templates'],
    onSuccess: close,
  })

  const toggleMutation = useApiMutation(
    (vars: { id: string; field: 'is_active' | 'is_default'; value: boolean }) =>
      api.patch(`/templates/${vars.id}`, { [vars.field]: vars.value }),
    { successMessage: 'Cập nhật thành công', invalidateKey: ['templates'] },
  )

  return (
    <div>
      <PageHeader title="Template báo giá / phiếu" actionLabel="+ Tải lên template" onAction={() => setUploadOpen(true)} />

      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={data?.data}
        pagination={false}
        onRow={(record: any) => ({
          onClick: () => {
            setDetectedVariables(undefined)
            openEdit(record)
          },
          style: { cursor: 'pointer' },
        })}
        columns={[
          { title: 'Tên', dataIndex: 'name' },
          { title: 'Loại đối tượng', dataIndex: 'object_type', render: (v) => OBJECT_TYPE_LABEL[v] ?? v },
          {
            title: 'Đang dùng',
            dataIndex: 'is_active',
            render: (v: boolean, r: any) => (
              <Switch
                checked={v}
                onClick={(_, e) => e.stopPropagation()}
                onChange={(checked) => toggleMutation.mutate({ id: r.id, field: 'is_active', value: checked })}
              />
            ),
          },
          {
            title: 'Mặc định',
            dataIndex: 'is_default',
            render: (v: boolean, r: any) =>
              v ? (
                <Tag color="blue">Mặc định</Tag>
              ) : (
                <Button size="small" onClick={(e) => { e.stopPropagation(); toggleMutation.mutate({ id: r.id, field: 'is_default', value: true }) }}>
                  Đặt mặc định
                </Button>
              ),
          },
          { title: 'Ngày tạo', dataIndex: 'created_at', render: (v) => new Date(v).toLocaleString('vi-VN') },
        ]}
      />

      <Modal
        title="Tải lên template mới"
        open={uploadOpen}
        onCancel={() => setUploadOpen(false)}
        onOk={() => uploadMutation.mutate()}
        okButtonProps={{ disabled: !uploadName || !uploadFile, loading: uploadMutation.isPending }}
      >
        <Form layout="vertical">
          <Form.Item label="Tên template" required>
            <Input value={uploadName} onChange={(e) => setUploadName(e.target.value)} placeholder="VD: Báo giá VN" />
          </Form.Item>
          <Form.Item label="Loại đối tượng" required>
            <Select
              value={uploadObjectType}
              onChange={setUploadObjectType}
              options={Object.entries(OBJECT_TYPE_LABEL).map(([value, label]) => ({ value, label }))}
            />
          </Form.Item>
          <Form.Item label="File Excel (.xlsx)" required>
            <Upload
              beforeUpload={(file) => {
                setUploadFile(file)
                return false
              }}
              onRemove={() => setUploadFile(null)}
              maxCount={1}
              accept=".xlsx"
            >
              <Button icon={<UploadOutlined />}>Chọn file .xlsx</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      <EntityFormModal
        title={editing ? `Sửa template "${editing.name}"` : ''}
        open={open}
        onCancel={close}
        onFinish={(v) => updateMutation.mutate(v)}
        confirmLoading={updateMutation.isPending}
        form={form}
        width={900}
        extra={editing && <TemplateMappingsPanel templateId={editing.id} detectedVariables={detectedVariables} />}
      >
        <Form.Item name="name" label="Tên template" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Loại đối tượng" className="form-row-full">
          <Input value={editing ? OBJECT_TYPE_LABEL[editing.object_type] ?? editing.object_type : ''} disabled />
        </Form.Item>
      </EntityFormModal>
    </div>
  )
}
