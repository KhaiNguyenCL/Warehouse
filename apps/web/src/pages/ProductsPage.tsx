import { Table, Input, Select, Form, Popconfirm, Button } from 'antd'
import { useProducts } from '../hooks/useProducts'
import { PageHeader } from '../components/PageHeader'
import { EntityFormModal } from '../components/EntityFormModal'

const PRODUCT_TYPES = [
  { value: 'storable', label: 'Storable (có serial)' },
  { value: 'consumable', label: 'Consumable' },
  { value: 'service', label: 'Service' },
  { value: 'bundle', label: 'Bundle' },
]

export default function ProductsPage() {
  const hook = useProducts()

  return (
    <div>
      <PageHeader title="Sản phẩm" actionLabel="+ Tạo mới" onAction={hook.openCreate} />

      <Table
        rowKey="id"
        loading={hook.isLoading}
        dataSource={hook.data?.data}
        pagination={false}
        onRow={(record: any) => ({ onClick: () => hook.navigate(`/products/${record.id}`), style: { cursor: 'pointer' } })}
        columns={[
          { title: 'Mã', dataIndex: 'code' },
          { title: 'Tên', dataIndex: 'name' },
          { title: 'Loại', dataIndex: 'product_type' },
          { title: 'Category', dataIndex: 'category_name' },
          { title: 'Hãng', dataIndex: 'brand_name' },
          {
            title: '',
            width: 80,
            onCell: () => ({ onClick: (e: React.MouseEvent) => e.stopPropagation() }),
            render: (_: any, record: any) => (
              <Popconfirm
                title="Xóa sản phẩm này?"
                description="Không thể xóa nếu còn tồn kho."
                okText="Xóa"
                okButtonProps={{ danger: true }}
                cancelText="Hủy"
                onConfirm={() => hook.deleteMutation.mutate(record.id)}
              >
                <Button danger size="small" loading={hook.deleteMutation.isPending}>Xóa</Button>
              </Popconfirm>
            ),
          },
        ]}
      />

      <EntityFormModal
        title="Tạo sản phẩm mới"
        open={hook.open}
        onCancel={hook.closeAndResetModel}
        onFinish={(v) => hook.createMutation.mutate(v)}
        confirmLoading={hook.createMutation.isPending}
        form={hook.form}
      >
        <Form.Item
          name="category_id"
          label="Category"
          rules={[{ required: true }]}
          extra={!hook.categories?.length ? 'Chưa có category nào — vào trang Category để tạo trước.' : undefined}
        >
          <Select options={hook.categories?.map((c: any) => ({ value: c.id, label: c.name }))} onChange={() => hook.suggestCode()} />
        </Form.Item>
        <Form.Item
          name="brand_id"
          label="Hãng"
          rules={[{ required: true }]}
          extra={!hook.brands?.length ? 'Chưa có hãng nào — vào trang Hãng để tạo trước.' : undefined}
        >
          <Select options={hook.brands?.map((b: any) => ({ value: b.id, label: b.name }))} onChange={() => hook.suggestCode()} />
        </Form.Item>
        <Form.Item
          name="model_number"
          label="Mã dòng sản phẩm"
          extra="Phân biệt các dòng SP khác nhau cùng Category+Hãng (VD: Cisco có nhiều dòng switch SG110, SG350...)"
        >
          <Input
            placeholder="VD: SG110"
            onChange={(e) => {
              hook.setModelCode(e.target.value)
              hook.suggestCode(e.target.value)
            }}
          />
        </Form.Item>
        <Form.Item name="code" label="Mã sản phẩm (tự gợi ý, có thể sửa)" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="name" label="Tên" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="name_en" label="Tên (English)">
          <Input />
        </Form.Item>
        <Form.Item name="product_type" label="Loại" rules={[{ required: true }]}>
          <Select options={PRODUCT_TYPES} />
        </Form.Item>
        <Form.Item name="description" label="Mô tả">
          <Input.TextArea />
        </Form.Item>
        <Form.Item name="image_url" label="URL hình ảnh">
          <Input />
        </Form.Item>
      </EntityFormModal>
    </div>
  )
}
