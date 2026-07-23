// 1 dòng trong Form.List "lines" của DO create — export_type không xuất phát từ Quotation
// (internal/demo_out/warranty_out/return_out/dispose/adjustment). Dùng VariantSelect thay
// cho 2-step Product→SKU; khi chọn variant hiện breakdown tồn kho theo từng kho.
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Form, InputNumber, Input, Button, DatePicker } from 'antd'
import { api } from '../lib/api'
import VariantSelect, { type VariantData } from './VariantSelect'

interface Props {
  name: number
  remove: () => void
}

export default function DeliveryLineItem({ name, remove }: Props) {
  const [variantId, setVariantId] = useState<string | undefined>()
  const [isService, setIsService] = useState(false)

  const { data: invData } = useQuery({
    queryKey: ['inventory', 'by-variant', variantId],
    queryFn: async () =>
      (await api.get('/inventory/by-variant', { params: { variant_id: variantId, limit: 100 } })).data,
    enabled: !!variantId && !isService,
  })

  const breakdown: { name: string; qty: number }[] =
    invData?.data?.find((r: any) => r.variant_id === variantId)?.warehouse_breakdown ?? []

  function onSelectVariant(variant: VariantData | null) {
    setVariantId(variant?.id)
    setIsService(variant?.product_type === 'service')
  }

  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start', flexWrap: 'nowrap' }}>
      <Form.Item name={[name, 'variant_id']} label="Mã hàng / SKU" rules={[{ required: true }]} style={{ minWidth: 260 }}>
        <VariantSelect onSelectVariant={onSelectVariant} style={{ width: '100%' }} />
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
