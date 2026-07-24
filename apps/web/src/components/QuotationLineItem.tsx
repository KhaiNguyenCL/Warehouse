// 1 dòng trong Form.List "line_items" lồng trong Form.List "sections" — dùng VariantSelect
// thay cho 2-step Product→SKU. Routing: bundle → bundle_id, còn lại → variant_id (hidden
// fields). Service → ép is_reserved=false và disable switch (CLAUDE.md mục 4/7).
import { useState } from 'react'
import { Form, InputNumber, Input, Button, Switch, Tooltip } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'
import type { FormInstance } from 'antd'
import VariantSelect, { type VariantData } from './VariantSelect'

interface Props {
  form: FormInstance
  sectionName: number
  name: number
  remove: () => void
}

// Thứ tự cột: SKU | Mô tả | SL | Đơn giá | VAT% | Bảo hành | Ghi chú | Giữ chỗ | Xoá
const GRID_COLS = '2fr 1.5fr 58px 140px 56px 78px 1fr 46px 30px'

const numProps = {
  controls: false,
  formatter: (v: any) => (v != null && v !== '' ? String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''),
  parser:    (v: any) => (v ? v.replace(/,/g, '') : ''),
}

const COL_LABELS = [
  { text: 'SKU / Sản phẩm' },
  { text: 'Mô tả' },
  { text: 'SL', align: 'center' as const },
  { text: 'Đơn giá', align: 'right' as const },
  { text: 'VAT%', align: 'center' as const },
  { text: 'Bảo hành' },
  { text: 'Ghi chú' },
  { text: 'Giữ chỗ', align: 'center' as const },
  { text: '' },
]

export function QuotationLineHeader() {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: GRID_COLS,
      gap: '0 8px',
      marginBottom: 4,
      padding: '0 2px',
    }}>
      {COL_LABELS.map(({ text, align }, i) => (
        <div key={i} style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--text-2)',
          textTransform: 'uppercase',
          letterSpacing: '0.3px',
          textAlign: align ?? 'left',
        }}>
          {text}
        </div>
      ))}
    </div>
  )
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
    <div style={{
      display: 'grid',
      gridTemplateColumns: GRID_COLS,
      gap: '0 8px',
      marginBottom: 6,
      alignItems: 'flex-start',
    }}>

      <Form.Item noStyle>
        <VariantSelect onSelectVariant={onSelectVariant} style={{ width: '100%' }} />
      </Form.Item>

      <Form.Item name={[name, 'variant_id']} hidden><Input /></Form.Item>
      <Form.Item name={[name, 'bundle_id']} hidden><Input /></Form.Item>

      <Form.Item name={[name, 'description']} noStyle>
        <Input.TextArea
          placeholder="Mô tả trên báo giá"
          autoSize={{ minRows: 1, maxRows: 4 }}
          style={{ width: '100%' }}
        />
      </Form.Item>

      <Form.Item name={[name, 'quantity']} noStyle rules={[{ required: true, message: '' }]}>
        <InputNumber {...numProps} min={0.01} style={{ width: '100%', textAlign: 'center' }} />
      </Form.Item>

      <Form.Item name={[name, 'unit_price']} noStyle rules={[{ required: true, message: '' }]}>
        <InputNumber {...numProps} min={0} style={{ width: '100%' }} />
      </Form.Item>

      <Form.Item name={[name, 'vat_percent']} noStyle initialValue={0}>
        <InputNumber controls={false} min={0} max={100} style={{ width: '100%', textAlign: 'center' }} />
      </Form.Item>

      <Form.Item name={[name, 'warranty']} noStyle>
        <Input placeholder="12 tháng" style={{ width: '100%' }} />
      </Form.Item>

      <Form.Item name={[name, 'note']} noStyle>
        <Input.TextArea
          autoSize={{ minRows: 1, maxRows: 4 }}
          style={{ width: '100%' }}
        />
      </Form.Item>

      {/* Giữ chỗ + Xoá — căn giữa dọc so với hàng */}
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 6 }}>
        <Form.Item name={[name, 'is_reserved']} noStyle valuePropName="checked" initialValue={true}>
          <Switch disabled={isService} size="small" />
        </Form.Item>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 2 }}>
        <Tooltip title="Xoá dòng">
          <Button type="text" danger icon={<DeleteOutlined />} onClick={remove} style={{ padding: '2px 4px' }} />
        </Tooltip>
      </div>

    </div>
  )
}
