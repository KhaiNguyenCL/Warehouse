import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Form, Input, Select, Switch, Button, Typography, Space, Tag, Tooltip } from 'antd'
import { MinusCircleOutlined, PlusOutlined, InfoCircleOutlined } from '@ant-design/icons'
import { api } from '../lib/api'
import { useApiMutation } from '../hooks/useApiMutation'

interface Props {
  templateId: string
  detectedVariables?: string[]
}

// Danh sách field có sẵn trong context báo giá — dùng để gợi ý khi map
const QUOTATION_DB_FIELDS = [
  {
    label: 'Thông tin chung',
    options: [
      { value: 'code',              label: 'code — Mã báo giá (tự sinh)' },
      { value: 'quote_number',      label: 'quote_number — Số báo giá' },
      { value: 'quote_date',        label: 'quote_date — Ngày báo giá' },
      { value: 'expired_at',        label: 'expired_at — Ngày hết hạn' },
      { value: 'valid_days',        label: 'valid_days — Hiệu lực (ngày)' },
      { value: 'created_at',        label: 'created_at — Ngày tạo' },
    ],
  },
  {
    label: 'Khách hàng',
    options: [
      { value: 'company_name',      label: 'company_name — Tên khách hàng' },
      { value: 'contact_name',      label: 'contact_name — Người liên hệ' },
    ],
  },
  {
    label: 'Dự án / Giao hàng',
    options: [
      { value: 'project_name',      label: 'project_name — Tên dự án' },
      { value: 'delivery_location', label: 'delivery_location — Địa điểm giao hàng' },
      { value: 'warehouse_name',    label: 'warehouse_name — Kho xuất' },
    ],
  },
  {
    label: 'Điều khoản & Ghi chú',
    options: [
      { value: 'terms',             label: 'terms — Điều khoản' },
      { value: 'note',              label: 'note — Ghi chú' },
    ],
  },
  {
    label: 'Tổng tiền',
    options: [
      { value: 'subtotal',          label: 'subtotal — Tạm tính' },
      { value: 'vat_total',         label: 'vat_total — Tiền VAT' },
      { value: 'discount',          label: 'discount — Giảm giá' },
      { value: 'grand_total',       label: 'grand_total — Tổng cộng' },
    ],
  },
  {
    label: 'Bitrix',
    options: [
      { value: 'bitrix_deal_id',    label: 'bitrix_deal_id — Bitrix Deal ID' },
    ],
  },
  {
    label: 'Dòng sản phẩm (dùng {d.line_items[i].field})',
    options: [
      { value: 'line_items',        label: 'line_items — Toàn bộ mảng dòng SP' },
    ],
  },
]

// Sub-field của line_items — chỉ để hiển thị tham khảo
const LINE_ITEM_SUBFIELDS = [
  { variable: 'line_items[i].section_name',  label: 'Tên nhóm' },
  { variable: 'line_items[i].description',   label: 'Mô tả sản phẩm' },
  { variable: 'line_items[i].sku',           label: 'Mã SKU' },
  { variable: 'line_items[i].item_code',     label: 'Item code' },
  { variable: 'line_items[i].unit',          label: 'Đơn vị' },
  { variable: 'line_items[i].quantity',      label: 'Số lượng' },
  { variable: 'line_items[i].unit_price',    label: 'Đơn giá' },
  { variable: 'line_items[i].vat_percent',   label: 'VAT%' },
  { variable: 'line_items[i].line_total',    label: 'Thành tiền' },
  { variable: 'line_items[i].vat_amount',    label: 'Tiền VAT' },
  { variable: 'line_items[i].total_amount',  label: 'Tổng tiền dòng' },
  { variable: 'line_items[i].warranty',      label: 'Bảo hành' },
  { variable: 'line_items[i].note',          label: 'Ghi chú dòng' },
]

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
        Mỗi biến trong file Excel (VD <code>{'{d.company_name}'}</code>) cần map với 1 field database bên dưới.
      </Typography.Text>

      {/* Bảng tham khảo sub-field dòng sản phẩm */}
      <div style={{
        marginTop: 12, marginBottom: 16,
        background: 'var(--bg-hover, #fafafa)', border: '1px solid #e8e8e8',
        borderRadius: 6, padding: '10px 14px',
      }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <InfoCircleOutlined /> Sub-field dòng sản phẩm — dùng cú pháp <code style={{ marginLeft: 4 }}>{'{d.line_items[i].field}'}</code>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {LINE_ITEM_SUBFIELDS.map((f) => (
            <Tooltip key={f.variable} title={f.label}>
              <Tag style={{ fontFamily: 'monospace', cursor: 'default', fontSize: 11 }}>{f.variable}</Tag>
            </Tooltip>
          ))}
        </div>
      </div>

      <Form form={form} onFinish={(v) => saveMutation.mutate(v.mappings ?? [])} style={{ marginTop: 12 }}>
        <Form.List name="mappings">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <Space key={key} align="baseline" style={{ display: 'flex', marginBottom: 8, flexWrap: 'wrap' }}>
                  <Form.Item {...restField} name={[name, 'template_variable']} rules={[{ required: true, message: 'Bắt buộc' }]}>
                    <Input placeholder="d.ten_bien" style={{ width: 200, fontFamily: 'monospace' }} />
                  </Form.Item>
                  <Form.Item {...restField} name={[name, 'source_type']} initialValue="database">
                    <Select
                      style={{ width: 110 }}
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
                          <Input placeholder="Bitrix field" style={{ width: 200 }} />
                        </Form.Item>
                      ) : (
                        <Form.Item {...restField} name={[name, 'database_field']} rules={[{ required: true, message: 'Bắt buộc' }]}>
                          <Select
                            showSearch
                            placeholder="Chọn field database"
                            style={{ width: 280 }}
                            optionFilterProp="label"
                            options={QUOTATION_DB_FIELDS}
                          />
                        </Form.Item>
                      )
                    }}
                  </Form.Item>
                  <Form.Item {...restField} name={[name, 'is_required']} valuePropName="checked">
                    <Switch checkedChildren="Bắt buộc" unCheckedChildren="Tuỳ chọn" />
                  </Form.Item>
                  <MinusCircleOutlined onClick={() => remove(name)} style={{ color: '#ff4d4f' }} />
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
