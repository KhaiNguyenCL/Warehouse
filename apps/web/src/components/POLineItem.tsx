// 1 <tr> trong bảng .kv-table.kv-lines của PurchaseOrderCreatePage.tsx — theo đúng
// export/purchase-new.html: "Sản phẩm" hiển thị TĨNH (tên đậm + SKU · đơn vị subtext), không
// còn là ô VariantSelect sửa được tại chỗ nữa — muốn đổi SKU 1 dòng thì xoá dòng rồi thêm lại
// qua ô "Quét mã / tìm hàng" cuối bảng (xem PurchaseOrderCreatePage.tsx::handleScanAdd, cùng
// pattern ReceiptFormPage.tsx::CreateLinesTable). Component này thuần hiển thị + input số/ghi
// chú, không tự chọn variant nữa.
//
// KHÔNG còn ô BH hãng/BH công ty (theo yêu cầu port mockup) — 2 giá trị này vẫn được set ngầm
// vào field ẩn lúc thêm dòng (PurchaseOrderCreatePage.tsx::handleScanAdd, lấy từ
// variant.manufacturer_warranty_months) và gửi lên server như cũ, chỉ không cho sửa tay từng
// dòng nữa.
//
// Ghi chú + custom field động (applies_to_po_line) gộp chung 1 Popover mở bằng icon (kv-note-btn),
// đổi màu khi đã có nội dung (kv-note-btn--has) — khớp mockup, đồng thời giữ được tính năng
// custom field vốn không có chỗ trong bảng mockup.
import { useQuery } from '@tanstack/react-query'
import { Form, Input, DatePicker, Switch, Select, Popover } from 'antd'
import type { FormInstance } from 'antd'
import dayjs from 'dayjs'
import { NotebookPen, X } from 'lucide-react'
import { api } from '../lib/api'
import { PlainNumberInput } from './PlainNumberInput'

function fmtTotal(n: number) {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

const VAT_OPTIONS = [0, 5, 8, 10]

interface Props {
  form: FormInstance
  name: number
  remove: () => void
}

export default function POLineItem({ form, name, remove }: Props) {
  const { data: variantCustomFields } = useQuery({
    queryKey: ['custom-fields', 'variant'],
    queryFn: async () => (await api.get('/custom-fields', { params: { object_type: 'variant' } })).data,
  })
  const poLineFields = (variantCustomFields ?? []).filter((f: any) => f.is_active && f.applies_to_po_line)

  const variantName = Form.useWatch(['lines', name, 'variant_name'], form)
  const variantCode = Form.useWatch(['lines', name, 'variant_code'], form)
  const variantUnit = Form.useWatch(['lines', name, 'variant_unit'], form)
  const qty         = Form.useWatch(['lines', name, 'quantity'],    form) ?? 0
  const price       = Form.useWatch(['lines', name, 'unit_price'],  form) ?? 0
  const vat         = Form.useWatch(['lines', name, 'vat_percent'], form) ?? 0
  const note        = Form.useWatch(['lines', name, 'note'],        form)
  const total       = qty && price ? qty * price * (1 + vat / 100) : null

  const hasNote = !!note?.trim?.()

  return (
    <tr className="kv-line-hover">
      <td className="kv-line-no">{name + 1}</td>

      <td>
        <div className="kv-cell-title">{variantName ?? '—'}</div>
        <div className="kv-cell-sub mono">{[variantCode, variantUnit].filter(Boolean).join(' · ')}</div>
        <Form.Item name={[name, 'variant_id']} hidden><Input /></Form.Item>
        <Form.Item name={[name, 'variant_name']} hidden><Input /></Form.Item>
        <Form.Item name={[name, 'variant_code']} hidden><Input /></Form.Item>
        <Form.Item name={[name, 'variant_unit']} hidden><Input /></Form.Item>
        <Form.Item name={[name, 'manufacturer_warranty_months']} hidden><Input /></Form.Item>
        <Form.Item name={[name, 'customer_warranty_months']} hidden><Input /></Form.Item>
      </td>

      <td>
        <Form.Item name={[name, 'quantity']} noStyle rules={[{ required: true }]}>
          <PlainNumberInput align="right" />
        </Form.Item>
      </td>

      <td>
        <Form.Item name={[name, 'unit_price']} noStyle rules={[{ required: true }]}>
          <PlainNumberInput align="right" format />
        </Form.Item>
      </td>

      <td>
        <Form.Item name={[name, 'vat_percent']} noStyle initialValue={10}>
          {/* Nếu dòng cũ có % ngoài 4 mức chuẩn (VD dữ liệu cũ trước khi đổi sang dropdown) —
              chèn thêm option cho đúng giá trị đó, tránh <select> âm thầm rơi về option đầu
              tiên (0%) rồi lỡ tay lưu đè giá trị thật khi user bấm Lưu mà không để ý field này. */}
          <select className="kv-select">
            {!VAT_OPTIONS.includes(vat) && vat != null && <option value={vat}>{vat}%</option>}
            {VAT_OPTIONS.map((v) => <option key={v} value={v}>{v}%</option>)}
          </select>
        </Form.Item>
      </td>

      <td className="num kv-strong">
        {total != null ? fmtTotal(total) : <span className="kv-muted">—</span>}
      </td>

      <td className="num">
        <Popover
          trigger="click"
          placement="topRight"
          content={
            <div style={{ width: 260, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Form.Item name={[name, 'note']} noStyle>
                <Input.TextArea rows={3} placeholder="Ghi chú dòng..." />
              </Form.Item>
              {poLineFields.map((f: any, i: number) => (
                <div key={f.id}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', marginBottom: 2 }}>{f.field_label}</div>
                  <Form.Item name={[name, 'custom_field_values', i, 'field_id']} hidden initialValue={f.id}>
                    <Input />
                  </Form.Item>
                  <Form.Item
                    name={[name, 'custom_field_values', i, 'value']}
                    noStyle
                    getValueFromEvent={(eventValue: any) => encodeCustomFieldValue(f.field_type, eventValue)}
                    getValueProps={(value: any) => decodeCustomFieldValue(f.field_type, value)}
                  >
                    {renderCustomFieldInput(f)}
                  </Form.Item>
                </div>
              ))}
            </div>
          }
        >
          <button
            type="button"
            className={`kv-icon-btn kv-note-btn ${hasNote ? 'kv-note-btn--has' : ''}`}
            aria-label={`Ghi chú dòng ${name + 1}`}
            title={note || 'Thêm ghi chú'}
          >
            <NotebookPen className="h-4 w-4" />
          </button>
        </Popover>
      </td>

      <td className="num">
        <button type="button" className="kv-icon-btn kv-row-del" aria-label={`Xoá dòng ${name + 1}`} onClick={remove}>
          <X className="h-4 w-4" />
        </button>
      </td>
    </tr>
  )
}

function renderCustomFieldInput(field: any) {
  switch (field.field_type) {
    case 'number':
      return <PlainNumberInput decimal />
    case 'date':
      return <DatePicker style={{ width: '100%' }} />
    case 'boolean':
      return <Switch />
    case 'select':
      return <Select style={{ width: '100%' }} allowClear options={(field.options ?? []).map((o: string) => ({ value: o, label: o }))} />
    default:
      return <input className="kv-input" style={{ width: '100%', height: 32 }} />
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
