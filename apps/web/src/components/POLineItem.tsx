// 1 dòng trong Form.List của PO create page — chọn SKU qua VariantSelect (OptGroup theo
// sản phẩm, tìm kiếm theo mã/tên). Khi chọn variant tự điền unit_price/warranty_months từ
// cost_price/warranty_months mặc định của variant (user sửa được độc lập sau đó).
//
// Custom field có applies_to_po_line=true: chọn variant → prefill từ giá trị hiện tại của
// SKU đó làm gợi ý; lưu riêng theo custom_field_values của dòng PO.
import { useQuery } from '@tanstack/react-query'
import { Form, InputNumber, Input, DatePicker, Switch, Select, Button, Popover, Tooltip } from 'antd'
import { DeleteOutlined, EditOutlined } from '@ant-design/icons'
import type { FormInstance } from 'antd'
import dayjs from 'dayjs'
import { api } from '../lib/api'
import VariantSelect, { type VariantData } from './VariantSelect'

// Formatter/parser dùng chung cho các field tiền — thêm dấu , mỗi 3 chữ số
const priceFormatter = (v: number | undefined) =>
  v != null ? String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''
const priceParser = (v: string | undefined) =>
  (v ? Number(v.replace(/,/g, '')) : undefined) as number

function fmtTotal(n: number) {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

const CTRL_KEYS = ['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End']

// Chặn ký tự không phải số nguyên
function blockNonInteger(e: React.KeyboardEvent<HTMLInputElement>) {
  if (!/^\d$/.test(e.key) && !CTRL_KEYS.includes(e.key) && !(e.ctrlKey || e.metaKey))
    e.preventDefault()
}

// Chặn ký tự không phải số thực (cho phép thêm dấu .)
function blockNonDecimal(e: React.KeyboardEvent<HTMLInputElement>) {
  if (!/^\d$/.test(e.key) && e.key !== '.' && !CTRL_KEYS.includes(e.key) && !(e.ctrlKey || e.metaKey))
    e.preventDefault()
}

interface Props {
  form: FormInstance
  name: number
  remove: () => void
  showLabel?: boolean
}

export default function POLineItem({ form, name, remove, showLabel = true }: Props) {
  const { data: variantCustomFields } = useQuery({
    queryKey: ['custom-fields', 'variant'],
    queryFn: async () => (await api.get('/custom-fields', { params: { object_type: 'variant' } })).data,
  })
  const poLineFields = (variantCustomFields ?? []).filter((f: any) => f.is_active && f.applies_to_po_line)

  const note  = Form.useWatch(['lines', name, 'note'],        form)
  const qty   = Form.useWatch(['lines', name, 'quantity'],    form) ?? 0
  const price = Form.useWatch(['lines', name, 'unit_price'],  form) ?? 0
  const vat   = Form.useWatch(['lines', name, 'vat_percent'], form) ?? 0
  const total = qty && price ? qty * price * (1 + vat / 100) : null

  async function onSelectVariant(variant: VariantData | null) {
    if (!variant) return

    const lines = form.getFieldValue('lines')
    lines[name] = {
      ...lines[name],
      variant_id: variant.id,
      unit_price: variant.cost_price ?? lines[name]?.unit_price,
      manufacturer_warranty_months: variant.warranty_months ?? lines[name]?.manufacturer_warranty_months,
      customer_warranty_months: variant.warranty_months ?? lines[name]?.customer_warranty_months,
    }
    form.setFieldValue('lines', lines)

    if (poLineFields.length > 0) {
      const { data: variantValues } = await api.get('/custom-fields/values', {
        params: { object_type: 'variant', object_id: variant.id },
      })
      const lines2 = form.getFieldValue('lines')
      lines2[name] = {
        ...lines2[name],
        custom_field_values: poLineFields.map((f: any) => ({
          field_id: f.id,
          value: variantValues.find((v: any) => v.field_id === f.id)?.value ?? null,
        })),
      }
      form.setFieldValue('lines', lines2)
    }
  }

  // Dùng label=' ' (khoảng trắng) trên hàng đầu để AntD tự căn button ngang với input
  const lbl = (text: string) => (showLabel ? text : null)
  const btnLabel = showLabel ? ' ' : null

  const inputStyle = { width: '100%', fontSize: 15 }

  return (
    <div style={{ display: 'flex', gap: 8, width: '100%', marginBottom: 0, alignItems: 'flex-start', flexWrap: 'nowrap' }}>
      <Form.Item name={[name, 'variant_id']} label={lbl('Mã hàng / SKU')} style={{ flex: 2, minWidth: 0 }}>
        <VariantSelect excludeTypes={['service']} onSelectVariant={onSelectVariant} style={{ ...inputStyle }} />
      </Form.Item>

      <Form.Item name={[name, 'quantity']} label={lbl('SL')} style={{ flex: '0 0 72px' }}>
        <InputNumber controls={false} precision={0} onKeyDown={blockNonInteger} style={inputStyle} />
      </Form.Item>

      <Form.Item name={[name, 'unit_price']} label={lbl('Đơn giá')} style={{ flex: '0 0 120px' }}>
        <InputNumber controls={false} formatter={priceFormatter} parser={priceParser} onKeyDown={blockNonInteger} style={inputStyle} />
      </Form.Item>

      <Form.Item name={[name, 'vat_percent']} label={lbl('VAT %')} style={{ flex: '0 0 68px' }}>
        <InputNumber controls={false} precision={1} placeholder="—" onKeyDown={blockNonDecimal} style={inputStyle} />
      </Form.Item>

      <Form.Item label={lbl('Thành tiền')} style={{ flex: '0 0 130px' }}>
        <div style={{
          height: 32, border: '1px solid var(--border, #d9d9d9)', borderRadius: 6,
          padding: '0 11px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          background: 'var(--surface-2, rgba(0,0,0,0.02))', fontSize: 15, color: 'var(--text-2, #555)',
          whiteSpace: 'nowrap',
        }}>
          {total != null
            ? fmtTotal(total)
            : <span style={{ color: 'var(--text-3, #bbb)' }}>—</span>}
        </div>
      </Form.Item>

      <Form.Item name={[name, 'manufacturer_warranty_months']} label={lbl('BH hãng')} style={{ flex: '0 0 76px' }}>
        <InputNumber controls={false} precision={0} placeholder="—" onKeyDown={blockNonInteger} style={inputStyle} />
      </Form.Item>

      <Form.Item name={[name, 'customer_warranty_months']} label={lbl('BH công ty')} style={{ flex: '0 0 86px' }}>
        <InputNumber controls={false} precision={0} placeholder="—" onKeyDown={blockNonInteger} style={inputStyle} />
      </Form.Item>

      {poLineFields.map((f: any, i: number) => (
        <span key={f.id}>
          <Form.Item name={[name, 'custom_field_values', i, 'field_id']} hidden initialValue={f.id}>
            <Input />
          </Form.Item>
          <Form.Item
            name={[name, 'custom_field_values', i, 'value']}
            label={lbl(f.field_label)}
            getValueFromEvent={(eventValue: any) => encodeCustomFieldValue(f.field_type, eventValue)}
            getValueProps={(value: any) => decodeCustomFieldValue(f.field_type, value)}
          >
            {renderCustomFieldInput(f)}
          </Form.Item>
        </span>
      ))}

      {/* Nút ghi chú + xoá — căn ngang với ô input nhờ label=' ' */}
      <Form.Item label={btnLabel} style={{ flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, height: 32 }}>
          <Popover
            trigger="click"
            placement="top"
            content={
              <Form.Item name={[name, 'note']} noStyle>
                <Input.TextArea rows={3} style={{ width: 220 }} placeholder="Ghi chú dòng..." />
              </Form.Item>
            }
          >
            <Tooltip title="Ghi chú">
              <Button icon={<EditOutlined />} size="small" type={note ? 'primary' : 'text'} />
            </Tooltip>
          </Popover>
          <Tooltip title="Xoá dòng">
            <Button danger icon={<DeleteOutlined />} size="small" onClick={remove} />
          </Tooltip>
        </div>
      </Form.Item>
    </div>
  )
}

function renderCustomFieldInput(field: any) {
  switch (field.field_type) {
    case 'number':
      return <InputNumber controls={false} style={{ width: 120 }} />
    case 'date':
      return <DatePicker style={{ width: 140 }} />
    case 'boolean':
      return <Switch />
    case 'select':
      return <Select style={{ width: 140 }} allowClear options={(field.options ?? []).map((o: string) => ({ value: o, label: o }))} />
    default:
      return <Input style={{ width: 140 }} />
  }
}

function encodeCustomFieldValue(fieldType: string, eventValue: any): string | null {
  if (eventValue && typeof eventValue === 'object' && 'target' in eventValue) {
    eventValue = eventValue.target.value
  }
  if (eventValue === null || eventValue === undefined || eventValue === '') return null
  if (fieldType === 'date') return eventValue.format('YYYY-MM-DD')
  if (fieldType === 'boolean') return eventValue ? 'true' : 'false'
  return String(eventValue)
}

function decodeCustomFieldValue(fieldType: string, value: string | null | undefined) {
  if (fieldType === 'boolean') return { checked: value === 'true' }
  if (value === null || value === undefined || value === '') {
    return fieldType === 'date' ? { value: null } : { value: undefined }
  }
  if (fieldType === 'date') return { value: dayjs(value) }
  if (fieldType === 'number') return { value: Number(value) }
  return { value }
}
