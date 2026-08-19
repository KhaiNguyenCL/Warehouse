// 1 dòng trong Form.List "lines" của DO create — export_type không xuất phát từ Quotation
// (internal/demo_out/warranty_out/return_out/dispose/adjustment). Dùng VariantSelect thay
// cho 2-step Product→SKU; khi chọn variant hiện breakdown tồn kho theo từng kho.
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Form, InputNumber, Input, Button } from 'antd'
import { api } from '../lib/api'
import VariantSelect, { type VariantData } from './VariantSelect'

interface Props {
  name: number
  remove: () => void
  exportType?: string
}

const NO_STOCK_FILTER = ['adjustment']

export default function DeliveryLineItem({ name, remove, exportType }: Props) {
  const inStockOnly = !!exportType && !NO_STOCK_FILTER.includes(exportType)
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
    <div style={{ display: 'flex', gap: 12, marginBottom: 4, alignItems: 'flex-end', flexWrap: 'nowrap' }}>
      <Form.Item name={[name, 'variant_id']} label="Mã hàng / SKU" rules={[{ required: true }]} style={{ flex: '0 0 360px', marginBottom: 0 }}>
        <VariantSelect onSelectVariant={onSelectVariant} style={{ width: '100%' }} inStockOnly={inStockOnly} />
      </Form.Item>
      {variantId && !isService && (
        <div style={{ fontSize: 12, color: '#888', flex: '0 0 160px', paddingBottom: 4 }}>
          {breakdown.length === 0
            ? <span style={{ color: '#ff4d4f' }}>Hết hàng</span>
            : breakdown.map((w) => (
                <span key={w.name} style={{ display: 'block', whiteSpace: 'nowrap' }}>
                  {w.name}: <b>{w.qty}</b>
                </span>
              ))
          }
        </div>
      )}
      <Form.Item name={[name, 'quantity']} label="Số lượng" rules={[{ required: true }]} style={{ flex: '0 0 110px', marginBottom: 0 }}>
        <InputNumber min={1} style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item name={[name, 'note']} label="Ghi chú" style={{ flex: '1 1 200px', marginBottom: 0 }}>
        <Input />
      </Form.Item>
      <Button danger onClick={remove} style={{ flexShrink: 0, marginBottom: 0 }}>
        Xoá
      </Button>
    </div>
  )
}
