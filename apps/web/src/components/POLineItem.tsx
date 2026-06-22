// 1 dòng trong Form.List của PO/Receipt create modal — cascading Select: chọn Product
// trước, Variant (SKU) sau (vì API không có endpoint "list tất cả variant" — phải đi
// qua product). Khi chọn variant, tự điền unit_price/warranty_months từ giá trị gợi ý
// mặc định trên variant (cost_price/warranty_months) — đúng tinh thần đã thống nhất:
// variant chỉ là default, PO line lưu giá trị riêng, sửa độc lập sau đó.
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Form, Select, InputNumber, Input, Button } from 'antd'
import type { FormInstance } from 'antd'
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

  function onVariantChange(variantId: string) {
    const variant = productDetail?.variants.find((v: any) => v.id === variantId)
    if (variant) {
      const lines = form.getFieldValue('lines')
      lines[name] = {
        ...lines[name],
        variant_id: variantId,
        unit_price: variant.cost_price ?? lines[name]?.unit_price,
        warranty_months: variant.warranty_months ?? lines[name]?.warranty_months,
      }
      form.setFieldValue('lines', lines)
    }
  }

  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'baseline' }}>
      <Form.Item label="Sản phẩm" style={{ width: 200 }}>
        <Select
          placeholder="Chọn sản phẩm"
          options={products?.data
            .filter((p: any) => p.product_type !== 'service')
            .map((p: any) => ({ value: p.id, label: p.name }))}
          onChange={(v) => setProductId(v)}
        />
      </Form.Item>
      <Form.Item name={[name, 'variant_id']} label="SKU" rules={[{ required: true }]} style={{ width: 200 }}>
        <Select
          placeholder="Chọn SKU"
          disabled={!productId}
          options={productDetail?.variants.map((v: any) => ({ value: v.id, label: `${v.sku} — ${v.name}` }))}
          onChange={onVariantChange}
        />
      </Form.Item>
      <Form.Item name={[name, 'quantity']} label="Số lượng" rules={[{ required: true }]}>
        <InputNumber min={1} />
      </Form.Item>
      <Form.Item name={[name, 'unit_price']} label="Đơn giá" rules={[{ required: true }]}>
        <InputNumber min={0} style={{ width: 140 }} />
      </Form.Item>
      <Form.Item name={[name, 'warranty_months']} label="Bảo hành (tháng)">
        <InputNumber min={0} />
      </Form.Item>
      <Form.Item name={[name, 'note']} label="Ghi chú dòng">
        <Input style={{ width: 160 }} />
      </Form.Item>
      <Button danger onClick={remove}>
        Xoá
      </Button>
    </div>
  )
}
