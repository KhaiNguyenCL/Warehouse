// 1 dòng nhập tay trong Form.List "lines" của DeliveryOrdersPage — dùng cho export_type
// KHÔNG xuất phát từ Quotation (internal/demo_out/warranty_out/return_out/dispose/
// adjustment). Cascading Select Product → Variant giống POLineItem, không cần unit_price
// (Delivery Order không lưu giá — đó là việc của Quotation).
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Form, Select, InputNumber, Input, Button, DatePicker } from 'antd'
import { api } from '../lib/api'

interface Props {
  name: number
  remove: () => void
}

export default function DeliveryLineItem({ name, remove }: Props) {
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

  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'baseline' }}>
      <Form.Item label="Sản phẩm" style={{ width: 200 }}>
        <Select
          placeholder="Chọn sản phẩm"
          options={products?.data
            .filter((p: any) => p.product_type !== 'service' && p.product_type !== 'bundle')
            .map((p: any) => ({ value: p.id, label: p.name }))}
          onChange={(v) => setProductId(v)}
        />
      </Form.Item>
      <Form.Item name={[name, 'variant_id']} label="SKU" rules={[{ required: true }]} style={{ width: 220 }}>
        <Select
          placeholder="Chọn SKU"
          disabled={!productId}
          options={productDetail?.variants.map((v: any) => ({ value: v.id, label: `${v.sku} — ${v.name}` }))}
        />
      </Form.Item>
      <Form.Item name={[name, 'quantity']} label="Số lượng" rules={[{ required: true }]}>
        <InputNumber min={1} />
      </Form.Item>
      <Form.Item name={[name, 'customer_warranty_start']} label="Ngày bắt đầu BH cty">
        <DatePicker
          style={{ width: 160 }}
          placeholder="Để trống = ngày xuất kho"
          allowClear
        />
      </Form.Item>
      <Form.Item name={[name, 'note']} label="Ghi chú dòng">
        <Input style={{ width: 200 }} />
      </Form.Item>
      <Button danger onClick={remove}>
        Xoá
      </Button>
    </div>
  )
}
