import { useQuery } from '@tanstack/react-query'
import { Table, Input, Select, Switch, Tag, Form } from 'antd'
import { api } from '../lib/api'
import { useApiMutation } from '../hooks/useApiMutation'
import { useEntityModal } from '../hooks/useEntityModal'
import { PageHeader } from '../components/PageHeader'
import { EntityFormModal } from '../components/EntityFormModal'

export default function CategoriesPage() {
  const { open, editing, form, openCreate, openEdit, close } = useEntityModal()

  const { data, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await api.get('/products/categories')).data,
  })

  const createMutation = useApiMutation((values: any) => api.post('/products/categories', values), {
    successMessage: 'Tạo category thành công',
    invalidateKey: ['categories'],
    onSuccess: close,
  })

  const updateMutation = useApiMutation((values: any) => api.patch(`/products/categories/${editing.id}`, values), {
    successMessage: 'Cập nhật thành công',
    invalidateKey: ['categories'],
    onSuccess: close,
  })

  // Category cha — loại bỏ chính nó khỏi danh sách chọn (không tự làm cha của mình).
  const parentOptions = data?.filter((c: any) => c.id !== editing?.id).map((c: any) => ({ value: c.id, label: c.name }))

  return (
    <div>
      <PageHeader title="Category" actionLabel="+ Tạo category" onAction={openCreate} />

      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={data}
        pagination={false}
        onRow={(record: any) => ({ onClick: () => openEdit(record), style: { cursor: 'pointer' } })}
        columns={[
          { title: 'Tên', dataIndex: 'name' },
          { title: 'Mã viết tắt', dataIndex: 'short_code' },
          {
            title: 'Category cha',
            dataIndex: 'parent_id',
            render: (parentId: string) => data?.find((c: any) => c.id === parentId)?.name ?? '—',
          },
          {
            title: 'Active',
            dataIndex: 'is_active',
            render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Có' : 'Không'}</Tag>,
          },
        ]}
      />

      <EntityFormModal
        title={editing ? `Sửa category "${editing.name}"` : 'Tạo category mới'}
        open={open}
        onCancel={close}
        onFinish={(v) => (editing ? updateMutation.mutate(v) : createMutation.mutate(v))}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        form={form}
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
          <Select options={parentOptions} allowClear placeholder="Không có (category gốc)" />
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
