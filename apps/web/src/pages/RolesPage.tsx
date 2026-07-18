import { Table, Form, Input, Button, Popconfirm } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useRoles } from '../hooks/useRoles'
import { PageHeader } from '../components/ui/PageHeader'
import { TableCard } from '../components/ui/TableCard'
import { EntityFormModal } from '../components/EntityFormModal'
import RolePermissionsPanel from '../components/RolePermissionsPanel'

export default function RolesPage() {
  const hook = useRoles()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader
        title="Vai trò & Phân quyền"
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => hook.openCreate()}>
            Tạo role
          </Button>
        }
      />

      <TableCard>
        <Table
          rowKey="id"
          loading={hook.isLoading}
          dataSource={hook.data}
          pagination={{ pageSize: 20, showSizeChanger: false, hideOnSinglePage: true }}
          onRow={(record: any) => ({ onClick: () => hook.openEdit(record), style: { cursor: 'pointer' } })}
          columns={[
            { title: 'STT', width: 52, align: 'center' as const, render: (_: any, __: any, i: number) => i + 1 },
            { title: 'Tên', dataIndex: 'name' },
            { title: 'Mô tả', dataIndex: 'description' },
            { title: 'Hệ thống', dataIndex: 'is_system', render: (v: boolean) => (v ? 'Có' : '') },
            {
              title: '',
              width: 80,
              render: (_: any, r: any) =>
                !r.is_system && (
                  <Popconfirm
                    title="Xoá role này? (chỉ xoá được nếu không còn user nào dùng)"
                    onConfirm={(e) => {
                      e?.stopPropagation()
                      hook.deleteMutation.mutate(r.id)
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
      </TableCard>

      <EntityFormModal
        title={hook.editing ? `Sửa role "${hook.editing.name}"` : 'Tạo role mới'}
        open={hook.open}
        onCancel={hook.close}
        onFinish={(v) => (hook.editing ? hook.updateMutation.mutate(v) : hook.createMutation.mutate(v))}
        confirmLoading={hook.createMutation.isPending || hook.updateMutation.isPending}
        form={hook.form}
        width={900}
        extra={hook.editing && <RolePermissionsPanel roleId={hook.editing.id} />}
      >
        <Form.Item
          name="name"
          label="Tên role"
          rules={[{ required: true }]}
          extra={hook.editing?.is_system ? 'Role hệ thống — không đổi tên được' : undefined}
        >
          <Input disabled={hook.editing?.is_system} />
        </Form.Item>
        <Form.Item name="description" label="Mô tả" className="form-row-full">
          <Input.TextArea rows={2} />
        </Form.Item>
      </EntityFormModal>
    </div>
  )
}
