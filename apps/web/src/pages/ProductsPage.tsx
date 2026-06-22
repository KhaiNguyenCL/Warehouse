import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Table, Input, Select, Form } from 'antd'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useApiMutation } from '../hooks/useApiMutation'
import { useEntityModal } from '../hooks/useEntityModal'
import { PageHeader } from '../components/PageHeader'
import { EntityFormModal } from '../components/EntityFormModal'

const PRODUCT_TYPES = [
  { value: 'storable', label: 'Storable (có serial)' },
  { value: 'consumable', label: 'Consumable' },
  { value: 'service', label: 'Service' },
  { value: 'bundle', label: 'Bundle' },
]

export default function ProductsPage() {
  const { open, form, openCreate, close } = useEntityModal()
  const [modelCode, setModelCode] = useState('')
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => (await api.get('/products')).data,
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await api.get('/products/categories')).data,
  })

  const { data: brands } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => (await api.get('/products/brands')).data,
  })

  const createMutation = useApiMutation((values: any) => api.post('/products', values), {
    successMessage: 'Tạo sản phẩm thành công — vào trang chi tiết để thêm variant (SKU)',
    invalidateKey: ['products'],
    onSuccess: () => {
      close()
      setModelCode('')
    },
  })

  // Gợi ý mã sản phẩm = category.short_code + brand.short_code + mã dòng sản phẩm (tự nhập) —
  // mã dòng sản phẩm dùng để phân biệt các dòng SP khác nhau của cùng category+brand (VD: Cisco
  // có nhiều dòng switch SG110/SG350 — chỉ category+brand sẽ bị trùng mã, cần thêm phần này).
  // Cùng pattern với "field đặc thù" của Variant.sku ở ProductDetailPage.tsx — áp dụng nhất
  // quán 2 tầng: mỗi tầng = mã tầng trên + phần tự nhập để phân biệt.
  function suggestCode(overrideModelCode?: string) {
    const categoryId = form.getFieldValue('category_id')
    const brandId = form.getFieldValue('brand_id')
    const category = categories?.find((c: any) => c.id === categoryId)
    const brand = brands?.find((b: any) => b.id === brandId)
    const model = overrideModelCode ?? modelCode
    if (category?.short_code && brand?.short_code) {
      const base = `${category.short_code}-${brand.short_code}`
      form.setFieldValue('code', model ? `${base}-${model}` : base)
    }
  }

  function closeAndResetModel() {
    close()
    setModelCode('')
  }

  return (
    <div>
      <PageHeader title="Sản phẩm" actionLabel="+ Tạo mới" onAction={openCreate} />

      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={data?.data}
        pagination={false}
        onRow={(record: any) => ({ onClick: () => navigate(`/products/${record.id}`), style: { cursor: 'pointer' } })}
        columns={[
          { title: 'Mã', dataIndex: 'code' },
          { title: 'Tên', dataIndex: 'name' },
          { title: 'Loại', dataIndex: 'product_type' },
          { title: 'Category', dataIndex: 'category_name' },
          { title: 'Hãng', dataIndex: 'brand_name' },
        ]}
      />

      <EntityFormModal
        title="Tạo sản phẩm mới"
        open={open}
        onCancel={closeAndResetModel}
        onFinish={(v) => createMutation.mutate(v)}
        confirmLoading={createMutation.isPending}
        form={form}
      >
        <Form.Item
          name="category_id"
          label="Category"
          rules={[{ required: true }]}
          extra={!categories?.length ? 'Chưa có category nào — vào trang Category để tạo trước.' : undefined}
        >
          <Select options={categories?.map((c: any) => ({ value: c.id, label: c.name }))} onChange={suggestCode} />
        </Form.Item>
        <Form.Item
          name="brand_id"
          label="Hãng"
          rules={[{ required: true }]}
          extra={!brands?.length ? 'Chưa có hãng nào — vào trang Hãng để tạo trước.' : undefined}
        >
          <Select options={brands?.map((b: any) => ({ value: b.id, label: b.name }))} onChange={suggestCode} />
        </Form.Item>
        <Form.Item
          name="model_number"
          label="Mã dòng sản phẩm"
          extra="Phân biệt các dòng SP khác nhau cùng Category+Hãng (VD: Cisco có nhiều dòng switch SG110, SG350...)"
        >
          <Input
            placeholder="VD: SG110"
            onChange={(e) => {
              setModelCode(e.target.value)
              suggestCode(e.target.value)
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
