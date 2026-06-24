// Editor mapping biến template ↔ field (CLAUDE.md mục 14: "Admin map biến với database
// field hoặc Bitrix field"). PUT /:id/mappings luôn REPLACE TOÀN BỘ — không có create/update/
// delete riêng từng dòng — nên dùng 1 Form.List + 1 nút "Lưu mapping" duy nhất, giống cách
// RolePermissionsPanel lưu permission_keys.
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Form, Input, Select, Switch, Button, Typography, Space } from 'antd'
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import { api } from '../lib/api'
import { useApiMutation } from '../hooks/useApiMutation'

interface Props {
  templateId: string
  // Biến vừa detect lúc upload (chỉ có ngay sau khi upload xong — backend không lưu lại
  // detected_variables, nên lúc mở mapping của 1 template đã tồn tại từ trước sẽ không có).
  detectedVariables?: string[]
}

export default function TemplateMappingsPanel({ templateId, detectedVariables }: Props) {
  const [form] = Form.useForm()

  const { data, isLoading } = useQuery({
    queryKey: ['templates', templateId],
    queryFn: async () => (await api.get(`/templates/${templateId}`)).data,
  })

  useEffect(() => {
    if (!data) return
    const existing: any[] = data.mappings ?? []
    const existingVars = new Set(existing.map((m) => m.template_variable))
    const extraRows = (detectedVariables ?? [])
      .filter((v) => !existingVars.has(v))
      .map((v) => ({ template_variable: v, source_type: 'database', database_field: '', bitrix_field: '', is_required: false }))
    form.setFieldsValue({ mappings: [...existing, ...extraRows] })
  }, [data, detectedVariables])

  const saveMutation = useApiMutation(
    (mappings: any[]) => api.put(`/templates/${templateId}/mappings`, { mappings }),
    { successMessage: 'Lưu mapping thành công', invalidateKey: ['templates', templateId] },
  )

  if (isLoading) return null

  return (
    <div style={{ marginTop: 24, borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
      <Typography.Title level={5}>Mapping biến template</Typography.Title>
      <Typography.Text type="secondary">
        Mỗi biến trong file Excel (VD <code>{'{d.customer_name}'}</code>) cần map với 1 field database hoặc Bitrix.
      </Typography.Text>

      <Form form={form} onFinish={(v) => saveMutation.mutate(v.mappings ?? [])} style={{ marginTop: 12 }}>
        <Form.List name="mappings">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <Space key={key} align="baseline" style={{ display: 'flex', marginBottom: 8, flexWrap: 'wrap' }}>
                  <Form.Item {...restField} name={[name, 'template_variable']} rules={[{ required: true, message: 'Bắt buộc' }]}>
                    <Input placeholder="Tên biến (d.xxx)" style={{ width: 180 }} />
                  </Form.Item>
                  <Form.Item {...restField} name={[name, 'source_type']} initialValue="database">
                    <Select
                      style={{ width: 120 }}
                      options={[
                        { value: 'database', label: 'Database' },
                        { value: 'bitrix', label: 'Bitrix' },
                      ]}
                    />
                  </Form.Item>
                  <Form.Item shouldUpdate noStyle>
                    {() => {
                      const sourceType = form.getFieldValue(['mappings', name, 'source_type'])
                      return sourceType === 'bitrix' ? (
                        <Form.Item {...restField} name={[name, 'bitrix_field']} rules={[{ required: true, message: 'Bắt buộc' }]}>
                          <Input placeholder="Bitrix field" style={{ width: 180 }} />
                        </Form.Item>
                      ) : (
                        <Form.Item {...restField} name={[name, 'database_field']} rules={[{ required: true, message: 'Bắt buộc' }]}>
                          <Input placeholder="Database field (VD grand_total)" style={{ width: 220 }} />
                        </Form.Item>
                      )
                    }}
                  </Form.Item>
                  <Form.Item {...restField} name={[name, 'is_required']} valuePropName="checked">
                    <Switch checkedChildren="Bắt buộc" unCheckedChildren="Tuỳ chọn" />
                  </Form.Item>
                  <MinusCircleOutlined onClick={() => remove(name)} />
                </Space>
              ))}
              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={() => add({ source_type: 'database', is_required: false })}
                style={{ marginBottom: 12 }}
              >
                Thêm biến
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
  )
}
