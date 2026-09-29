import { useState } from 'react'
import { Form, InputNumber, Input, Switch } from 'antd'
import type { FormInstance } from 'antd'
import { X } from 'lucide-react'
import VariantSelect, { type VariantData } from './VariantSelect'
import { api } from '../lib/api'

interface Props {
  form: FormInstance
  // Đường dẫn tuyệt đối từ form root đến mảng line_items chứa dòng này
  // VD: ['sections', 0, 'line_items'] hoặc ['sections', 0, 'sub_sections', 1, 'line_items']
  parentPath: (string | number)[]
  name: number
  productId?: string
  remove: () => void
}

const numProps = {
  controls: false,
  formatter: (v: any) => (v != null && v !== '' ? String(Math.round(Number(v))).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''),
  parser:    (v: any) => (v ? Number(String(v).replace(/,/g, '')) : ('' as any)),
}

function fmt(n: number) {
  return n.toLocaleString('en-US')
}

interface LotHint {
  manufacturer_warranty_months: number | null
  customer_warranty_months: number | null
  qty_remaining: number
}

function buildLotHint(lots: LotHint[]): string | null {
  const active = lots.filter((l) => l.qty_remaining > 0)
  if (!active.length) return null
  const map = new Map<string, number>()
  for (const l of active) {
    const key = `${l.manufacturer_warranty_months ?? '?'}|${l.customer_warranty_months ?? '?'}`
    map.set(key, (map.get(key) ?? 0) + l.qty_remaining)
  }
  return [...map.entries()].map(([key, qty]) => {
    const [mw, cw] = key.split('|')
    const mwStr = mw === '?' ? 'BH hãng ?' : mw === '0' ? 'Không BH hãng' : `BH hãng ${mw}T`
    const cwStr = cw === '?' || cw === '0' ? '' : ` · BH cty ${cw}T`
    return `${mwStr}${cwStr}: ${qty} cái`
  }).join('  |  ')
}

// 1 dòng <tr> trong bảng .kv-table.kv-lines của QuotationSectionItem.tsx (cả Section gốc lẫn
// Sub-section đều dùng chung component này) — cùng khuôn với ReceiptFormPage.tsx::CreateLinesTable
// để form nhập liệu và LineTable (view mode, QuotationDetailPage.tsx) nhìn cùng 1 hệ bảng.
export default function QuotationLineItem({ form, parentPath, name, productId, remove }: Props) {
  const [isService, setIsService] = useState(false)
  const [lotHint, setLotHint] = useState<string | null>(null)

  const qty   = Number(Form.useWatch([...parentPath, name, 'quantity'],   form) ?? 0)
  const price = Number(Form.useWatch([...parentPath, name, 'unit_price'], form) ?? 0)
  const vat   = Number(Form.useWatch([...parentPath, name, 'vat_percent'], form) ?? 0)
  const unit  = Form.useWatch([...parentPath, name, 'unit'], form)

  const lineTotal = qty * price
  const vatAmount = lineTotal * (vat / 100)

  function path(field: string) {
    return [name, field]
  }

  const currentVariantId = Form.useWatch([...parentPath, name, 'variant_id'], form)
  const currentBundleId  = Form.useWatch([...parentPath, name, 'bundle_id'],  form)
  const selectValue = currentVariantId ?? currentBundleId ?? undefined

  function onSelectVariant(variant: VariantData | null) {
    if (!variant) {
      setLotHint(null)
      return
    }
    const isBundle = variant.product_type === 'bundle'
    const isSvc = variant.product_type === 'service'
    setIsService(isSvc)
    setLotHint(null)

    const warrantyStr = variant.manufacturer_warranty_months != null
      ? variant.manufacturer_warranty_months === 0 ? 'Không bảo hành' : `${variant.manufacturer_warranty_months} tháng`
      : undefined

    form.setFields([
      { name: [...parentPath, name, 'variant_id'],  value: isBundle ? undefined : variant.id },
      { name: [...parentPath, name, 'bundle_id'],   value: isBundle ? variant.id : undefined },
      { name: [...parentPath, name, 'unit_price'],  value: variant.sale_price != null ? Number(variant.sale_price) : (variant.cost_price != null ? Number(variant.cost_price) : undefined) },
      { name: [...parentPath, name, 'vat_percent'], value: variant.vat_percent != null ? Number(variant.vat_percent) : 0 },
      { name: [...parentPath, name, 'is_reserved'], value: !isSvc },
      { name: [...parentPath, name, 'unit'],        value: variant.unit ?? undefined },
      ...(warrantyStr != null ? [{ name: [...parentPath, name, 'warranty'], value: warrantyStr }] : []),
        ...(variant.description ? [{ name: [...parentPath, name, 'description'], value: variant.description }] : []),
    ])

    if (!isBundle && !isSvc) {
      api.get('/inventory/lots', { params: { variant_id: variant.id } })
        .then((res) => {
          const lots: LotHint[] = res.data?.data ?? res.data ?? []
          setLotHint(buildLotHint(lots))
        })
        .catch(() => {})
    }

    // Nếu có company_id ở form → lookup mô tả riêng theo khách và ghi đè description.
    const companyId: string | undefined = form.getFieldValue('company_id')
    if (companyId && variant.product_id) {
      api.get(`/products/${variant.product_id}/variants/${variant.id}/customer-descriptions`, {
        params: { company_id: companyId },
      })
        .then((res) => {
          const desc: string | undefined = res.data?.[0]?.description
          if (desc) {
            form.setFields([{ name: [...parentPath, name, 'description'], value: desc }])
          }
        })
        .catch(() => {})
    }
  }

  return (
    <tr className="kv-line-hover">
      <td className="kv-line-no">{name + 1}</td>

      <td>
        <Form.Item noStyle>
          <VariantSelect
            value={selectValue}
            onSelectVariant={onSelectVariant}
            style={{ width: '100%' }}
            productId={productId}
            showMeta
          />
        </Form.Item>
        {lotHint && (
          <div style={{ marginTop: 3, fontSize: 11, color: 'var(--text-2)', lineHeight: 1.4 }}>Tồn: {lotHint}</div>
        )}
        <Form.Item name={path('variant_id')} hidden><Input /></Form.Item>
        <Form.Item name={path('bundle_id')} hidden><Input /></Form.Item>
        <Form.Item name={path('description')} noStyle>
          <Input placeholder="Mô tả trên báo giá" style={{ width: '100%', marginTop: 4 }} />
        </Form.Item>
      </td>

      <td className="text-center">
        <Form.Item name={path('unit')} hidden><Input /></Form.Item>
        {unit || <span className="kv-muted">—</span>}
      </td>

      <td>
        <Form.Item name={path('quantity')} noStyle rules={[{ required: true, message: '' }]}>
          <InputNumber {...numProps} min={0.01} style={{ width: '100%' }} />
        </Form.Item>
      </td>

      <td>
        <Form.Item name={path('unit_price')} noStyle rules={[{ required: true, message: '' }]}>
          <InputNumber {...numProps} min={0} style={{ width: '100%' }} />
        </Form.Item>
      </td>

      <td>
        <Form.Item name={path('vat_percent')} noStyle>
          <InputNumber controls={false} precision={0} min={0} max={100} style={{ width: '100%' }} />
        </Form.Item>
      </td>

      <td className="num kv-cell-title">{fmt(lineTotal)}</td>
      <td className="num">{fmt(vatAmount)}</td>

      <td>
        <Form.Item name={path('warranty')} noStyle>
          <Input placeholder="12 tháng" style={{ width: '100%' }} />
        </Form.Item>
      </td>

      <td className="text-center">
        <Form.Item name={path('is_reserved')} noStyle valuePropName="checked" initialValue={true}>
          <Switch disabled={isService} size="small" />
        </Form.Item>
      </td>

      <td>
        <Form.Item name={path('note')} noStyle>
          <Input placeholder="Ghi chú..." style={{ width: '100%' }} />
        </Form.Item>
      </td>

      <td className="text-center">
        <button type="button" className="kv-icon-btn kv-row-del" aria-label={`Xoá dòng ${name + 1}`} onClick={remove}>
          <X className="h-4 w-4" />
        </button>
      </td>
    </tr>
  )
}
