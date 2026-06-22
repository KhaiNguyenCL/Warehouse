import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Table, Input, InputNumber, Select, Switch, Tag, Typography, Form, message } from 'antd'
import { api } from '../lib/api'
import { useApiMutation } from '../hooks/useApiMutation'
import { useEntityModal } from '../hooks/useEntityModal'
import { PageHeader } from '../components/PageHeader'
import { EntityFormModal } from '../components/EntityFormModal'
import CustomFieldsPanel from '../components/CustomFieldsPanel'

const PRODUCT_TYPES = [
  { value: 'storable', label: 'Storable (có serial)' },
  { value: 'consumable', label: 'Consumable' },
  { value: 'service', label: 'Service' },
  { value: 'bundle', label: 'Bundle' },
]

// specifications là JSONB tự do (vd { "ram": "16GB", "ports": 24 }) — cho nhập dạng JSON
// thô qua textarea thay vì dựng form key/value động, đơn giản hơn cho UI test này.
function parseSpecifications(text: string | undefined) {
  if (!text?.trim()) return undefined
  try {
    return JSON.parse(text)
  } catch {
    throw { statusCode: 400, message: 'Specifications phải là JSON hợp lệ, vd: {"ram": "16GB"}' }
  }
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const variantModal = useEntityModal()
  const productModal = useEntityModal()

  const { data, isLoading } = useQuery({
    queryKey: ['products', id],
    queryFn: async () => (await api.get(`/products/${id}`)).data,
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await api.get('/products/categories')).data,
  })

  const { data: brands } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => (await api.get('/products/brands')).data,
  })

  const createVariant = useApiMutation((values: any) => api.post(`/products/${id}/variants`, values), {
    successMessage: 'Tạo SKU thành công',
    invalidateKey: ['products', id],
    onSuccess: variantModal.close,
  })

  const updateVariant = useApiMutation(
    (values: any) => api.patch(`/products/${id}/variants/${variantModal.editing.id}`, values),
    { successMessage: 'Cập nhật SKU thành công', invalidateKey: ['products', id], onSuccess: variantModal.close },
  )

  const updateProduct = useApiMutation((values: any) => api.patch(`/products/${id}`, values), {
    successMessage: 'Cập nhật sản phẩm thành công',
    invalidateKey: ['products', id],
    onSuccess: productModal.close,
  })

  function submitVariant(values: any) {
    let specifications
    try {
      specifications = parseSpecifications(values.specifications)
    } catch (err: any) {
      message.error(err.message)
      return
    }
    const body = { ...values, specifications }
    if (variantModal.editing) updateVariant.mutate(body)
    else createVariant.mutate(body)
  }

  function openEditVariant(variant: any) {
    variantModal.openEdit(variant, {
      ...variant,
      specifications: variant.specifications ? JSON.stringify(variant.specifications, null, 2) : undefined,
    })
  }

  if (isLoading || !data) return null

  return (
    <div>
      <PageHeader
        title={
          <>
            {data.name} <Typography.Text type="secondary">({data.product_type})</Typography.Text>
          </>
        }
        actionLabel="Sửa thông tin"
        onAction={() => productModal.openEdit(data)}
      />

      <PageHeader
        title="Variants (SKU)"
        level={4}
        actionLabel={data.product_type !== 'service' ? '+ Thêm SKU' : undefined}
        onAction={variantModal.openCreate}
      />

      <Table
        rowKey="id"
        dataSource={data.variants}
        pagination={false}
        onRow={(record: any) => ({ onClick: () => openEditVariant(record), style: { cursor: 'pointer' } })}
        columns={[
          { title: 'SKU', dataIndex: 'sku' },
          { title: 'Tên', dataIndex: 'name' },
          { title: 'Đơn vị', dataIndex: 'unit' },
          { title: 'Giá nhập gợi ý', dataIndex: 'cost_price' },
          { title: 'Giá bán gợi ý', dataIndex: 'sale_price' },
          { title: 'Bảo hành (tháng)', dataIndex: 'warranty_months' },
          { title: 'Cân nặng (kg)', dataIndex: 'weight_kg' },
          { title: 'Điểm đặt lại', dataIndex: 'reorder_point' },
          {
            title: 'Active',
            dataIndex: 'is_active',
            render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Có' : 'Không'}</Tag>,
          },
        ]}
      />

      <EntityFormModal
        title={variantModal.editing ? `Sửa SKU "${variantModal.editing.sku}"` : 'Thêm SKU mới'}
        open={variantModal.open}
        onCancel={variantModal.close}
        onFinish={submitVariant}
        confirmLoading={createVariant.isPending || updateVariant.isPending}
        form={variantModal.form}
      >
        {!variantModal.editing && (
          <Form.Item
            label="Field đặc thù"
            extra={`Gợi ý SKU = "${data.code}" + field đặc thù (VD: 16GB) — sửa lại ô SKU dưới nếu cần`}
          >
            <Input
              placeholder="VD: 16GB"
              onChange={(e) =>
                variantModal.form.setFieldValue('sku', e.target.value ? `${data.code}-${e.target.value}` : data.code)
              }
            />
          </Form.Item>
        )}
        <Form.Item name="sku" label="SKU (tự gợi ý, có thể sửa)" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="name" label="Tên" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="unit" label="Đơn vị" initialValue="Cái">
          <Input />
        </Form.Item>
        <Form.Item name="cost_price" label="Giá nhập gợi ý (mặc định cho PO line mới)">
          <InputNumber style={{ width: '100%' }} min={0} />
        </Form.Item>
        <Form.Item name="sale_price" label="Giá bán gợi ý">
          <InputNumber style={{ width: '100%' }} min={0} />
        </Form.Item>
        <Form.Item name="currency" label="Đơn vị tiền" initialValue="VND">
          <Input maxLength={3} style={{ textTransform: 'uppercase' }} />
        </Form.Item>
        <Form.Item name="weight_kg" label="Cân nặng (kg)">
          <InputNumber style={{ width: '100%' }} min={0} />
        </Form.Item>
        <Form.Item name="warranty_months" label="Bảo hành gợi ý (tháng)">
          <InputNumber style={{ width: '100%' }} min={0} />
        </Form.Item>
        <Form.Item name="reorder_point" label="Điểm đặt lại (cảnh báo tồn thấp)" initialValue={0}>
          <InputNumber style={{ width: '100%' }} min={0} />
        </Form.Item>
        <Form.Item name="specifications" label="Specifications (JSON, tuỳ chọn)" extra='VD: {"ram": "16GB", "ports": 24}'>
          <Input.TextArea rows={3} />
        </Form.Item>
        {variantModal.editing && (
          <Form.Item name="is_active" label="Active" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        )}
      </EntityFormModal>

      <EntityFormModal
        title={`Sửa thông tin sản phẩm "${data.code}"`}
        open={productModal.open}
        onCancel={productModal.close}
        onFinish={(v) => updateProduct.mutate(v)}
        confirmLoading={updateProduct.isPending}
        form={productModal.form}
      >
        <Form.Item name="category_id" label="Category" rules={[{ required: true }]}>
          <Select options={categories?.map((c: any) => ({ value: c.id, label: c.name }))} />
        </Form.Item>
        <Form.Item name="brand_id" label="Hãng" rules={[{ required: true }]}>
          <Select options={brands?.map((b: any) => ({ value: b.id, label: b.name }))} />
        </Form.Item>
        <Form.Item name="model_number" label="Mã dòng sản phẩm">
          <Input />
        </Form.Item>
        <Form.Item name="code" label="Mã sản phẩm" rules={[{ required: true }]}>
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
        <Form.Item name="is_active" label="Active" valuePropName="checked" initialValue={true}>
          <Switch />
        </Form.Item>
      </EntityFormModal>

      <CustomFieldsPanel objectType="product" objectId={id!} />
    </div>
  )
}
