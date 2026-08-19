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

const UNITS = ['Cái', 'Chiếc', 'Bộ', 'Hộp', 'Cuộn', 'Mét', 'Cổng', 'License', 'Gói', 'Dây', 'Lần', 'Giờ', 'Ngày']

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

export default function VariantCreatePage() {
  const { productId } = useParams<{ productId: string }>()
  const navigate = useNavigate()
  const hook = useProductDetail(productId!)
  const [form] = Form.useForm()

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
        warranty_months: ref?.warranty_months ?? undefined,
        weight_kg:       ref?.weight_kg ?? undefined,
        reorder_point:   ref?.reorder_point ?? undefined,
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hook.data?.id, hook.attrDefs])

  async function handleSubmit() {
    const values = await form.validateFields()
    hook.createVariant.mutate(values, {
      onSuccess: (res: any) => {
        navigate(`/products/${productId}/variants/${res.data.id}`)
      },
    })
  }

  if (hook.isLoading) return <Skeleton active style={{ padding: '20px' }} />
  if (!hook.data) return <div style={{ padding: 20 }}>Không tìm thấy sản phẩm</div>

  const p = hook.data

  function updateSkuSuggestion(next = hook.attrValues) {
    const suffix = hook.generateSkuSuffix(next)
    form.setFieldValue('item_code', suffix ? `${p.code}-${suffix}` : p.code)
    form.setFieldValue('name', suffix ? `${p.name} ${suffix}` : p.name)
  }

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

      <Form form={form} layout="vertical">
        {/* ── Thuộc tính SKU (nếu có) ── */}
        {hook.attrValues.length > 0 && (
          <SectionCard title="Thuộc tính SKU">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {hook.attrValues.map((attr, i) => (
                <div key={attr.attribute_def_id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
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

        {/* ── Thông tin SKU ── */}
        <SectionCard title="Thông tin SKU">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px 24px' }}>
            <Form.Item name="item_code" label="Mã hàng" rules={[{ required: true }]}
              extra="Tự gợi ý từ thuộc tính, có thể sửa">
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
              <Select options={[
                { value: 'VND', label: 'VND — Việt Nam Đồng' },
                { value: 'USD', label: 'USD — Đô la Mỹ' },
                { value: 'EUR', label: 'EUR — Euro' },
                { value: 'CNY', label: 'CNY — Nhân dân tệ' },
                { value: 'JPY', label: 'JPY — Yên Nhật' },
              ]} />
            </Form.Item>
            <Form.Item name="cost_price" label="Giá nhập gợi ý">
              <InputNumber {...moneyProps} />
            </Form.Item>
            <Form.Item name="sale_price" label="Giá bán gợi ý">
              <InputNumber {...moneyProps} />
            </Form.Item>
            <Form.Item name="weight_kg" label="Cân nặng (kg)">
              <InputNumber controls={false} style={{ width: '100%' }} min={0} />
            </Form.Item>
            <Form.Item name="warranty_months" label="Bảo hành gợi ý (tháng)">
              <InputNumber controls={false} style={{ width: '100%' }} min={0} />
            </Form.Item>
            <Form.Item name="reorder_point" label="Điểm đặt lại">
              <InputNumber controls={false} style={{ width: '100%' }} min={0} />
            </Form.Item>
          </div>
        </SectionCard>
      </Form>
    </div>
  )
}
