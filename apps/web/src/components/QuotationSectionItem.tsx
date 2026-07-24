import { Form, Input, Button } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'
import type { FormInstance } from 'antd'
import QuotationLineItem, { QuotationLineHeader } from './QuotationLineItem'

interface Props {
  form: FormInstance
  name: number
  remove: () => void
}

export default function QuotationSectionItem({ form, name, remove }: Props) {
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
            </>
          )}
        </Form.List>
      </div>
    </div>
  )
}
