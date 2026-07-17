import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Form, Select, Input, Button, Typography, Space } from 'antd'
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import { api } from '../lib/api'
import { useApiMutation } from '../hooks/useApiMutation'
import { PageHeader } from '../components/ui/PageHeader'

const QUOTATION_FIELD_OPTIONS = [
  { value: 'project_name', label: 'Tên dự án (project_name)' },
  { value: 'delivery_location', label: 'Địa điểm giao hàng (delivery_location)' },
  { value: 'terms', label: 'Điều khoản (terms)' },
]

const BITRIX_OBJECT_OPTIONS = [
  { value: 'deal', label: 'Deal' },
  { value: 'company', label: 'Company' },
  { value: 'contact', label: 'Contact' },
]

export default function SettingsBitrixPage() {
  const [form] = Form.useForm()

  const { data, isLoading } = useQuery({
    queryKey: ['bitrix', 'mappings'],
    queryFn: async () => (await api.get('/bitrix/mappings')).data,
  })

  useEffect(() => {
    if (data) form.setFieldsValue({ mappings: data })
  }, [data])

  const saveMutation = useApiMutation((mappings: any[]) => api.put('/bitrix/mappings', { mappings }), {
    successMessage: 'Lưu mapping thành công',
    invalidateKey: ['bitrix', 'mappings'],
  })

  if (isLoading) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader title="Đồng bộ Bitrix" />

      <div>
        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          Map field nào của Báo giá sẽ được điền tự động khi đồng bộ từ 1 Bitrix Deal. Bitrix chỉ ĐỌC — không ghi
          ngược lại Bitrix.
        </Typography.Text>

        <Form form={form} onFinish={(v) => saveMutation.mutate(v.mappings ?? [])}>
          <Form.List name="mappings">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} align="baseline" style={{ display: 'flex', marginBottom: 8, flexWrap: 'wrap' }}>
                    <Form.Item {...restField} name={[name, 'quotation_field']} rules={[{ required: true, message: 'Bắt buộc' }]}>
                      <Select placeholder="Field báo giá" style={{ width: 280 }} options={QUOTATION_FIELD_OPTIONS} />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'bitrix_object']} rules={[{ required: true, message: 'Bắt buộc' }]} initialValue="deal">
                      <Select style={{ width: 120 }} options={BITRIX_OBJECT_OPTIONS} />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'bitrix_field']} rules={[{ required: true, message: 'Bắt buộc' }]}>
                      <Input placeholder="Bitrix field (VD TITLE, OPPORTUNITY)" style={{ width: 240 }} />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(name)} />
                  </Space>
                ))}
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={() => add({ bitrix_object: 'deal' })}
                  style={{ marginBottom: 12 }}
                >
                  Thêm mapping
                </Button>
              </>
            )}
          </Form.List>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={saveMutation.isPending}>
              Lưu mapping
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  )
}
