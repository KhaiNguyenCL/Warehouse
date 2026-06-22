import { useQuery } from '@tanstack/react-query'
import { Table, Input, Select, Switch, Form } from 'antd'
import { api } from '../lib/api'
import { useApiMutation } from '../hooks/useApiMutation'
import { useEntityModal } from '../hooks/useEntityModal'
import { PageHeader } from '../components/PageHeader'
import { EntityFormModal } from '../components/EntityFormModal'
import { StatusTag } from '../components/StatusTag'

const TYPE_COLOR: Record<string, string> = { virtual: 'orange', physical: 'blue' }
const WAREHOUSE_TYPES = [
  { value: 'physical', label: 'Vật lý' },
  { value: 'virtual', label: 'Ảo (Demo/Bảo hành/Chờ QC...)' },
]

export default function WarehousesPage() {
  const { open, editing, form, openCreate, openEdit, close } = useEntityModal()

  const { data, isLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => (await api.get('/warehouses')).data,
  })

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get('/settings/users')).data,
  })

  // openCreate() gọi resetFields() bên trong useEntityModal — phải set lại default type
  // SAU khi gọi, không phải trước.
  function create() {
    openCreate()
    form.setFieldValue('type', 'physical')
  }

  const createMutation = useApiMutation((values: any) => api.post('/warehouses', values), {
    successMessage: 'Tạo kho thành công',
    invalidateKey: ['warehouses'],
    onSuccess: close,
  })

  const updateMutation = useApiMutation((values: any) => api.patch(`/warehouses/${editing.id}`, values), {
    successMessage: 'Cập nhật thành công',
    invalidateKey: ['warehouses'],
    onSuccess: close,
  })

  return (
    <div>
      <PageHeader title="Kho" actionLabel="+ Tạo kho" onAction={create} />

      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={data}
        pagination={false}
        onRow={(record: any) => ({ onClick: () => openEdit(record), style: { cursor: 'pointer' } })}
        columns={[
          { title: 'Mã', dataIndex: 'code' },
          { title: 'Tên', dataIndex: 'name' },
          {
            title: 'Loại',
            dataIndex: 'type',
            render: (t: string) => <StatusTag status={t} colorMap={TYPE_COLOR} />,
          },
          {
            title: 'Quản lý',
            dataIndex: 'manager_id',
            render: (id: string) => users?.data?.find((u: any) => u.id === id)?.full_name ?? '—',
          },
        ]}
      />

      <EntityFormModal
        title={editing ? `Sửa kho "${editing.name}"` : 'Tạo kho mới'}
        open={open}
        onCancel={close}
        onFinish={(v) => (editing ? updateMutation.mutate(v) : createMutation.mutate(v))}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        form={form}
      >
        <Form.Item name="code" label="Mã" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="name" label="Tên" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="type" label="Loại kho" rules={[{ required: true }]}>
          <Select options={WAREHOUSE_TYPES} />
        </Form.Item>
        <Form.Item name="address" label="Địa chỉ">
          <Input />
        </Form.Item>
        <Form.Item name="description" label="Mô tả">
          <Input.TextArea />
        </Form.Item>
        <Form.Item name="manager_id" label="Người quản lý">
          <Select
            allowClear
            options={users?.data?.map((u: any) => ({ value: u.id, label: u.full_name }))}
          />
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
