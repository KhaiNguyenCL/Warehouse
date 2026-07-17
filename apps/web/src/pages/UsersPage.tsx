import { Table, Form, Input, Select, Switch, Tag, Button } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useUsers } from '../hooks/useUsers'
import { PageHeader } from '../components/ui/PageHeader'
import { TableCard } from '../components/ui/TableCard'
import { EntityFormModal } from '../components/EntityFormModal'

export default function UsersPage() {
  const hook = useUsers()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader
        title="Người dùng"
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => hook.openCreate()}>
            Tạo user
          </Button>
        }
      />

      <TableCard>
        <Table
          rowKey="id"
          loading={hook.isLoading}
          dataSource={hook.data?.data}
          pagination={false}
          onRow={(record: any) => ({ onClick: () => hook.openEdit(record), style: { cursor: 'pointer' } })}
          columns={[
            { title: 'STT', width: 52, align: 'center' as const, render: (_: any, __: any, i: number) => i + 1 },
            { title: 'Họ tên', dataIndex: 'full_name' },
            { title: 'Email', dataIndex: 'email' },
            { title: 'SĐT', dataIndex: 'phone' },
            { title: 'Vai trò', dataIndex: 'role_name' },
            {
              title: 'Hoạt động',
              dataIndex: 'is_active',
              width: 90,
              render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Có' : 'Không'}</Tag>,
            },
          ]}
        />
      </TableCard>

      <EntityFormModal
        title={hook.editing ? `Sửa user "${hook.editing.full_name}"` : 'Tạo user mới'}
        open={hook.open}
        onCancel={hook.close}
        onFinish={(v) => (hook.editing ? hook.updateMutation.mutate(v) : hook.createMutation.mutate(v))}
        confirmLoading={hook.createMutation.isPending || hook.updateMutation.isPending}
        form={hook.form}
      >
        <Form.Item name="full_name" label="Họ tên" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        {!hook.editing && (
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
        )}
        <Form.Item name="phone" label="SĐT">
          <Input />
        </Form.Item>
        <Form.Item name="role_id" label="Role" rules={[{ required: true }]}>
          <Select options={hook.roles?.map((r: any) => ({ value: r.id, label: r.name }))} />
        </Form.Item>
        <Form.Item
          name="password"
          label={hook.editing ? 'Đổi password (để trống nếu không đổi)' : 'Password'}
          rules={hook.editing ? [] : [{ required: true, min: 6, message: 'Tối thiểu 6 ký tự' }]}
        >
          <Input.Password />
        </Form.Item>
        {hook.editing && (
          <Form.Item name="is_active" label="Active" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        )}
      </EntityFormModal>
    </div>
  )
}
