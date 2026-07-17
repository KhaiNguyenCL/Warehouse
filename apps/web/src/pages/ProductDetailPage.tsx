import { useParams } from 'react-router-dom'
import { Table, Input, InputNumber, Select, Switch, Tag, Typography, Form, Popconfirm, Button, Checkbox, Divider, DatePicker } from 'antd'
import dayjs from 'dayjs'
import { useProductDetail } from '../hooks/useProductDetail'
import { PageHeader } from '../components/PageHeader'
import { EntityFormModal } from '../components/EntityFormModal'
import CustomFieldsPanel from '../components/CustomFieldsPanel'
import BundleItemsPanel from '../components/BundleItemsPanel'
import VariantSuppliersPanel from '../components/VariantSuppliersPanel'
import CustomerPricesPanel from '../components/CustomerPricesPanel'
import { ImageUpload } from '../components/ImageUpload'

const PRODUCT_TYPES = [
  { value: 'storable', label: 'Storable (có serial)' },
  { value: 'consumable', label: 'Consumable' },
  { value: 'service', label: 'Service' },
  { value: 'bundle', label: 'Bundle' },
]

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const hook = useProductDetail(id!)

  if (hook.isLoading || !hook.data) return null

  return (
    <div>
      <PageHeader
        title={
          <>
            {hook.data.name} <Typography.Text type="secondary">({hook.data.product_type})</Typography.Text>
          </>
        }
        actionLabel="Sửa thông tin"
        onAction={() => hook.productModal.openEdit(hook.data)}
      />

      <PageHeader
        title="Variants (SKU)"
        level={4}
        actionLabel={hook.data.product_type !== 'service' ? '+ Thêm SKU' : undefined}
        onAction={hook.openCreateVariant}
      />

      <Table
        rowKey="id"
        dataSource={hook.data.variants}
        pagination={false}
        onRow={(record: any) => ({ onClick: () => hook.openEditVariant(record), style: { cursor: 'pointer' } })}
        columns={[
          { title: 'SKU (HT)', dataIndex: 'sku', width: 90 },
          { title: 'Mã hàng', dataIndex: 'item_code' },
          { title: 'Tên', dataIndex: 'name' },
          { title: 'Model', dataIndex: 'model' },
          { title: 'Part Number', dataIndex: 'part_number' },
          { title: 'Đơn vị', dataIndex: 'unit' },
          { title: 'Giá nhập gợi ý', dataIndex: 'cost_price' },
          { title: 'Giá bán gợi ý', dataIndex: 'sale_price' },
          { title: 'BH (tháng)', dataIndex: 'warranty_months' },
          { title: 'Cân nặng (kg)', dataIndex: 'weight_kg' },
          { title: 'Đặt lại', dataIndex: 'reorder_point' },
          {
            title: 'Active',
            dataIndex: 'is_active',
            render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Có' : 'Không'}</Tag>,
          },
        ]}
      />

      <EntityFormModal
        title={hook.variantModal.editing ? `Sửa SKU "${hook.variantModal.editing.sku}"` : 'Thêm SKU mới'}
        open={hook.variantModal.open}
        onCancel={hook.variantModal.close}
        onFinish={hook.submitVariant}
        confirmLoading={hook.createVariant.isPending || hook.updateVariant.isPending}
        form={hook.variantModal.form}
        extra={
          hook.variantModal.editing ? (
            <>
              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                <Popconfirm
                  title={`Xóa SKU "${hook.variantModal.editing?.sku}"?`}
                  description="Không thể xóa nếu còn tồn kho hoặc serial number."
                  okText="Xóa"
                  okButtonProps={{ danger: true }}
                  cancelText="Hủy"
                  onConfirm={() => hook.deleteVariantMutation.mutate(hook.variantModal.editing.id)}
                >
                  <Button danger loading={hook.deleteVariantMutation.isPending}>Xóa SKU này</Button>
                </Popconfirm>
              </div>
              {hook.data.product_type === 'bundle' && (
                <BundleItemsPanel productId={id!} variantId={hook.variantModal.editing.id} />
              )}
              <VariantSuppliersPanel productId={id!} variantId={hook.variantModal.editing.id} />
              <CustomerPricesPanel productId={id!} variantId={hook.variantModal.editing.id} />
              <CustomFieldsPanel objectType="variant" objectId={hook.variantModal.editing.id} />
            </>
          ) : undefined
        }
      >
        {hook.attrValues.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <Divider orientation="left" style={{ fontSize: 13 }}>Thuộc tính SKU</Divider>
            {hook.attrValues.map((attr, i) => (
              <div key={attr.attribute_def_id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <span style={{ width: 120, flexShrink: 0 }}>{attr.name}</span>
                {attr.field_type === 'text' ? (
                  <Input
                    style={{ width: 120 }}
                    placeholder="Nhập giá trị"
                    value={attr.value ?? ''}
                    onChange={(e) => {
                      const next = hook.attrValues.map((a, j) => (j === i ? { ...a, value: e.target.value || null } : a))
                      hook.setAttrValues(next)
                      const suffix = hook.generateSkuSuffix(next)
                      hook.variantModal.form.setFieldValue('item_code', suffix ? `${hook.data.code}-${suffix}` : hook.data.code)
                      hook.variantModal.form.setFieldValue('name', suffix ? `${hook.data.name} ${suffix}` : hook.data.name)
                    }}
                  />
                ) : attr.field_type === 'boolean' ? (
                  <Switch
                    checkedChildren="Có"
                    unCheckedChildren="Không"
                    checked={attr.value === 'true'}
                    onChange={(checked) => {
                      const next = hook.attrValues.map((a, j) => (j === i ? { ...a, value: String(checked) } : a))
                      hook.setAttrValues(next)
                      const suffix = hook.generateSkuSuffix(next)
                      hook.variantModal.form.setFieldValue('item_code', suffix ? `${hook.data.code}-${suffix}` : hook.data.code)
                      hook.variantModal.form.setFieldValue('name', suffix ? `${hook.data.name} ${suffix}` : hook.data.name)
                    }}
                  />
                ) : attr.field_type === 'date' ? (
                  <DatePicker
                    style={{ width: 140 }}
                    value={attr.value ? dayjs(attr.value) : null}
                    onChange={(d) => {
                      const val = d ? d.format('YYYY-MM-DD') : null
                      const next = hook.attrValues.map((a, j) => (j === i ? { ...a, value: val } : a))
                      hook.setAttrValues(next)
                      const suffix = hook.generateSkuSuffix(next)
                      hook.variantModal.form.setFieldValue('item_code', suffix ? `${hook.data.code}-${suffix}` : hook.data.code)
                      hook.variantModal.form.setFieldValue('name', suffix ? `${hook.data.name} ${suffix}` : hook.data.name)
                    }}
                  />
                ) : (
                  <Select
                    style={{ width: 120 }}
                    placeholder="Chọn"
                    allowClear
                    value={attr.value ?? undefined}
                    options={attr.options.map((o) => ({ value: o, label: `${o}${attr.unit ?? ''}` }))}
                    onChange={(v) => {
                      const next = hook.attrValues.map((a, j) => (j === i ? { ...a, value: v ?? null } : a))
                      hook.setAttrValues(next)
                      const suffix = hook.generateSkuSuffix(next)
                      hook.variantModal.form.setFieldValue('item_code', suffix ? `${hook.data.code}-${suffix}` : hook.data.code)
                      hook.variantModal.form.setFieldValue('name', suffix ? `${hook.data.name} ${suffix}` : hook.data.name)
                    }}
                  />
                )}
                <Checkbox
                  checked={attr.include_in_sku}
                  onChange={(e) => {
                    const next = hook.attrValues.map((a, j) => (j === i ? { ...a, include_in_sku: e.target.checked } : a))
                    hook.setAttrValues(next)
                    const suffix = hook.generateSkuSuffix(next)
                    hook.variantModal.form.setFieldValue('item_code', suffix ? `${hook.data.code}-${suffix}` : hook.data.code)
                    hook.variantModal.form.setFieldValue('name', suffix ? `${hook.data.name} ${suffix}` : hook.data.name)
                  }}
                >
                  Gắn vào SKU
                </Checkbox>
              </div>
            ))}
          </div>
        )}
        {hook.variantModal.editing && (
          <Form.Item label="SKU (hệ thống)">
            <Input value={hook.variantModal.editing.sku} disabled />
          </Form.Item>
        )}
        <Form.Item name="item_code" label="Mã hàng (tự gợi ý, có thể sửa)" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="name" label="Tên" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="model" label="Model (mã nhà sản xuất)">
          <Input placeholder="VD: SG110-16HP, WS-C2960X-48FPD" />
        </Form.Item>
        <Form.Item name="part_number" label="Part Number (mã bên bán cung cấp)">
          <Input placeholder="VD: C9200L-48P-4X-E" />
        </Form.Item>
        <Form.Item name="unit" label="Đơn vị" initialValue="Cái">
          <Select
            options={[
              'Cái', 'Chiếc', 'Bộ', 'Hộp', 'Cuộn', 'Mét', 'Cổng', 'License', 'Gói', 'Dây',
            ].map((u) => ({ value: u, label: u }))}
            showSearch
            allowClear
          />
        </Form.Item>
        <Form.Item name="cost_price" label="Giá nhập gợi ý (mặc định cho PO line mới)">
          <InputNumber style={{ width: '100%' }} min={0} />
        </Form.Item>
        <Form.Item name="sale_price" label="Giá bán gợi ý">
          <InputNumber style={{ width: '100%' }} min={0} />
        </Form.Item>
        <Form.Item name="currency" label="Đơn vị tiền" initialValue="VND">
          <Select options={[
            { value: 'VND', label: 'VND — Việt Nam Đồng' },
            { value: 'USD', label: 'USD — Đô la Mỹ' },
            { value: 'EUR', label: 'EUR — Euro' },
            { value: 'CNY', label: 'CNY — Nhân dân tệ' },
            { value: 'JPY', label: 'JPY — Yên Nhật' },
          ]} />
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
        {hook.variantModal.editing && (
          <Form.Item name="is_active" label="Active" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        )}
      </EntityFormModal>

      <EntityFormModal
        title={`Sửa thông tin sản phẩm "${hook.data.code}"`}
        open={hook.productModal.open}
        onCancel={hook.productModal.close}
        onFinish={(v) => hook.updateProduct.mutate(v)}
        confirmLoading={hook.updateProduct.isPending}
        form={hook.productModal.form}
      >
        <Form.Item name="category_id" label="Category" rules={[{ required: true }]}>
          <Select options={hook.categories?.map((c: any) => ({ value: c.id, label: c.name }))} />
        </Form.Item>
        <Form.Item name="brand_id" label="Hãng">
          <Select options={hook.brands?.map((b: any) => ({ value: b.id, label: b.name }))} />
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
        <Form.Item name="image_url" label="Hình ảnh">
          <ImageUpload />
        </Form.Item>
        <Form.Item name="is_active" label="Active" valuePropName="checked" initialValue={true}>
          <Switch />
        </Form.Item>
      </EntityFormModal>

      <CustomFieldsPanel objectType="product" objectId={id!} />
    </div>
  )
}
