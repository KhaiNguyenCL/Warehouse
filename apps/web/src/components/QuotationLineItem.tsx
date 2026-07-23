// 1 dòng trong Form.List "line_items" lồng trong Form.List "sections" — dùng VariantSelect
// thay cho 2-step Product→SKU. Routing: bundle → bundle_id, còn lại → variant_id (hidden
// fields). Service → ép is_reserved=false và disable switch (CLAUDE.md mục 4/7).
import { useState } from 'react'
import { Form, InputNumber, Input, Button, Switch } from 'antd'
import type { FormInstance } from 'antd'
import VariantSelect, { type VariantData } from './VariantSelect'

interface Props {
  form: FormInstance
  sectionName: number
  name: number
  remove: () => void
}

export default function QuotationLineItem({ form, sectionName, name, remove }: Props) {
  const [isService, setIsService] = useState(false)

  function path(field: string) {
    return ['sections', sectionName, 'line_items', name, field]
  }

  function onSelectVariant(variant: VariantData | null) {
    if (!variant) return
    const isBundle = variant.product_type === 'bundle'
    const isSvc = variant.product_type === 'service'
    setIsService(isSvc)

    form.setFields([
      { name: path('variant_id'), value: isBundle ? undefined : variant.id },
      { name: path('bundle_id'), value: isBundle ? variant.id : undefined },
      { name: path('unit_price'), value: variant.sale_price ?? variant.cost_price },
      { name: path('is_reserved'), value: !isSvc },
    ])
  }

  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start', flexWrap: 'nowrap' }}>
      <Form.Item label="Mã hàng / SKU" style={{ minWidth: 260 }}>
        <VariantSelect onSelectVariant={onSelectVariant} style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item name={[name, 'variant_id']} hidden><Input /></Form.Item>
      <Form.Item name={[name, 'bundle_id']} hidden><Input /></Form.Item>
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
