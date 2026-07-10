import { Table, Input, Select, Switch, Tag, Form, Button, Space, Popconfirm } from 'antd'
import { useCategories } from '../hooks/useCategories'
import { PageHeader } from '../components/PageHeader'
import { EntityFormModal } from '../components/EntityFormModal'

function buildTree(flat: any[]): any[] {
  const map: Record<string, any> = {}
  flat.forEach((c) => (map[c.id] = { ...c }))
  const roots: any[] = []
  flat.forEach((c) => {
    if (c.parent_id && map[c.parent_id]) {
      map[c.parent_id].children = [...(map[c.parent_id].children ?? []), map[c.id]]
    } else {
      roots.push(map[c.id])
    }
  })
  return roots
}

export default function CategoriesPage() {
  const hook = useCategories()
  const treeData = hook.data ? buildTree(hook.data) : []

  return (
    <div>
      <PageHeader title="Category" actionLabel="+ Tạo category" onAction={hook.openCreate} />

      <Table
        rowKey="id"
        loading={hook.isLoading}
        dataSource={treeData}
        pagination={false}
        expandable={{ defaultExpandAllRows: true }}
        columns={[
          { title: 'Tên', dataIndex: 'name' },
          { title: 'Mã viết tắt', dataIndex: 'short_code' },
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
        onFinish={(v) => {
          const payload = { ...v, parent_id: v.parent_id || null }
          hook.editing ? hook.updateMutation.mutate(payload) : hook.createMutation.mutate(payload)
        }}
        confirmLoading={hook.createMutation.isPending || hook.updateMutation.isPending}
        form={hook.form}
      >
        <Form.Item
          name="name"
          label="Tên category"
          rules={[{ required: true }]}
          getValueFromEvent={(e) => {
            const v = e.target.value
            return v.charAt(0).toUpperCase() + v.slice(1)
          }}
        >
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
