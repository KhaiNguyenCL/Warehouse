// 1 dòng trong Form.List của PO/Receipt create modal — cascading Select: chọn Product
// trước, Variant (SKU) sau (vì API không có endpoint "list tất cả variant" — phải đi
// qua product). Khi chọn variant, tự điền unit_price/warranty_months từ giá trị gợi ý
// mặc định trên variant (cost_price/warranty_months) — đúng tinh thần đã thống nhất:
// variant chỉ là default, PO line lưu giá trị riêng, sửa độc lập sau đó.
//
// Custom field của variant có applies_to_po_line=true cũng theo đúng tinh thần này: chọn
// variant → tự điền giá trị custom field hiện tại của SKU làm gợi ý, nhưng lưu riêng theo
// custom_field_values của dòng PO (field_values với object_type="purchase_order_line") —
// sửa giá trị mặc định trên SKU sau đó KHÔNG ảnh hưởng PO đã tạo.
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Form, Select, InputNumber, Input, DatePicker, Switch, Button } from 'antd'
import type { FormInstance } from 'antd'
import dayjs from 'dayjs'
import { api } from '../lib/api'

interface Props {
  form: FormInstance
  name: number
  remove: () => void
}

export default function POLineItem({ form, name, remove }: Props) {
  const [productId, setProductId] = useState<string | undefined>()

  const { data: products } = useQuery({
    queryKey: ['products', 'all'],
    queryFn: async () => (await api.get('/products', { params: { limit: 100 } })).data,
  })

  const { data: productDetail } = useQuery({
    queryKey: ['products', productId],
    queryFn: async () => (await api.get(`/products/${productId}`)).data,
    enabled: !!productId,
  })

  const { data: variantCustomFields } = useQuery({
    queryKey: ['custom-fields', 'variant'],
    queryFn: async () => (await api.get('/custom-fields', { params: { object_type: 'variant' } })).data,
  })
  const poLineFields = (variantCustomFields ?? []).filter((f: any) => f.is_active && f.applies_to_po_line)

  async function onVariantChange(variantId: string) {
    const variant = productDetail?.variants.find((v: any) => v.id === variantId)
    if (!variant) return

    const lines = form.getFieldValue('lines')
    lines[name] = {
      ...lines[name],
      variant_id: variantId,
      unit_price: variant.cost_price ?? lines[name]?.unit_price,
      manufacturer_warranty_months: variant.manufacturer_warranty_months ?? lines[name]?.manufacturer_warranty_months,
      customer_warranty_months: variant.customer_warranty_months ?? lines[name]?.customer_warranty_months,
    }
    form.setFieldValue('lines', lines)

    if (poLineFields.length > 0) {
      const { data: variantValues } = await api.get('/custom-fields/values', {
        params: { object_type: 'variant', object_id: variantId },
      })
      const lines2 = form.getFieldValue('lines')
      lines2[name] = {
        ...lines2[name],
        custom_field_values: poLineFields.map((f: any) => ({
          field_id: f.id,
          value: variantValues.find((v: any) => v.field_id === f.id)?.value ?? null,
        })),
      }
      form.setFieldValue('lines', lines2)
    }
  }

  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
      <Form.Item label="Sản phẩm" style={{ width: 200 }}>
        <Select
          showSearch
          optionFilterProp="label"
          placeholder="Chọn sản phẩm"
          options={products?.data
            .filter((p: any) => p.product_type !== 'service')
            .map((p: any) => ({ value: p.id, label: p.name }))}
          onChange={(v) => setProductId(v)}
        />
      </Form.Item>
      <Form.Item name={[name, 'variant_id']} label="SKU" rules={[{ required: true }]} style={{ width: 200 }}>
        <Select
          showSearch
          optionFilterProp="label"
          placeholder="Chọn SKU"
          disabled={!productId}
          options={productDetail?.variants.map((v: any) => ({ value: v.id, label: `${v.item_code ?? v.sku} — ${v.name}` }))}
          onChange={onVariantChange}
        />
      </Form.Item>
      <Form.Item name={[name, 'quantity']} label="Số lượng" rules={[{ required: true }]}>
        <InputNumber min={1} />
      </Form.Item>
      <Form.Item name={[name, 'unit_price']} label="Đơn giá" rules={[{ required: true }]}>
        <InputNumber min={0} style={{ width: 140 }} />
      </Form.Item>
      <Form.Item name={[name, 'manufacturer_warranty_months']} label="BH hãng (tháng)">
        <InputNumber min={0} style={{ width: 120 }} />
      </Form.Item>
      <Form.Item name={[name, 'customer_warranty_months']} label="BH công ty (tháng)">
        <InputNumber min={0} style={{ width: 120 }} />
      </Form.Item>
      <Form.Item name={[name, 'note']} label="Ghi chú dòng">
        <Input style={{ width: 160 }} />
      </Form.Item>

      {poLineFields.map((f: any, i: number) => (
        <span key={f.id}>
          <Form.Item name={[name, 'custom_field_values', i, 'field_id']} hidden initialValue={f.id}>
            <Input />
          </Form.Item>
          <Form.Item
            name={[name, 'custom_field_values', i, 'value']}
            label={f.field_label}
            getValueFromEvent={(eventValue: any) => encodeCustomFieldValue(f.field_type, eventValue)}
            getValueProps={(value: any) => decodeCustomFieldValue(f.field_type, value)}
          >
            {renderCustomFieldInput(f)}
          </Form.Item>
        </span>
      ))}

      <Button danger onClick={remove}>
        Xoá
      </Button>
    </div>
  )
}

function renderCustomFieldInput(field: any) {
  switch (field.field_type) {
    case 'number':
      return <InputNumber style={{ width: 120 }} />
    case 'date':
      return <DatePicker style={{ width: 140 }} />
    case 'boolean':
      return <Switch />
    case 'select':
      return <Select style={{ width: 140 }} allowClear options={(field.options ?? []).map((o: string) => ({ value: o, label: o }))} />
    default:
      return <Input style={{ width: 140 }} />
  }
}

// Widget trả value theo kiểu native của nó (dayjs cho DatePicker, boolean cho Switch,...)
// — encode về string đúng định dạng customfield.service.ts::validateCustomFieldValue mong
// đợi (giống logic CustomFieldsPanel.tsx::submit()), để custom_field_values gửi lên API
// luôn đúng kiểu mà không cần transform thêm ở submit handler của trang cha.
function encodeCustomFieldValue(fieldType: string, eventValue: any): string | null {
  // Input/Input.TextArea (field_type="text") gọi onChange với native event, không phải
  // value trực tiếp như DatePicker/Switch/Select/InputNumber — phải bóc e.target.value.
  if (eventValue && typeof eventValue === 'object' && 'target' in eventValue) {
    eventValue = eventValue.target.value
  }
  if (eventValue === null || eventValue === undefined || eventValue === '') return null
  if (fieldType === 'date') return eventValue.format('YYYY-MM-DD')
  if (fieldType === 'boolean') return eventValue ? 'true' : 'false'
  return String(eventValue)
}

// Ngược lại với encodeCustomFieldValue — decode string đã lưu (hoặc gợi ý từ giá trị
// variant) về kiểu native widget cần để hiển thị.
function decodeCustomFieldValue(fieldType: string, value: string | null | undefined) {
  if (fieldType === 'boolean') return { checked: value === 'true' }
  if (value === null || value === undefined || value === '') {
    return fieldType === 'date' ? { value: null } : { value: undefined }
  }
  if (fieldType === 'date') return { value: dayjs(value) }
  if (fieldType === 'number') return { value: Number(value) }
  return { value }
}
