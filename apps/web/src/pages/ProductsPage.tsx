import { Table, Input, Select, Form, Popconfirm, Button, Divider, InputNumber } from 'antd'
import { ImageUpload } from '../components/ImageUpload'
import { PlusOutlined, EditOutlined, UnorderedListOutlined } from '@ant-design/icons'
import { useProducts } from '../hooks/useProducts'
import { PageHeader } from '../components/PageHeader'
import { TableCard } from '../components/ui/TableCard'
import { EntityFormModal } from '../components/EntityFormModal'

const PRODUCT_TYPES = [
  { value: 'storable', label: 'Lưu kho (có serial)' },
  { value: 'consumable', label: 'Vật tư tiêu hao' },
  { value: 'service', label: 'Dịch vụ' },
  { value: 'bundle', label: 'Gói sản phẩm' },
]

const UNITS = ['Cái', 'Chiếc', 'Bộ', 'Hộp', 'Cuộn', 'Mét', 'Cổng', 'License', 'Gói', 'Dây', 'Lần', 'Giờ', 'Ngày']

export default function ProductsPage() {
  const hook = useProducts()
  const productType = Form.useWatch('product_type', hook.form)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader
        title="Sản phẩm"
        actions={<Button type="primary" icon={<PlusOutlined />} onClick={() => hook.openCreate()}>Tạo mới</Button>}
      />
      <TableCard>
        <Table
          rowKey="id"
          loading={hook.isLoading}
          dataSource={hook.data?.data}
          pagination={{ current: hook.page, pageSize: 20, total: hook.data?.total, onChange: hook.setPage, showSizeChanger: false, showTotal: (t) => `Tổng ${t}` }}
          columns={[
            { title: 'STT', width: 52, align: 'center' as const, render: (_: any, __: any, i: number) => (hook.page - 1) * 20 + i + 1 },
            { title: 'Mã', dataIndex: 'code', width: 160 },
            { title: 'Tên', dataIndex: 'name' },
            { title: 'Loại', dataIndex: 'product_type', width: 130 },
            { title: 'Category', dataIndex: 'category_name', width: 130 },
            { title: 'Hãng', dataIndex: 'brand_name', width: 110 },
            {
              title: 'Hành động',
              width: 180,
              align: 'center' as const,
              render: (_: any, record: any) => (
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => hook.navigate(`/products/${record.id}?edit=1`)}
                  >
                    Sửa
                  </Button>
                  <Button
                    size="small"
                    icon={<UnorderedListOutlined />}
                    onClick={() => hook.navigate(`/products/${record.id}`)}
                  >
                    Xem SKU
                  </Button>
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
                </div>
              ),
            },
          ]}
        />
      </TableCard>

      {/* ── Modal tạo sản phẩm mới ── */}
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
          <Select showSearch optionFilterProp="label" options={hook.categories?.map((c: any) => ({ value: c.id, label: c.name }))} onChange={() => hook.suggestCode()} />
        </Form.Item>
        <Form.Item
          name="brand_id"
          label="Hãng"
          extra={!hook.brands?.length ? 'Chưa có hãng nào — vào trang Hãng để tạo trước.' : undefined}
        >
          <Select showSearch optionFilterProp="label" options={hook.brands?.map((b: any) => ({ value: b.id, label: b.name }))} onChange={() => hook.suggestCode()} allowClear />
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
          <Input onChange={(e) => {
            if (hook.form.getFieldValue('product_type') === 'service')
              hook.form.setFieldValue('sku', e.target.value)
          }} />
        </Form.Item>
        <Form.Item name="name" label="Tên" rules={[{ required: true }]}>
          <Input onChange={(e) => {
            if (hook.form.getFieldValue('product_type') === 'service')
              hook.form.setFieldValue('variant_name', e.target.value)
          }} />
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
        <Form.Item name="image_url" label="Hình ảnh">
          <ImageUpload />
        </Form.Item>

        {productType === 'service' && (
          <>
            <Divider orientation="left" style={{ fontSize: 13, color: '#888' }}>Thông tin SKU dịch vụ</Divider>
            <Form.Item name="sku" label="SKU" rules={[{ required: true, message: 'Nhập SKU cho dịch vụ' }]}
              extra="Tự điền từ Mã sản phẩm, có thể sửa">
              <Input />
            </Form.Item>
            <Form.Item name="variant_name" label="Tên SKU" rules={[{ required: true, message: 'Nhập tên SKU' }]}
              extra="Tự điền từ Tên, có thể sửa">
              <Input />
            </Form.Item>
            <Form.Item name="unit" label="Đơn vị" initialValue="Lần">
              <Select options={UNITS.map((u) => ({ value: u, label: u }))} showSearch allowClear />
            </Form.Item>
            <Form.Item name="sale_price" label="Giá dịch vụ">
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </>
        )}
      </EntityFormModal>

    </div>
  )
}
