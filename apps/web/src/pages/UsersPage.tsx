import { useQuery } from '@tanstack/react-query'
import { Table, Form, Input, Select, Switch, Tag } from 'antd'
import { api } from '../lib/api'
import { useApiMutation } from '../hooks/useApiMutation'
import { useEntityModal } from '../hooks/useEntityModal'
import { PageHeader } from '../components/PageHeader'
import { EntityFormModal } from '../components/EntityFormModal'

export default function UsersPage() {
  const { open, editing, form, openCreate, openEdit, close } = useEntityModal()

  const { data, isLoading } = useQuery({
    queryKey: ['settings', 'users'],
    queryFn: async () => (await api.get('/settings/users')).data,
  })

  const { data: roles } = useQuery({
    queryKey: ['settings', 'roles'],
    queryFn: async () => (await api.get('/settings/roles')).data,
  })

  const createMutation = useApiMutation((values: any) => api.post('/settings/users', values), {
    successMessage: 'Tạo user thành công',
    invalidateKey: ['settings', 'users'],
    onSuccess: close,
  })

  const updateMutation = useApiMutation(
    (values: any) => {
      // password để trống = không đổi password — không gửi field rỗng lên API.
      const body = { ...values }
      if (!body.password) delete body.password
      return api.patch(`/settings/users/${editing.id}`, body)
    },
    { successMessage: 'Cập nhật thành công', invalidateKey: ['settings', 'users'], onSuccess: close },
  )

  return (
    <div>
      <PageHeader title="Users" actionLabel="+ Tạo user" onAction={openCreate} />

      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={data?.data}
        pagination={false}
        onRow={(record: any) => ({ onClick: () => openEdit(record), style: { cursor: 'pointer' } })}
        columns={[
          { title: 'Họ tên', dataIndex: 'full_name' },
          { title: 'Email', dataIndex: 'email' },
          { title: 'SĐT', dataIndex: 'phone' },
          { title: 'Role', dataIndex: 'role_name' },
          {
            title: 'Active',
            dataIndex: 'is_active',
            render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Có' : 'Không'}</Tag>,
          },
        ]}
      />

      <EntityFormModal
        title={editing ? `Sửa user "${editing.full_name}"` : 'Tạo user mới'}
        open={open}
        onCancel={close}
        onFinish={(v) => (editing ? updateMutation.mutate(v) : createMutation.mutate(v))}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        form={form}
      >
        <Form.Item name="full_name" label="Họ tên" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        {!editing && (
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
        )}
        <Form.Item name="phone" label="SĐT">
          <Input />
        </Form.Item>
        <Form.Item name="role_id" label="Role" rules={[{ required: true }]}>
          <Select options={roles?.map((r: any) => ({ value: r.id, label: r.name }))} />
        </Form.Item>
        <Form.Item
          name="password"
          label={editing ? 'Đổi password (để trống nếu không đổi)' : 'Password'}
          rules={editing ? [] : [{ required: true, min: 6, message: 'Tối thiểu 6 ký tự' }]}
        >
          <Input.Password />
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
