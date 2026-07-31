import { useState } from 'react'
import { Form, InputNumber, Input, Button, Switch, Tooltip } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'
import type { FormInstance } from 'antd'
import VariantSelect, { type VariantData } from './VariantSelect'

interface Props {
  form: FormInstance
  // Đường dẫn tuyệt đối từ form root đến mảng line_items chứa dòng này
  // VD: ['sections', 0, 'line_items'] hoặc ['sections', 0, 'sub_sections', 1, 'line_items']
  parentPath: (string | number)[]
  name: number
  productId?: string
  remove: () => void
}

const GRID_COLS = '2fr 1.5fr 58px 140px 56px 78px 1fr 46px 30px'

const numProps = {
  controls: false,
  formatter: (v: any) => (v != null && v !== '' ? String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''),
  parser:    (v: any) => (v ? v.replace(/,/g, '') : ''),
}

function fmt(n: number) {
  return n.toLocaleString('en-US')
}

const COL_LABELS = [
  { text: 'SKU / Sản phẩm' },
  { text: 'Mô tả' },
  { text: 'SL' },
  { text: 'Đơn giá' },
  { text: 'VAT%' },
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

export default function QuotationLineItem({ form, parentPath, name, productId, remove }: Props) {
  const [isService, setIsService] = useState(false)

  const qty   = Number(Form.useWatch([...parentPath, name, 'quantity'],   form) ?? 0)
  const price = Number(Form.useWatch([...parentPath, name, 'unit_price'], form) ?? 0)
  const vat   = Number(Form.useWatch([...parentPath, name, 'vat_percent'], form) ?? 0)

  const lineTotal = qty * price
  const vatAmount = lineTotal * (vat / 100)

  function path(field: string) {
    return [name, field]
  }

  const currentVariantId = Form.useWatch([...parentPath, name, 'variant_id'], form)
  const currentBundleId  = Form.useWatch([...parentPath, name, 'bundle_id'],  form)
  const selectValue = currentVariantId ?? currentBundleId ?? undefined

  function onSelectVariant(variant: VariantData | null) {
    if (!variant) return
    const isBundle = variant.product_type === 'bundle'
    const isSvc = variant.product_type === 'service'
    setIsService(isSvc)

    const warrantyStr = variant.warranty_months != null
      ? variant.warranty_months === 0 ? 'Không bảo hành' : `${variant.warranty_months} tháng`
      : undefined

    form.setFields([
      { name: [...parentPath, name, 'variant_id'],  value: isBundle ? undefined : variant.id },
      { name: [...parentPath, name, 'bundle_id'],   value: isBundle ? variant.id : undefined },
      { name: [...parentPath, name, 'unit_price'],  value: variant.sale_price ?? variant.cost_price },
      { name: [...parentPath, name, 'vat_percent'], value: variant.vat_percent ?? 0 },
      { name: [...parentPath, name, 'is_reserved'], value: !isSvc },
      ...(warrantyStr != null ? [{ name: [...parentPath, name, 'warranty'], value: warrantyStr }] : []),
    ])
  }

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: GRID_COLS,
        gap: '0 8px',
        alignItems: 'flex-start',
      }}>
        <Form.Item noStyle>
          <VariantSelect
            value={selectValue}
            onSelectVariant={onSelectVariant}
            style={{ width: '100%' }}
            productId={productId}
          />
        </Form.Item>

        <Form.Item name={path('variant_id')} hidden><Input /></Form.Item>
        <Form.Item name={path('bundle_id')} hidden><Input /></Form.Item>

        <Form.Item name={path('description')} noStyle>
          <Input.TextArea placeholder="Mô tả trên báo giá" autoSize={{ minRows: 1, maxRows: 4 }} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name={path('quantity')} noStyle rules={[{ required: true, message: '' }]}>
          <InputNumber {...numProps} min={0.01} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name={path('unit_price')} noStyle rules={[{ required: true, message: '' }]}>
          <InputNumber {...numProps} min={0} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name={path('vat_percent')} noStyle initialValue={0}>
          <InputNumber controls={false} min={0} max={100} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name={path('warranty')} noStyle>
          <Input placeholder="12 tháng" style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name={path('note')} noStyle>
          <Input.TextArea autoSize={{ minRows: 1, maxRows: 4 }} style={{ width: '100%' }} />
        </Form.Item>

        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 6 }}>
          <Form.Item name={path('is_reserved')} noStyle valuePropName="checked" initialValue={true}>
            <Switch disabled={isService} size="small" />
          </Form.Item>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 2 }}>
          <Tooltip title="Xoá dòng">
            <Button type="text" danger icon={<DeleteOutlined />} onClick={remove} style={{ padding: '2px 4px' }} />
          </Tooltip>
        </div>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: 24,
        paddingRight: 38,
        paddingTop: 2,
        fontSize: 12,
        color: 'var(--text-2)',
      }}>
        <span>Thành tiền: <strong style={{ color: 'var(--text-1)', fontVariantNumeric: 'tabular-nums' }}>{fmt(lineTotal)}</strong></span>
        <span>Thuế GTGT: <strong style={{ color: 'var(--text-1)', fontVariantNumeric: 'tabular-nums' }}>{fmt(vatAmount)}</strong></span>
        <span style={{ color: 'var(--text-1)' }}>Tổng tiền: <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(lineTotal + vatAmount)}</strong></span>
      </div>
    </div>
  )
}
