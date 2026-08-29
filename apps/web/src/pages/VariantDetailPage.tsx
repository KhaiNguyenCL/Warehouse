import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Form, Input, InputNumber, Select, Switch, Button, Popconfirm,
  Checkbox, DatePicker, Skeleton,
} from 'antd'
import dayjs from 'dayjs'
import { ArrowLeftOutlined, EditOutlined } from '@ant-design/icons'
import { useVariantDetail } from '../hooks/useVariantDetail'
import { PageHeader } from '../components/ui/PageHeader'
import VariantSuppliersPanel from '../components/VariantSuppliersPanel'
import CustomerPricesPanel from '../components/CustomerPricesPanel'
import BundleItemsPanel from '../components/BundleItemsPanel'
import CustomFieldsPanel from '../components/CustomFieldsPanel'
import { moneyProps } from '../lib/utils'

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

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--text-2)',
  fontWeight: 600,
  marginBottom: 4,
}

const valueStyle: React.CSSProperties = {
  fontSize: 14,
  color: 'var(--text-1)',
  minHeight: 32,
  display: 'flex',
  alignItems: 'center',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      <div style={valueStyle}>{children}</div>
    </div>
  )
}

function Val({ v }: { v?: React.ReactNode }) {
  return v != null && v !== '' ? <>{v}</> : <span style={{ color: 'var(--text-3)' }}>—</span>
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

  // Form luôn hiển thị input (kể cả ở chế độ xem, disabled) nên phải đồng bộ
  // giá trị mỗi khi variant thay đổi — không chỉ lúc bấm Sửa.
  useEffect(() => {
    if (hook.variant) {
      form.setFieldsValue({
        item_code:       hook.variant.item_code,
        name:            hook.variant.name,
        model:           hook.variant.model,
        part_number:     hook.variant.part_number,
        unit:            hook.variant.unit,
        cost_price:      hook.variant.cost_price ?? undefined,
        sale_price:      hook.variant.sale_price ?? undefined,
        currency:        hook.variant.currency ?? 'VND',
        weight_kg:       hook.variant.weight_kg ?? undefined,
        warranty_months: hook.variant.warranty_months ?? undefined,
        reorder_point:   hook.variant.reorder_point ?? undefined,
        is_active:       hook.variant.is_active ?? true,
      })
    }
  }, [hook.variant, form])

  function cancelEdit() {
    hook.buildAttrValues(hook.variant?.attribute_values ?? [])
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
              <Button icon={<EditOutlined />} onClick={() => setIsEditing(true)}>Sửa</Button>
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

      {/* ── Thông tin SKU ── */}
      <SectionCard title="Thông tin SKU">
        <Form form={form} layout="vertical" style={{ marginBottom: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px 24px' }}>

            <Field label="SKU (hệ thống)">
              <span style={{ fontFamily: 'monospace', fontSize: 12 }}><Val v={v.sku} /></span>
            </Field>

            <Field label="Mã hàng">
              <Form.Item name="item_code" noStyle rules={[{ required: true }]}>
                <Input style={{ width: '100%' }} disabled={!isEditing} />
              </Form.Item>
            </Field>

            <Field label="Tên">
              <Form.Item name="name" noStyle rules={[{ required: true }]}>
                <Input style={{ width: '100%' }} disabled={!isEditing} />
              </Form.Item>
            </Field>

            <Field label="Model (mã nhà SX)">
              <Form.Item name="model" noStyle>
                <Input style={{ width: '100%' }} placeholder="VD: SG110-16HP" disabled={!isEditing} />
              </Form.Item>
            </Field>

            <Field label="Part Number">
              <Form.Item name="part_number" noStyle>
                <Input style={{ width: '100%' }} placeholder="VD: C9200L-48P-4X-E" disabled={!isEditing} />
              </Form.Item>
            </Field>

            <Field label="Đơn vị">
              <Form.Item name="unit" noStyle>
                <Select options={UNITS.map((u) => ({ value: u, label: u }))} showSearch allowClear style={{ width: '100%' }} disabled={!isEditing} />
              </Form.Item>
            </Field>

            <Field label="Tiền tệ">
              <Form.Item name="currency" noStyle>
                <Select options={CURRENCIES} style={{ width: '100%' }} disabled={!isEditing} />
              </Form.Item>
            </Field>

            <Field label="Giá nhập gợi ý">
              <Form.Item name="cost_price" noStyle>
                <InputNumber {...moneyProps} disabled={!isEditing} />
              </Form.Item>
            </Field>

            <Field label="Giá bán gợi ý">
              <Form.Item name="sale_price" noStyle>
                <InputNumber {...moneyProps} disabled={!isEditing} />
              </Form.Item>
            </Field>

            <Field label="Cân nặng (kg)">
              <Form.Item name="weight_kg" noStyle>
                <InputNumber controls={false} style={{ width: '100%' }} min={0} disabled={!isEditing} />
              </Form.Item>
            </Field>

            <Field label="Bảo hành gợi ý">
              <Form.Item name="warranty_months" noStyle>
                <InputNumber controls={false} style={{ width: '100%' }} min={0} addonAfter="tháng" disabled={!isEditing} />
              </Form.Item>
            </Field>

            <Field label="Điểm đặt lại">
              <Form.Item name="reorder_point" noStyle>
                <InputNumber controls={false} style={{ width: '100%' }} min={0} disabled={!isEditing} />
              </Form.Item>
            </Field>

            <Field label="Trạng thái">
              <Form.Item name="is_active" noStyle valuePropName="checked">
                <Switch checkedChildren="Active" unCheckedChildren="Inactive" disabled={!isEditing} />
              </Form.Item>
            </Field>

          </div>
        </Form>
        <CustomFieldsPanel objectType="variant" objectId={variantId!} inline />
      </SectionCard>

      {/* ── Thuộc tính SKU ── */}
      {hook.attrValues.length > 0 && (
        <SectionCard title="Thuộc tính">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {hook.attrValues.map((attr, i) => (
              <div key={attr.attribute_def_id} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ width: 140, flexShrink: 0, fontSize: 13, color: 'var(--text-2)' }}>{attr.name}</span>
                {attr.field_type === 'text' ? (
                  <Input style={{ width: 160 }} value={attr.value ?? ''} disabled={!isEditing} onChange={(e) => {
                    const next = hook.attrValues.map((a, j) => (j === i ? { ...a, value: e.target.value || null } : a))
                    hook.setAttrValues(next)
                  }} />
                ) : attr.field_type === 'boolean' ? (
                  <Switch checkedChildren="Có" unCheckedChildren="Không" checked={attr.value === 'true'} disabled={!isEditing} onChange={(checked) => {
                    const next = hook.attrValues.map((a, j) => (j === i ? { ...a, value: String(checked) } : a))
                    hook.setAttrValues(next)
                  }} />
                ) : attr.field_type === 'date' ? (
                  <DatePicker style={{ width: 160 }} value={attr.value ? dayjs(attr.value) : null} disabled={!isEditing} onChange={(d) => {
                    const next = hook.attrValues.map((a, j) => (j === i ? { ...a, value: d ? d.format('YYYY-MM-DD') : null } : a))
                    hook.setAttrValues(next)
                  }} />
                ) : (
                  <Select style={{ width: 160 }} allowClear value={attr.value ?? undefined} disabled={!isEditing}
                    options={attr.options.map((o) => ({ value: o, label: `${o}${attr.unit ?? ''}` }))}
                    onChange={(val) => {
                      const next = hook.attrValues.map((a, j) => (j === i ? { ...a, value: val ?? null } : a))
                      hook.setAttrValues(next)
                    }}
                  />
                )}
                <Checkbox checked={attr.include_in_sku} disabled={!isEditing} onChange={(e) => {
                  const next = hook.attrValues.map((a, j) => (j === i ? { ...a, include_in_sku: e.target.checked } : a))
                  hook.setAttrValues(next)
                }}>
                  Gắn vào mã
                </Checkbox>
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
