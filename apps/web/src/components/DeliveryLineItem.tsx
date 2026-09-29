// 1 dòng <tr> trong bảng .kv-table.kv-lines của Form.List "lines" — dùng chung cho
// DeliveryOrderCreatePage (export_type không xuất phát từ Quotation) VÀ TransferOrderCreatePage.
// Dùng VariantSelect thay cho 2-step Product→SKU; khi chọn variant hiện breakdown tồn kho theo
// từng kho (cột riêng, khớp cột "Tồn kho theo kho" ở DeliveryOrderDetailPage view mode).
//
// `extraCell` — cột phụ do trang gọi tự chèn (VD "Kho nguồn dòng" chỉ Transfer mới có), tránh
// phải tách 2 bản component gần giống hệt nhau.
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Form, InputNumber, Input, DatePicker } from 'antd'
import { X } from 'lucide-react'
import { api } from '../lib/api'
import VariantSelect, { type VariantData } from './VariantSelect'

interface Props {
  name: number
  remove: () => void
  exportType?: string
  extraCell?: React.ReactNode
}

const NO_STOCK_FILTER = ['adjustment']

export default function DeliveryLineItem({ name, remove, exportType, extraCell }: Props) {
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
    <tr className="kv-line-hover">
      <td className="kv-line-no">{name + 1}</td>

      <td>
        <Form.Item name={[name, 'variant_id']} noStyle rules={[{ required: true }]}>
          <VariantSelect onSelectVariant={onSelectVariant} style={{ width: '100%' }} inStockOnly={inStockOnly} />
        </Form.Item>
      </td>

      <td className="kv-muted" style={{ fontSize: 12 }}>
        {variantId && !isService && (
          breakdown.length === 0
            ? <span style={{ color: 'var(--s-cancelled-color)' }}>Hết hàng</span>
            : breakdown.map((w) => (
                <span key={w.name} style={{ display: 'block', whiteSpace: 'nowrap' }}>
                  {w.name}: <b>{w.qty}</b>
                </span>
              ))
        )}
      </td>

      <td>
        <Form.Item name={[name, 'quantity']} noStyle rules={[{ required: true }]}>
          <InputNumber min={1} style={{ width: '100%' }} />
        </Form.Item>
      </td>

      <td>
        <Form.Item name={[name, 'customer_warranty_start']} noStyle>
          <DatePicker style={{ width: '100%' }} placeholder="Tuỳ chọn" format="DD/MM/YYYY" />
        </Form.Item>
      </td>

      <td>
        <Form.Item name={[name, 'note']} noStyle>
          <Input placeholder="Ghi chú..." style={{ width: '100%' }} />
        </Form.Item>
      </td>

      {extraCell != null && <td>{extraCell}</td>}

      <td className="text-center">
        <button type="button" className="kv-icon-btn kv-row-del" aria-label={`Xoá dòng ${name + 1}`} onClick={remove}>
          <X className="h-4 w-4" />
        </button>
      </td>
    </tr>
  )
}
