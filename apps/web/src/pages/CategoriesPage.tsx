import { Table, Input, Select, Switch, Tag, Form, Button, Space, Popconfirm } from 'antd'
import { useCategories } from '../hooks/useCategories'
import { PageHeader } from '../components/PageHeader'
import { EntityFormModal } from '../components/EntityFormModal'

export default function CategoriesPage() {
  const hook = useCategories()

  return (
    <div>
      <PageHeader title="Category" actionLabel="+ Tạo category" onAction={hook.openCreate} />

      <Table
        rowKey="id"
        loading={hook.isLoading}
        dataSource={hook.data}
        pagination={false}
        columns={[
          { title: 'Tên', dataIndex: 'name' },
          { title: 'Mã viết tắt', dataIndex: 'short_code' },
          {
            title: 'Category cha',
            dataIndex: 'parent_id',
            render: (parentId: string) => hook.data?.find((c: any) => c.id === parentId)?.name ?? '—',
          },
          {
            title: 'Active',
            dataIndex: 'is_active',
            render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Có' : 'Không'}</Tag>,
          },
          {
            title: '',
            width: 140,
            render: (_: any, record: any) => (
              <Space onClick={(e) => e.stopPropagation()}>
                <Button size="small" onClick={() => hook.openEdit(record)}>Sửa</Button>
                <Popconfirm title="Xoá category này?" onConfirm={() => hook.deleteMutation.mutate(record.id)} okText="Xoá" cancelText="Không">
                  <Button size="small" danger loading={hook.deleteMutation.isPending}>Xoá</Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <EntityFormModal
        title={hook.editing ? `Sửa category "${hook.editing.name}"` : 'Tạo category mới'}
        open={hook.open}
        onCancel={hook.close}
        onFinish={(v) => (hook.editing ? hook.updateMutation.mutate(v) : hook.createMutation.mutate(v))}
        confirmLoading={hook.createMutation.isPending || hook.updateMutation.isPending}
        form={hook.form}
      >
        <Form.Item name="name" label="Tên category" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item
          name="short_code"
          label="Mã viết tắt"
          extra="Dùng để gợi ý mã sản phẩm (VD: Switch -> SW)"
          rules={[{ required: true }]}
        >
          <Input style={{ textTransform: 'uppercase' }} />
        </Form.Item>
        <Form.Item name="parent_id" label="Category cha (tuỳ chọn)">
          <Select options={hook.parentOptions} allowClear placeholder="Không có (category gốc)" />
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
