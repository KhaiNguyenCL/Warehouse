import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Form, Input, InputNumber, Select, Switch, Button, Checkbox, DatePicker, Skeleton,
} from 'antd'
import dayjs from 'dayjs'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useProductDetail } from '../hooks/useProductDetail'
import { PageHeader } from '../components/ui/PageHeader'
import { moneyProps } from '../lib/utils'
import { ImageUpload } from '../components/ImageUpload'

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
      <div style={{ padding: '12px 16px', background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)', fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>
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

export default function VariantCreatePage() {
  const { productId } = useParams<{ productId: string }>()
  const navigate = useNavigate()
  const hook = useProductDetail(productId!)
  const [form] = Form.useForm()
  const [imageUrl, setImageUrl] = useState<string | undefined>()

  useEffect(() => {
    if (hook.data && hook.attrDefs !== undefined) {
      hook.buildAttrValuesForModal([])
      const ref = hook.data.variants?.[0]
      form.setFieldsValue({
        item_code:       hook.data.code ?? '',
        name:            hook.data.name ?? '',
        unit:            ref?.unit ?? 'Cái',
        currency:        ref?.currency ?? 'VND',
        cost_price:      ref?.cost_price ?? undefined,
        sale_price:      ref?.sale_price ?? undefined,
        manufacturer_warranty_months: ref?.manufacturer_warranty_months ?? undefined,
        weight_kg:       ref?.weight_kg ?? undefined,
        reorder_point:   ref?.reorder_point ?? undefined,
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hook.data?.id, hook.attrDefs])

  async function handleSubmit() {
    const values = await form.validateFields()
    const body = { ...values, image_url: imageUrl }
    hook.createVariant.mutate(body, {
      onSuccess: (res: any) => {
        navigate(`/products/${productId}/variants/${res.data.id}`)
      },
    })
  }

  function updateSkuSuggestion(next = hook.attrValues) {
    if (!hook.data) return
    const suffix = hook.generateSkuSuffix(next)
    form.setFieldValue('item_code', suffix ? `${hook.data.code}-${suffix}` : hook.data.code)
    form.setFieldValue('name', suffix ? `${hook.data.name} ${suffix}` : hook.data.name)
  }

  if (hook.isLoading) return <Skeleton active style={{ padding: '20px' }} />
  if (!hook.data) return <div style={{ padding: 20 }}>Không tìm thấy sản phẩm</div>

  const p = hook.data

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
            <span style={{ fontSize: 14 }}>Thêm SKU mới</span>
          </span>
        }
        actions={
          <>
            <Button onClick={() => navigate(`/products/${productId}`)}>Huỷ</Button>
            <Button type="primary" loading={hook.createVariant.isPending} onClick={handleSubmit}>
              Tạo SKU
            </Button>
          </>
        }
      />

      <Form form={form} layout="vertical" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>

          <div style={{ width: 200, flexShrink: 0 }}>
            <SectionCard title="Hình ảnh">
              <ImageUpload value={imageUrl} onChange={(url) => setImageUrl(url ?? undefined)} />
            </SectionCard>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <SectionCard title="Thông tin SKU">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px 24px' }}>

                <Field label="Mã hàng *">
                  <Form.Item name="item_code" noStyle rules={[{ required: true, message: 'Nhập mã hàng' }]}>
                    <Input style={{ width: '100%' }} />
                  </Form.Item>
                </Field>

                <Field label="Tên SKU *">
                  <Form.Item name="name" noStyle rules={[{ required: true, message: 'Nhập tên SKU' }]}>
                    <Input style={{ width: '100%' }} />
                  </Form.Item>
                </Field>

                <Field label="Model (mã nhà SX)">
                  <Form.Item name="model" noStyle>
                    <Input style={{ width: '100%' }} placeholder="VD: SG110-16HP" />
                  </Form.Item>
                </Field>

                <Field label="Part Number">
                  <Form.Item name="part_number" noStyle>
                    <Input style={{ width: '100%' }} placeholder="VD: C9200L-48P-4X-E" />
                  </Form.Item>
                </Field>

                <Field label="Mô tả ngắn (mặc định trên báo giá)">
                  <Form.Item name="description" noStyle>
                    <Input style={{ width: '100%' }} placeholder="Mô tả ngắn — dùng khi chưa có mô tả riêng theo khách" />
                  </Form.Item>
                </Field>

                <Field label="Mô tả dài (thông số kỹ thuật)">
                  <Form.Item name="description_long" noStyle>
                    <Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} style={{ width: '100%' }} placeholder="Thông số kỹ thuật đầy đủ" />
                  </Form.Item>
                </Field>

                <Field label="Đơn vị">
                  <Form.Item name="unit" noStyle>
                    <Select options={UNITS.map((u) => ({ value: u, label: u }))} showSearch allowClear style={{ width: '100%' }} />
                  </Form.Item>
                </Field>

                <Field label="Tiền tệ">
                  <Form.Item name="currency" noStyle>
                    <Select options={CURRENCIES} style={{ width: '100%' }} />
                  </Form.Item>
                </Field>

                <Field label="Giá nhập gợi ý">
                  <Form.Item name="cost_price" noStyle>
                    <InputNumber {...moneyProps} />
                  </Form.Item>
                </Field>

                <Field label="Giá bán gợi ý">
                  <Form.Item name="sale_price" noStyle>
                    <InputNumber {...moneyProps} />
                  </Form.Item>
                </Field>

                <Field label="Cân nặng (kg)">
                  <Form.Item name="weight_kg" noStyle>
                    <InputNumber controls={false} style={{ width: '100%' }} min={0} />
                  </Form.Item>
                </Field>

                <Field label="BH hãng gợi ý">
                  <Form.Item name="manufacturer_warranty_months" noStyle>
                    <InputNumber controls={false} style={{ width: '100%' }} min={0} addonAfter="tháng" />
                  </Form.Item>
                </Field>

                <Field label="Điểm đặt lại">
                  <Form.Item name="reorder_point" noStyle>
                    <InputNumber controls={false} style={{ width: '100%' }} min={0} />
                  </Form.Item>
                </Field>

              </div>
            </SectionCard>
          </div>

        </div>
      </Form>

      {/* ── Thuộc tính SKU (nếu có) ── */}
      {hook.attrValues.length > 0 && (
        <SectionCard title="Thuộc tính SKU">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {hook.attrValues.map((attr, i) => (
              <div key={attr.attribute_def_id} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ width: 140, flexShrink: 0, fontSize: 13, color: 'var(--text-2)' }}>{attr.name}</span>
                {attr.field_type === 'text' ? (
                  <Input style={{ width: 160 }} value={attr.value ?? ''} onChange={(e) => {
                    const next = hook.attrValues.map((a, j) => (j === i ? { ...a, value: e.target.value || null } : a))
                    hook.setAttrValues(next)
                    updateSkuSuggestion(next)
                  }} />
                ) : attr.field_type === 'boolean' ? (
                  <Switch checkedChildren="Có" unCheckedChildren="Không" checked={attr.value === 'true'} onChange={(checked) => {
                    const next = hook.attrValues.map((a, j) => (j === i ? { ...a, value: String(checked) } : a))
                    hook.setAttrValues(next)
                    updateSkuSuggestion(next)
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
                      updateSkuSuggestion(next)
                    }}
                  />
                )}
                <Checkbox checked={attr.include_in_sku} onChange={(e) => {
                  const next = hook.attrValues.map((a, j) => (j === i ? { ...a, include_in_sku: e.target.checked } : a))
                  hook.setAttrValues(next)
                  updateSkuSuggestion(next)
                }}>
                  Gắn vào mã
                </Checkbox>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  )
}
