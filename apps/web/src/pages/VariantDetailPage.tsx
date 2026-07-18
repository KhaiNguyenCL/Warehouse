import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Form, Input, InputNumber, Select, Switch, Button, Popconfirm,
  Checkbox, DatePicker, Tag, Skeleton,
} from 'antd'
import dayjs from 'dayjs'
import { ArrowLeftOutlined, EditOutlined } from '@ant-design/icons'
import { useVariantDetail } from '../hooks/useVariantDetail'
import { PageHeader } from '../components/ui/PageHeader'
import VariantSuppliersPanel from '../components/VariantSuppliersPanel'
import CustomerPricesPanel from '../components/CustomerPricesPanel'
import BundleItemsPanel from '../components/BundleItemsPanel'
import CustomFieldsPanel from '../components/CustomFieldsPanel'

const UNITS = ['Cái', 'Chiếc', 'Bộ', 'Hộp', 'Cuộn', 'Mét', 'Cổng', 'License', 'Gói', 'Dây', 'Lần', 'Giờ', 'Ngày']
const CURRENCIES = [
  { value: 'VND', label: 'VND' },
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
  { value: 'CNY', label: 'CNY' },
  { value: 'JPY', label: 'JPY' },
]

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-lg)',
      boxShadow: 'var(--shadow-sm)',
      overflow: 'hidden',
    }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>
        {title}
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</div>
      <div style={{ fontSize: 14, color: 'var(--text-1)' }}>{value ?? <span style={{ color: 'var(--text-3)' }}>—</span>}</div>
    </div>
  )
}

export default function VariantDetailPage() {
  const { productId, variantId } = useParams<{ productId: string; variantId: string }>()
  const navigate = useNavigate()
  const hook = useVariantDetail(productId!, variantId!)
  const [isEditing, setIsEditing] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    if (hook.variant && hook.attrDefs !== undefined) {
      hook.buildAttrValues(hook.variant.attribute_values ?? [])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hook.variant?.id, hook.attrDefs])

  function startEdit() {
    form.setFieldsValue({
      item_code:       hook.variant?.item_code,
      name:            hook.variant?.name,
      model:           hook.variant?.model,
      part_number:     hook.variant?.part_number,
      unit:            hook.variant?.unit,
      cost_price:      hook.variant?.cost_price,
      sale_price:      hook.variant?.sale_price,
      currency:        hook.variant?.currency ?? 'VND',
      weight_kg:       hook.variant?.weight_kg,
      warranty_months: hook.variant?.warranty_months,
      reorder_point:   hook.variant?.reorder_point ?? 0,
      is_active:       hook.variant?.is_active ?? true,
    })
    setIsEditing(true)
  }

  function cancelEdit() {
    setIsEditing(false)
  }

  async function saveEdit() {
    const values = await form.validateFields()
    hook.updateVariant.mutate(
      { values, attrs: hook.attrValues },
      { onSuccess: () => setIsEditing(false) },
    )
  }

  if (hook.isLoading) return <Skeleton active style={{ padding: '20px' }} />
  if (!hook.product || !hook.variant) return <div style={{ padding: 20 }}>Không tìm thấy SKU</div>

  const v = hook.variant
  const p = hook.product

  return (
    <div style={{ padding: '10px 20px 40px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <PageHeader
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(`/products/${productId}`)}
              style={{ padding: '0 4px' }}
            />
            <span style={{ color: 'var(--text-3)', fontSize: 14 }}>{p.name}</span>
            <span style={{ color: 'var(--text-3)', fontSize: 14 }}>/</span>
            <span style={{ fontSize: 14 }}>{v.item_code || v.sku}</span>
          </span>
        }
        actions={
          isEditing ? (
            <>
              <Button onClick={cancelEdit}>Huỷ</Button>
              <Button type="primary" loading={hook.updateVariant.isPending} onClick={saveEdit}>Lưu</Button>
            </>
          ) : (
            <>
              <Button icon={<EditOutlined />} onClick={startEdit}>Sửa</Button>
              <Popconfirm
                title={`Xóa SKU "${v.item_code}"?`}
                description="Không thể xóa nếu còn tồn kho hoặc serial number."
                okText="Xóa" okButtonProps={{ danger: true }} cancelText="Hủy"
                onConfirm={() => hook.deleteVariant.mutate()}
              >
                <Button danger loading={hook.deleteVariant.isPending}>Xóa SKU</Button>
              </Popconfirm>
            </>
          )
        }
      />

      {/* ── Thông tin cơ bản ── */}
      <SectionCard title="Thông tin SKU">
        {isEditing ? (
          <Form form={form} layout="vertical" className="entity-form-compact">
            <Form.Item name="item_code" label="Mã hàng" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="name" label="Tên" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="model" label="Model (mã nhà SX)">
              <Input placeholder="VD: SG110-16HP" />
            </Form.Item>
            <Form.Item name="part_number" label="Part Number">
              <Input placeholder="VD: C9200L-48P-4X-E" />
            </Form.Item>
            <Form.Item name="unit" label="Đơn vị">
              <Select options={UNITS.map((u) => ({ value: u, label: u }))} showSearch allowClear />
            </Form.Item>
            <Form.Item name="currency" label="Tiền tệ">
              <Select options={CURRENCIES} />
            </Form.Item>
            <Form.Item name="cost_price" label="Giá nhập gợi ý">
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
            <Form.Item name="sale_price" label="Giá bán gợi ý">
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
            <Form.Item name="weight_kg" label="Cân nặng (kg)">
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
            <Form.Item name="warranty_months" label="Bảo hành gợi ý (tháng)">
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
            <Form.Item name="reorder_point" label="Điểm đặt lại">
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
            <Form.Item name="is_active" label="Active" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Form>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px 24px' }}>
            <InfoRow label="SKU (hệ thống)" value={<span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v.sku}</span>} />
            <InfoRow label="Mã hàng" value={v.item_code} />
            <InfoRow label="Tên" value={v.name} />
            <InfoRow label="Model" value={v.model} />
            <InfoRow label="Part Number" value={v.part_number} />
            <InfoRow label="Đơn vị" value={v.unit} />
            <InfoRow label="Tiền tệ" value={v.currency} />
            <InfoRow label="Giá nhập gợi ý" value={v.cost_price != null ? Number(v.cost_price).toLocaleString('vi-VN') : undefined} />
            <InfoRow label="Giá bán gợi ý" value={v.sale_price != null ? Number(v.sale_price).toLocaleString('vi-VN') : undefined} />
            <InfoRow label="Cân nặng (kg)" value={v.weight_kg} />
            <InfoRow label="Bảo hành gợi ý" value={v.warranty_months != null ? `${v.warranty_months} tháng` : undefined} />
            <InfoRow label="Điểm đặt lại" value={v.reorder_point} />
            <InfoRow label="Trạng thái" value={<Tag color={v.is_active ? 'green' : 'default'}>{v.is_active ? 'Active' : 'Inactive'}</Tag>} />
          </div>
        )}
        <CustomFieldsPanel objectType="variant" objectId={variantId!} inline />
      </SectionCard>

      {/* ── Thuộc tính SKU ── */}
      {hook.attrValues.length > 0 && (
        <SectionCard title="Thuộc tính">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {hook.attrValues.map((attr, i) => (
              <div key={attr.attribute_def_id} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ width: 140, flexShrink: 0, fontSize: 13, color: 'var(--text-2)' }}>{attr.name}</span>
                {isEditing ? (
                  attr.field_type === 'text' ? (
                    <Input style={{ width: 160 }} value={attr.value ?? ''} onChange={(e) => {
                      const next = hook.attrValues.map((a, j) => (j === i ? { ...a, value: e.target.value || null } : a))
                      hook.setAttrValues(next)
                    }} />
                  ) : attr.field_type === 'boolean' ? (
                    <Switch checkedChildren="Có" unCheckedChildren="Không" checked={attr.value === 'true'} onChange={(checked) => {
                      const next = hook.attrValues.map((a, j) => (j === i ? { ...a, value: String(checked) } : a))
                      hook.setAttrValues(next)
                    }} />
                  ) : attr.field_type === 'date' ? (
                    <DatePicker style={{ width: 160 }} value={attr.value ? dayjs(attr.value) : null} onChange={(d) => {
                      const next = hook.attrValues.map((a, j) => (j === i ? { ...a, value: d ? d.format('YYYY-MM-DD') : null } : a))
                      hook.setAttrValues(next)
                    }} />
                  ) : (
                    <Select style={{ width: 160 }} allowClear value={attr.value ?? undefined}
                      options={attr.options.map((o) => ({ value: o, label: `${o}${attr.unit ?? ''}` }))}
                      onChange={(v) => {
                        const next = hook.attrValues.map((a, j) => (j === i ? { ...a, value: v ?? null } : a))
                        hook.setAttrValues(next)
                      }}
                    />
                  )
                ) : (
                  <span style={{ fontSize: 13 }}>
                    {attr.value
                      ? attr.field_type === 'boolean'
                        ? (attr.value === 'true' ? 'Có' : 'Không')
                        : `${attr.value}${attr.unit ? ' ' + attr.unit : ''}`
                      : <span style={{ color: 'var(--text-3)' }}>—</span>}
                  </span>
                )}
                {isEditing && (
                  <Checkbox checked={attr.include_in_sku} onChange={(e) => {
                    const next = hook.attrValues.map((a, j) => (j === i ? { ...a, include_in_sku: e.target.checked } : a))
                    hook.setAttrValues(next)
                  }}>
                    Gắn vào mã
                  </Checkbox>
                )}
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ── Panels ── */}
      {p.product_type === 'bundle' && (
        <SectionCard title="Sản phẩm con (Bundle)">
          <BundleItemsPanel productId={productId!} variantId={variantId!} />
        </SectionCard>
      )}

      <SectionCard title="Nhà cung cấp">
        <VariantSuppliersPanel productId={productId!} variantId={variantId!} />
      </SectionCard>

      <SectionCard title="Giá theo khách hàng">
        <CustomerPricesPanel productId={productId!} variantId={variantId!} />
      </SectionCard>

    </div>
  )
}
