// 1 section trong Form.List "sections" — chứa Form.List lồng "line_items" (mỗi dòng dùng
// QuotationLineItem). Card-style để phân biệt rõ ranh giới giữa các section trên UI.
import { Form, Input, Button, Card } from 'antd'
import type { FormInstance } from 'antd'
import QuotationLineItem from './QuotationLineItem'

interface Props {
  form: FormInstance
  name: number
  remove: () => void
}

export default function QuotationSectionItem({ form, name, remove }: Props) {
  return (
    <Card size="small" style={{ marginBottom: 12 }} title={`Section ${name + 1}`} extra={<Button danger size="small" onClick={remove}>Xoá section</Button>}>
      <Form.Item name={[name, 'name']} label="Tên section" rules={[{ required: true }]}>
        <Input placeholder="VD: Thiết bị mạng" />
      </Form.Item>

      <Form.List name={[name, 'line_items']}>
        {(fields, { add, remove: removeLine }) => (
          <>
            {fields.map(({ key, name: lineName }) => (
              <QuotationLineItem key={key} form={form} sectionName={name} name={lineName} remove={() => removeLine(lineName)} />
            ))}
            <Button onClick={() => add()}>+ Thêm dòng</Button>
          </>
        )}
      </Form.List>
    </Card>
  )
}
