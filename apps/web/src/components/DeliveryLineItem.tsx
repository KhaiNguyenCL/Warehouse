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
  const [variantId, setVariantId] = useState<string | undefined>()

  const { data: products } = useQuery({
    queryKey: ['products', 'all'],
    queryFn: async () => (await api.get('/products', { params: { limit: 100 } })).data,
  })

  const { data: productDetail } = useQuery({
    queryKey: ['products', productId],
    queryFn: async () => (await api.get(`/products/${productId}`)).data,
    enabled: !!productId,
  })

  const isService = productDetail?.product_type === 'service'

  const { data: invData } = useQuery({
    queryKey: ['inventory', 'by-variant', variantId],
    queryFn: async () =>
      (await api.get('/inventory/by-variant', { params: { variant_id: variantId, limit: 100 } })).data,
    enabled: !!variantId && !isService,
  })

  const breakdown: { name: string; qty: number }[] =
    invData?.data?.find((r: any) => r.variant_id === variantId)?.warehouse_breakdown ?? []

  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
      <Form.Item label="Sản phẩm" style={{ width: 200 }}>
        <Select
          showSearch
          optionFilterProp="label"
          placeholder="Chọn sản phẩm"
          options={products?.data.map((p: any) => ({ value: p.id, label: p.name }))}
          onChange={(v) => {
            setProductId(v)
            setVariantId(undefined)
          }}
        />
      </Form.Item>
      <Form.Item name={[name, 'variant_id']} label="SKU" rules={[{ required: true }]} style={{ width: 220 }}>
        <Select
          showSearch
          optionFilterProp="label"
          placeholder="Chọn SKU"
          disabled={!productId}
          options={productDetail?.variants.map((v: any) => ({ value: v.id, label: `${v.item_code ?? v.sku} — ${v.name}` }))}
          onChange={(v) => setVariantId(v)}
        />
      </Form.Item>
      {variantId && !isService && (
        <div style={{ alignSelf: 'center', fontSize: 12, color: '#888', minWidth: 160, marginBottom: 8 }}>
          {breakdown.length === 0
            ? <span style={{ color: '#ff4d4f' }}>Hết hàng</span>
            : breakdown.map((w) => (
                <span key={w.name} style={{ marginRight: 8, whiteSpace: 'nowrap' }}>
                  {w.name}<span style={{ marginLeft: 2 }}>({w.qty})</span>
                </span>
              ))
          }
        </div>
      )}
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
