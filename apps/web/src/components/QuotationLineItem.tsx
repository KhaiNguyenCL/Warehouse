// 1 dòng trong Form.List "line_items" lồng trong Form.List "sections" — cascading Select
// Product → Variant giống POLineItem, nhưng thêm logic: nếu Product chọn là loại "bundle"
// thì lưu vào field bundle_id (không phải variant_id); nếu là "service" thì ép is_reserved
// = false + disable (CLAUDE.md mục 4/7 — service không bao giờ giữ chỗ kho).
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Form, Select, InputNumber, Input, Button, Switch } from 'antd'
import type { FormInstance } from 'antd'
import { api } from '../lib/api'

interface Props {
  form: FormInstance
  sectionName: number
  name: number
  remove: () => void
}

export default function QuotationLineItem({ form, sectionName, name, remove }: Props) {
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

  function path(field: string) {
    return ['sections', sectionName, 'line_items', name, field]
  }

  function onVariantChange(variantId: string) {
    const variant = productDetail?.variants.find((v: any) => v.id === variantId)
    if (!variant) return
    const isBundle = productDetail.product_type === 'bundle'
    const isService = productDetail.product_type === 'service'

    form.setFields([
      { name: path('variant_id'), value: isBundle ? undefined : variantId },
      { name: path('bundle_id'), value: isBundle ? variantId : undefined },
      { name: path('unit_price'), value: variant.sale_price ?? variant.cost_price },
      { name: path('is_reserved'), value: !isService },
    ])
  }

  const isService = productDetail?.product_type === 'service'

  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
      <Form.Item label="Sản phẩm" style={{ width: 200 }}>
        <Select
          placeholder="Chọn sản phẩm"
          options={products?.data.map((p: any) => ({ value: p.id, label: `${p.name} (${p.product_type})` }))}
          onChange={(v) => setProductId(v)}
        />
      </Form.Item>
      <Form.Item label="SKU" style={{ width: 200 }}>
        <Select
          placeholder="Chọn SKU"
          disabled={!productId}
          options={productDetail?.variants.map((v: any) => ({ value: v.id, label: `${v.sku} — ${v.name}` }))}
          onChange={onVariantChange}
        />
      </Form.Item>
      <Form.Item name={[name, 'variant_id']} hidden>
        <Input />
      </Form.Item>
      <Form.Item name={[name, 'bundle_id']} hidden>
        <Input />
      </Form.Item>
      <Form.Item name={[name, 'description']} label="Mô tả (hiện trên báo giá)" style={{ width: 220 }}>
        <Input />
      </Form.Item>
      <Form.Item name={[name, 'quantity']} label="Số lượng" rules={[{ required: true }]}>
        <InputNumber min={0.01} />
      </Form.Item>
      <Form.Item name={[name, 'unit_price']} label="Đơn giá" rules={[{ required: true }]}>
        <InputNumber min={0} style={{ width: 140 }} />
      </Form.Item>
      <Form.Item name={[name, 'vat_percent']} label="VAT (%)" initialValue={0}>
        <InputNumber min={0} max={100} />
      </Form.Item>
      <Form.Item name={[name, 'warranty']} label="Bảo hành">
        <Input placeholder="VD: 12 tháng" style={{ width: 120 }} />
      </Form.Item>
      <Form.Item name={[name, 'is_reserved']} label="Giữ chỗ kho" valuePropName="checked" initialValue={true}>
        <Switch disabled={isService} />
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
