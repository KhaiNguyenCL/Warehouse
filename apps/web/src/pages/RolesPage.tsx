import { useQuery } from '@tanstack/react-query'
import { Table, Form, Input, Button, Popconfirm } from 'antd'
import { api } from '../lib/api'
import { useApiMutation } from '../hooks/useApiMutation'
import { useEntityModal } from '../hooks/useEntityModal'
import { PageHeader } from '../components/PageHeader'
import { EntityFormModal } from '../components/EntityFormModal'
import RolePermissionsPanel from '../components/RolePermissionsPanel'

export default function RolesPage() {
  const { open, editing, form, openCreate, openEdit, close } = useEntityModal()

  const { data, isLoading } = useQuery({
    queryKey: ['settings', 'roles'],
    queryFn: async () => (await api.get('/settings/roles')).data,
  })

  const createMutation = useApiMutation((values: any) => api.post('/settings/roles', values), {
    successMessage: 'Tạo role thành công',
    invalidateKey: ['settings', 'roles'],
    onSuccess: close,
  })

  const updateMutation = useApiMutation((values: any) => api.patch(`/settings/roles/${editing.id}`, values), {
    successMessage: 'Cập nhật thành công',
    invalidateKey: ['settings', 'roles'],
    onSuccess: close,
  })

  const deleteMutation = useApiMutation((roleId: string) => api.delete(`/settings/roles/${roleId}`), {
    successMessage: 'Đã xoá role',
    invalidateKey: ['settings', 'roles'],
  })

  return (
    <div>
      <PageHeader title="Roles & Permissions" actionLabel="+ Tạo role" onAction={openCreate} />

      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={data}
        pagination={false}
        onRow={(record: any) => ({ onClick: () => openEdit(record), style: { cursor: 'pointer' } })}
        columns={[
          { title: 'Tên', dataIndex: 'name' },
          { title: 'Mô tả', dataIndex: 'description' },
          { title: 'Hệ thống', dataIndex: 'is_system', render: (v: boolean) => (v ? 'Có' : '') },
          {
            title: '',
            render: (_: any, r: any) =>
              !r.is_system && (
                <Popconfirm
                  title="Xoá role này? (chỉ xoá được nếu không còn user nào dùng)"
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
        title={editing ? `Sửa role "${editing.name}"` : 'Tạo role mới'}
        open={open}
        onCancel={close}
        onFinish={(v) => (editing ? updateMutation.mutate(v) : createMutation.mutate(v))}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        form={form}
        width={900}
        extra={editing && <RolePermissionsPanel roleId={editing.id} />}
      >
        <Form.Item
          name="name"
          label="Tên role"
          rules={[{ required: true }]}
          extra={editing?.is_system ? 'Role hệ thống — không đổi tên được' : undefined}
        >
          <Input disabled={editing?.is_system} />
        </Form.Item>
        <Form.Item name="description" label="Mô tả" className="form-row-full">
          <Input.TextArea rows={2} />
        </Form.Item>
      </EntityFormModal>
    </div>
  )
}
