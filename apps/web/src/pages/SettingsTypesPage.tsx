// Quản lý import_types/export_types (Settings) — ReceiptsPage/DeliveryOrdersPage chỉ ĐỌC
// bảng này để hiện Select; trang này là nơi duy nhất tạo loại mới hoặc sửa requires_*.
import { useQuery } from '@tanstack/react-query'
import { Table, Form, Input, Select, Switch, Button, Popconfirm } from 'antd'
import { api } from '../lib/api'
import { useApiMutation } from '../hooks/useApiMutation'
import { useEntityModal } from '../hooks/useEntityModal'
import { PageHeader } from '../components/PageHeader'
import { EntityFormModal } from '../components/EntityFormModal'

const REQUIRES_COMPANY = [
  { value: 'none', label: 'Không cần' },
  { value: 'customer', label: 'Khách hàng' },
  { value: 'supplier', label: 'NCC' },
]
const REQUIRES_REF_DOCUMENT = [
  { value: 'none', label: 'Không cần' },
  { value: 'quotation', label: 'Quotation' },
  { value: 'stocktake_result', label: 'Stocktake Result' },
]

export default function SettingsTypesPage() {
  return (
    <div>
      <PageHeader title="Loại nhập / xuất kho" />
      <ImportTypesSection />
      <div style={{ marginTop: 40 }}>
        <ExportTypesSection />
      </div>
    </div>
  )
}

function ImportTypesSection() {
  const { open, editing, form, openCreate, openEdit, close } = useEntityModal()

  const { data, isLoading } = useQuery({
    queryKey: ['import-types'],
    queryFn: async () => (await api.get('/settings/import-types')).data,
  })

  const createMutation = useApiMutation((values: any) => api.post('/settings/import-types', values), {
    successMessage: 'Tạo loại nhập thành công',
    invalidateKey: ['import-types'],
    onSuccess: close,
  })
  const updateMutation = useApiMutation(
    (values: any) => api.patch(`/settings/import-types/${editing.id}`, values),
    { successMessage: 'Cập nhật thành công', invalidateKey: ['import-types'], onSuccess: close },
  )
  const deleteMutation = useApiMutation(
    (typeId: string) => api.delete(`/settings/import-types/${typeId}`),
    { successMessage: 'Đã xoá', invalidateKey: ['import-types'] },
  )

  return (
    <div>
      <PageHeader title="Loại nhập kho (import_types)" level={4} actionLabel="+ Tạo loại nhập" onAction={openCreate} />
      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={data}
        pagination={false}
        onRow={(record: any) => ({ onClick: () => openEdit(record), style: { cursor: 'pointer' } })}
        columns={[
          { title: 'Key', dataIndex: 'key' },
          { title: 'Label', dataIndex: 'label' },
          { title: 'Cần đối tác', dataIndex: 'requires_company' },
          { title: 'Cần tham chiếu', dataIndex: 'requires_ref_document' },
          { title: 'Active', dataIndex: 'is_active', render: (v: boolean) => (v ? 'Có' : 'Không') },
          { title: 'Hệ thống', dataIndex: 'is_system', render: (v: boolean) => (v ? 'Có' : '') },
          {
            title: '',
            render: (_: any, r: any) =>
              !r.is_system && (
                <Popconfirm
                  title="Xoá loại nhập này?"
                  onConfirm={(e) => {
                    e?.stopPropagation()
                    deleteMutation.mutate(r.id)
                  }}
                >
                  <Button size="small" danger onClick={(e) => e.stopPropagation()}>
                    Xoá
                  </Button>
                </Popconfirm>
              ),
          },
        ]}
      />

      <EntityFormModal
        title={editing ? `Sửa loại nhập "${editing.label}"` : 'Tạo loại nhập mới'}
        open={open}
        onCancel={close}
        onFinish={(v) => (editing ? updateMutation.mutate(v) : createMutation.mutate(v))}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        form={form}
      >
        {!editing && (
          <Form.Item name="key" label="Key" rules={[{ required: true }]} extra="Không sửa được sau khi tạo">
            <Input />
          </Form.Item>
        )}
        <Form.Item name="label" label="Label" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item
          name="parent_key"
          label="Parent key (tuỳ chọn)"
          extra="1 trong 3 key hệ thống: purchase/return_in/adjustment — để service xử lý đúng hành vi"
        >
          <Input />
        </Form.Item>
        <Form.Item name="requires_company" label="Cần đối tác" initialValue="none">
          <Select options={REQUIRES_COMPANY} />
        </Form.Item>
        <Form.Item name="requires_ref_document" label="Cần tham chiếu" initialValue="none">
          <Select options={REQUIRES_REF_DOCUMENT} />
        </Form.Item>
        {editing && (
          <Form.Item name="is_active" label="Active" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        )}
      </EntityFormModal>
    </div>
  )
}

function ExportTypesSection() {
  const { open, editing, form, openCreate, openEdit, close } = useEntityModal()

  const { data, isLoading } = useQuery({
    queryKey: ['export-types'],
    queryFn: async () => (await api.get('/settings/export-types')).data,
  })

  const createMutation = useApiMutation((values: any) => api.post('/settings/export-types', values), {
    successMessage: 'Tạo loại xuất thành công',
    invalidateKey: ['export-types'],
    onSuccess: close,
  })
  const updateMutation = useApiMutation(
    (values: any) => api.patch(`/settings/export-types/${editing.id}`, values),
    { successMessage: 'Cập nhật thành công', invalidateKey: ['export-types'], onSuccess: close },
  )
  const deleteMutation = useApiMutation(
    (typeId: string) => api.delete(`/settings/export-types/${typeId}`),
    { successMessage: 'Đã xoá', invalidateKey: ['export-types'] },
  )

  return (
    <div>
      <PageHeader title="Loại xuất kho (export_types)" level={4} actionLabel="+ Tạo loại xuất" onAction={openCreate} />
      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={data}
        pagination={false}
        onRow={(record: any) => ({ onClick: () => openEdit(record), style: { cursor: 'pointer' } })}
        columns={[
          { title: 'Key', dataIndex: 'key' },
          { title: 'Label', dataIndex: 'label' },
          { title: 'Cần đối tác', dataIndex: 'requires_company' },
          { title: 'Cần Quotation', dataIndex: 'requires_quotation', render: (v: boolean) => (v ? 'Có' : '') },
          { title: 'Active', dataIndex: 'is_active', render: (v: boolean) => (v ? 'Có' : 'Không') },
          { title: 'Hệ thống', dataIndex: 'is_system', render: (v: boolean) => (v ? 'Có' : '') },
          {
            title: '',
            render: (_: any, r: any) =>
              !r.is_system && (
                <Popconfirm
                  title="Xoá loại xuất này?"
                  onConfirm={(e) => {
                    e?.stopPropagation()
                    deleteMutation.mutate(r.id)
                  }}
                >
                  <Button size="small" danger onClick={(e) => e.stopPropagation()}>
                    Xoá
                  </Button>
                </Popconfirm>
              ),
          },
        ]}
      />

      <EntityFormModal
        title={editing ? `Sửa loại xuất "${editing.label}"` : 'Tạo loại xuất mới'}
        open={open}
        onCancel={close}
        onFinish={(v) => (editing ? updateMutation.mutate(v) : createMutation.mutate(v))}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        form={form}
      >
        {!editing && (
          <Form.Item name="key" label="Key" rules={[{ required: true }]} extra="Không sửa được sau khi tạo">
            <Input />
          </Form.Item>
        )}
        <Form.Item name="label" label="Label" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item
          name="parent_key"
          label="Parent key (tuỳ chọn)"
          extra="1 trong 7 key hệ thống (sale/internal/demo_out/warranty_out/return_out/dispose/adjustment)"
        >
          <Input />
        </Form.Item>
        <Form.Item name="requires_company" label="Cần đối tác" initialValue="none">
          <Select options={REQUIRES_COMPANY} />
        </Form.Item>
        <Form.Item name="requires_quotation" label="Cần Quotation" valuePropName="checked" initialValue={false}>
          <Switch />
        </Form.Item>
        {editing && (
          <Form.Item name="is_active" label="Active" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        )}
      </EntityFormModal>
    </div>
  )
}
