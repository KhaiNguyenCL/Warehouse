import { useState } from 'react'
import { Form, InputNumber, Input, Button, Switch, Tooltip } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'
import type { FormInstance } from 'antd'
import type { ReactNode } from 'react'
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

// Mỗi field tự mang label riêng ngay phía trên — tránh lệ thuộc vào 1 header dùng chung
// canh theo lưới cột cố định (input AntD có min-width nội tại lớn hơn cột khai báo sẽ làm
// lưới "nổ" lệch khỏi header, vì header chỉ là text không bị blowout).
function Field({ label, grow, basis, children }: { label: string; grow?: boolean; basis?: number; children: ReactNode }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      minWidth: 0,
      flex: grow ? '1 1 0' : `0 0 ${basis}px`,
    }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{label}</span>
      {children}
    </div>
  )
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

export default function QuotationLineItem({ form, parentPath, name, productId, remove }: Props) {
  const [isService, setIsService] = useState(false)
  const [lotHint, setLotHint] = useState<string | null>(null)

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
    if (!variant) {
      setLotHint(null)
      return
    }
    const isBundle = variant.product_type === 'bundle'
    const isSvc = variant.product_type === 'service'
    setIsService(isSvc)
    setLotHint(null)

    const warrantyStr = variant.warranty_months != null
      ? variant.warranty_months === 0 ? 'Không bảo hành' : `${variant.warranty_months} tháng`
      : undefined

    form.setFields([
      { name: [...parentPath, name, 'variant_id'],  value: isBundle ? undefined : variant.id },
      { name: [...parentPath, name, 'bundle_id'],   value: isBundle ? variant.id : undefined },
      { name: [...parentPath, name, 'unit_price'],  value: variant.sale_price != null ? Number(variant.sale_price) : (variant.cost_price != null ? Number(variant.cost_price) : undefined) },
      { name: [...parentPath, name, 'vat_percent'], value: variant.vat_percent != null ? Number(variant.vat_percent) : 0 },
      { name: [...parentPath, name, 'is_reserved'], value: !isSvc },
      { name: [...parentPath, name, 'unit'],        value: variant.unit ?? undefined },
      ...(warrantyStr != null ? [{ name: [...parentPath, name, 'warranty'], value: warrantyStr }] : []),
    ])

    if (!isBundle && !isSvc) {
      api.get('/inventory/lots', { params: { variant_id: variant.id } })
        .then((res) => {
          const lots: LotHint[] = res.data?.data ?? res.data ?? []
          setLotHint(buildLotHint(lots))
        })
        .catch(() => {})
    }
  }

  return (
    <div style={{
      marginBottom: 8,
      padding: '8px 10px',
      border: '1px solid var(--border)',
      borderRadius: 6,
      background: 'var(--bg-subtle)',
    }}>
      {/* Dòng 1: các field chữ (cần rộng) */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <Field label="SKU / Sản phẩm" grow>
          <Form.Item noStyle>
            <VariantSelect
              value={selectValue}
              onSelectVariant={onSelectVariant}
              style={{ width: '100%' }}
              productId={productId}
            />
          </Form.Item>
          {lotHint && (
            <div style={{ marginTop: 3, fontSize: 11, color: 'var(--text-2)', lineHeight: 1.4, paddingLeft: 2 }}>
              Tồn: {lotHint}
            </div>
          )}
          <Form.Item name={path('variant_id')} hidden><Input /></Form.Item>
          <Form.Item name={path('bundle_id')} hidden><Input /></Form.Item>
        </Field>

        <Field label="Mô tả" grow>
          <Form.Item name={path('description')} noStyle>
            <Input.TextArea placeholder="Mô tả trên báo giá" autoSize={{ minRows: 1, maxRows: 4 }} style={{ width: '100%' }} />
          </Form.Item>
        </Field>

        <Field label="Ghi chú" grow>
          <Form.Item name={path('note')} noStyle>
            <Input.TextArea autoSize={{ minRows: 1, maxRows: 4 }} style={{ width: '100%' }} />
          </Form.Item>
        </Field>

        <Tooltip title="Xoá dòng">
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={remove}
            style={{ marginTop: 17 }}
          />
        </Tooltip>
      </div>

      {/* Dòng 2: các field ngắn (số lượng, giá, thuế...) */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginTop: 6 }}>
        <Field label="ĐVT" basis={70}>
          <Form.Item name={path('unit')} noStyle>
            <Input placeholder="Cái" style={{ width: '100%', textAlign: 'center' }} />
          </Form.Item>
        </Field>

        <Field label="SL" basis={80}>
          <Form.Item name={path('quantity')} noStyle rules={[{ required: true, message: '' }]}>
            <InputNumber {...numProps} min={0.01} style={{ width: '100%' }} />
          </Form.Item>
        </Field>

        <Field label="Đơn giá" basis={140}>
          <Form.Item name={path('unit_price')} noStyle rules={[{ required: true, message: '' }]}>
            <InputNumber {...numProps} min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Field>

        <Field label="VAT%" basis={64}>
          <Form.Item name={path('vat_percent')} noStyle>
            <InputNumber controls={false} precision={0} min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>
        </Field>

        <Field label="Bảo hành" basis={110}>
          <Form.Item name={path('warranty')} noStyle>
            <Input placeholder="12 tháng" style={{ width: '100%' }} />
          </Form.Item>
        </Field>

        <Field label="Giữ chỗ" basis={64}>
          <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 5 }}>
            <Form.Item name={path('is_reserved')} noStyle valuePropName="checked" initialValue={true}>
              <Switch disabled={isService} size="small" />
            </Form.Item>
          </div>
        </Field>

        <div style={{ flex: '1 1 0', display: 'flex', justifyContent: 'flex-end', gap: 24, paddingBottom: 5, fontSize: 12, color: 'var(--text-2)' }}>
          <span>Thành tiền: <strong style={{ color: 'var(--text-1)', fontVariantNumeric: 'tabular-nums' }}>{fmt(lineTotal)}</strong></span>
          <span>Thuế GTGT: <strong style={{ color: 'var(--text-1)', fontVariantNumeric: 'tabular-nums' }}>{fmt(vatAmount)}</strong></span>
          <span style={{ color: 'var(--text-1)' }}>Tổng tiền: <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(lineTotal + vatAmount)}</strong></span>
        </div>
      </div>
    </div>
  )
}
