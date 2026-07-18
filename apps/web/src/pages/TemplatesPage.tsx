import { Table, Form, Input, Select, Switch, Button, Modal, Upload, Tag } from 'antd'
import { UploadOutlined, PlusOutlined } from '@ant-design/icons'
import { useTemplates } from '../hooks/useTemplates'
import { PageHeader } from '../components/ui/PageHeader'
import { TableCard } from '../components/ui/TableCard'
import { EntityFormModal } from '../components/EntityFormModal'
import TemplateMappingsPanel from '../components/TemplateMappingsPanel'

const OBJECT_TYPE_LABEL: Record<string, string> = {
  quotation: 'Báo giá',
  receipt: 'Phiếu nhập kho',
  delivery_order: 'Phiếu xuất kho',
}

export default function TemplatesPage() {
  const hook = useTemplates()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader
        title="Mẫu báo giá / phiếu"
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => hook.setUploadOpen(true)}>
            Tải lên template
          </Button>
        }
      />

      <TableCard>
        <Table
          rowKey="id"
          loading={hook.isLoading}
          dataSource={hook.data?.data}
          pagination={{ pageSize: 20, showSizeChanger: false, hideOnSinglePage: true }}
          onRow={(record: any) => ({
            onClick: () => {
              hook.setDetectedVariables(undefined)
              hook.openEdit(record)
            },
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
                  <Button
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation()
                      hook.toggleMutation.mutate({ id: r.id, field: 'is_default', value: true })
                    }}
                  >
                    Đặt mặc định
                  </Button>
                ),
            },
            { title: 'Ngày tạo', dataIndex: 'created_at', render: (v) => new Date(v).toLocaleString('vi-VN') },
          ]}
        />
      </TableCard>

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
            <Select
              value={hook.uploadObjectType}
              onChange={hook.setUploadObjectType}
              options={Object.entries(OBJECT_TYPE_LABEL).map(([value, label]) => ({ value, label }))}
            />
          </Form.Item>
          <Form.Item label="File Excel (.xlsx)" required>
            <Upload
              beforeUpload={(file) => {
                hook.setUploadFile(file)
                return false
              }}
              onRemove={() => hook.setUploadFile(null)}
              maxCount={1}
              accept=".xlsx"
            >
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
