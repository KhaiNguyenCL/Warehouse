import { useParams, useNavigate } from 'react-router-dom'
import { Table, Input, InputNumber, Select, Switch, Tag, Typography, Form, Checkbox, Divider, DatePicker } from 'antd'
import dayjs from 'dayjs'
import { useProductDetail } from '../hooks/useProductDetail'
import { PageHeader } from '../components/PageHeader'
import { EntityFormModal } from '../components/EntityFormModal'
import CustomFieldsPanel from '../components/CustomFieldsPanel'

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
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
        onRow={(record: any) => ({ onClick: () => navigate(`/products/${id}/variants/${record.id}`), style: { cursor: 'pointer' } })}
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
        title="Thêm SKU mới"
        open={hook.variantModal.open}
        onCancel={hook.variantModal.close}
        onFinish={hook.submitVariant}
        confirmLoading={hook.createVariant.isPending}
        form={hook.variantModal.form}
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
      </EntityFormModal>

      <CustomFieldsPanel objectType="product" objectId={id!} />
    </div>
  )
}
