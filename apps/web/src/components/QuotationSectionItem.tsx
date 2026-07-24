import { Form, Input, Button } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'
import type { FormInstance } from 'antd'
import QuotationLineItem, { QuotationLineHeader } from './QuotationLineItem'

interface Props {
  form: FormInstance
  name: number
  remove: () => void
}

function fmt(n: number) {
  return n.toLocaleString('en-US')
}

export default function QuotationSectionItem({ form, name, remove }: Props) {
  const lineItems: any[] = Form.useWatch(['sections', name, 'line_items'], form) ?? []

  const sectionTotal = lineItems.reduce((sum, item) => {
    const qty   = Number(item?.quantity   ?? 0)
    const price = Number(item?.unit_price ?? 0)
    const vat   = Number(item?.vat_percent ?? 0)
    const lineTotal = qty * price
    return sum + lineTotal + lineTotal * (vat / 100)
  }, 0)
  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 8,
      marginBottom: 12,
      overflow: 'hidden',
    }}>
      {/* Header — tên nhóm inline */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        background: 'var(--bg-hover)',
        borderBottom: '1px solid var(--border)',
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', whiteSpace: 'nowrap', flexShrink: 0 }}>
          Nhóm {name + 1}
        </span>
        <Form.Item name={[name, 'name']} noStyle rules={[{ required: true, message: 'Nhập tên nhóm' }]}>
          <Input placeholder="Tên nhóm (VD: Thiết bị mạng)" style={{ maxWidth: 280 }} />
        </Form.Item>
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={remove}
          style={{ marginLeft: 'auto', flexShrink: 0 }}
        />
      </div>

      {/* Body */}
      <div style={{ padding: '10px 12px 8px' }}>
        <Form.List name={[name, 'line_items']}>
          {(fields, { add, remove: removeLine }) => (
            <>
              <QuotationLineHeader />
              {fields.map(({ key, name: lineName }) => (
                <QuotationLineItem key={key} form={form} sectionName={name} name={lineName} remove={() => removeLine(lineName)} />
              ))}
              <Button size="small" style={{ marginTop: 4 }} onClick={() => add()}>
                + Thêm dòng
              </Button>

              {/* Section total */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 8,
                marginTop: 10,
                paddingTop: 8,
                borderTop: '1px solid var(--border)',
                fontSize: 13,
                paddingRight: 38,
              }}>
                <span style={{ color: 'var(--text-2)' }}>Tổng tiền nhóm:</span>
                <strong style={{ color: 'var(--text-1)', minWidth: 120, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {fmt(Math.round(sectionTotal * 100) / 100)}
                </strong>
              </div>
            </>
          )}
        </Form.List>
      </div>
    </div>
  )
}
