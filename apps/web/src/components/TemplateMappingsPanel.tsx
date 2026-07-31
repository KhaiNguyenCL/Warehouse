import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Form, Input, Select, Switch, Button, Typography, Tag, Tooltip, Table, Space } from 'antd'
import { MinusCircleOutlined, PlusOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { api } from '../lib/api'
import { useApiMutation } from '../hooks/useApiMutation'

interface Props {
  templateId: string
  detectedVariables?: string[]
}

// ── Danh sách field đầy đủ ────────────────────────────────────────────────────

const HEADER_FIELDS: Array<{ variable: string; db_field: string; label: string }> = [
  { variable: 'd.code',              db_field: 'code',              label: 'Mã báo giá (tự sinh)' },
  { variable: 'd.quote_number',      db_field: 'quote_number',      label: 'Số báo giá' },
  { variable: 'd.quote_date',        db_field: 'quote_date',        label: 'Ngày báo giá' },
  { variable: 'd.expired_at',        db_field: 'expired_at',        label: 'Ngày hết hạn' },
  { variable: 'd.valid_days',        db_field: 'valid_days',        label: 'Hiệu lực (ngày)' },
  { variable: 'd.company_name',      db_field: 'company_name',      label: 'Tên khách hàng' },
  { variable: 'd.contact_name',      db_field: 'contact_name',      label: 'Người liên hệ' },
  { variable: 'd.contact_email',     db_field: 'contact_email',     label: 'Email người liên hệ' },
  { variable: 'd.contact_phone',     db_field: 'contact_phone',     label: 'SĐT người liên hệ' },
  { variable: 'd.warehouse_name',    db_field: 'warehouse_name',    label: 'Kho xuất' },
  { variable: 'd.project_name',      db_field: 'project_name',      label: 'Tên dự án' },
  { variable: 'd.delivery_location', db_field: 'delivery_location', label: 'Địa điểm giao hàng' },
  { variable: 'd.terms',             db_field: 'terms',             label: 'Điều khoản' },
  { variable: 'd.note',              db_field: 'note',              label: 'Ghi chú' },
  { variable: 'd.subtotal',          db_field: 'subtotal',          label: 'Tạm tính' },
  { variable: 'd.vat_total',         db_field: 'vat_total',         label: 'Tiền VAT' },
  { variable: 'd.discount',          db_field: 'discount',          label: 'Giảm giá' },
  { variable: 'd.grand_total',       db_field: 'grand_total',       label: 'Tổng cộng' },
  { variable: 'd.bitrix_deal_id',    db_field: 'bitrix_deal_id',    label: 'Bitrix Deal ID' },
  { variable: 'd.created_at',        db_field: 'created_at',        label: 'Ngày tạo báo giá' },
]

const LINE_FIELDS: Array<{ variable: string; label: string }> = [
  { variable: 'd.line_items[i].row_number',    label: 'STT (1, 2, 3...)' },
  { variable: 'd.line_items[i].section_name',  label: 'Tên nhóm' },
  { variable: 'd.line_items[i].description',   label: 'Mô tả sản phẩm' },
  { variable: 'd.line_items[i].sku',           label: 'Mã SKU' },
  { variable: 'd.line_items[i].item_code',     label: 'Item code' },
  { variable: 'd.line_items[i].unit',          label: 'Đơn vị' },
  { variable: 'd.line_items[i].quantity',      label: 'Số lượng' },
  { variable: 'd.line_items[i].unit_price',    label: 'Đơn giá' },
  { variable: 'd.line_items[i].vat_percent',   label: 'VAT%' },
  { variable: 'd.line_items[i].line_total',    label: 'Thành tiền' },
  { variable: 'd.line_items[i].vat_amount',    label: 'Tiền VAT dòng' },
  { variable: 'd.line_items[i].total_amount',  label: 'Tổng tiền dòng' },
  { variable: 'd.line_items[i].warranty',      label: 'Bảo hành' },
  { variable: 'd.line_items[i].note',          label: 'Ghi chú dòng' },
]

// Grouped options cho Select dropdown
const DB_FIELD_OPTIONS = [
  {
    label: 'Thông tin chung',
    options: [
      { value: 'code',              label: 'code — Mã báo giá' },
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
      { value: 'contact_email',     label: 'contact_email — Email người liên hệ' },
      { value: 'contact_phone',     label: 'contact_phone — SĐT người liên hệ' },
    ],
  },
  {
    label: 'Dự án',
    options: [
      { value: 'project_name',      label: 'project_name — Tên dự án' },
      { value: 'delivery_location', label: 'delivery_location — Địa điểm' },
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
    label: 'Khác',
    options: [
      { value: 'bitrix_deal_id',    label: 'bitrix_deal_id — Bitrix Deal ID' },
      { value: 'line_items',        label: 'line_items — Mảng dòng sản phẩm (d.line_items[i].xxx)' },
    ],
  },
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
    const existingVars = new Set(existing.map((m: any) => m.template_variable))
    const extraRows = (detectedVariables ?? [])
      .filter((v) => !existingVars.has(v))
      .map((v) => ({ template_variable: v, source_type: 'database', database_field: '', bitrix_field: '', is_required: false }))
    form.setFieldsValue({ mappings: [...existing, ...extraRows] })
  }, [data, detectedVariables])

  const saveMutation = useApiMutation(
    (mappings: any[]) => api.put(`/templates/${templateId}/mappings`, { mappings }),
    { successMessage: 'Lưu mapping thành công', invalidateKey: ['templates', templateId] },
  )

  function addAllDefaults() {
    const current: any[] = form.getFieldValue('mappings') ?? []
    const existingVars = new Set(current.map((m: any) => m.template_variable))
    const toAdd = [
      ...HEADER_FIELDS
        .filter((f) => !existingVars.has(f.variable))
        .map((f) => ({ template_variable: f.variable, source_type: 'database', database_field: f.db_field, bitrix_field: '', is_required: false })),
      ...(!existingVars.has('d.line_items')
        ? [{ template_variable: 'd.line_items', source_type: 'database', database_field: 'line_items', bitrix_field: '', is_required: false }]
        : []),
    ]
    form.setFieldsValue({ mappings: [...current, ...toAdd] })
  }

  if (isLoading) return null

  return (
    <div style={{ marginTop: 24, borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <Typography.Title level={5} style={{ margin: 0 }}>Mapping biến template</Typography.Title>
        <Tooltip title="Thêm tất cả field mặc định của báo giá (bỏ qua các biến đã có)">
          <Button size="small" icon={<ThunderboltOutlined />} onClick={addAllDefaults}>
            Thêm tất cả field mặc định
          </Button>
        </Tooltip>
      </div>

      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        Trong file Excel dùng cú pháp <code>{'{d.ten_bien}'}</code> cho field đơn, <code>{'{d.line_items[i].field}'}</code> cho từng dòng sản phẩm.
      </Typography.Text>

      {/* Bảng tham khảo */}
      <div style={{ display: 'flex', gap: 16, marginTop: 12, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 6, textTransform: 'uppercase' }}>Field header báo giá</div>
          <Table
            size="small"
            dataSource={HEADER_FIELDS}
            rowKey="variable"
            pagination={false}
            showHeader={false}
            style={{ fontSize: 12 }}
            columns={[
              {
                dataIndex: 'variable',
                width: 220,
                render: (v: string) => <code style={{ fontSize: 11, color: '#1677ff' }}>{`{${v}}`}</code>,
              },
              { dataIndex: 'label', render: (v: string) => <span style={{ color: '#666' }}>{v}</span> },
            ]}
          />
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 6, textTransform: 'uppercase' }}>Field dòng sản phẩm</div>
          <Table
            size="small"
            dataSource={LINE_FIELDS}
            rowKey="variable"
            pagination={false}
            showHeader={false}
            style={{ fontSize: 12 }}
            columns={[
              {
                dataIndex: 'variable',
                width: 270,
                render: (v: string) => <code style={{ fontSize: 11, color: '#52c41a' }}>{`{${v}}`}</code>,
              },
              { dataIndex: 'label', render: (v: string) => <span style={{ color: '#666' }}>{v}</span> },
            ]}
          />
        </div>
      </div>

      {/* Form mapping */}
      <Form form={form} onFinish={(v) => saveMutation.mutate(v.mappings ?? [])} style={{ marginTop: 4 }}>
        <Form.List name="mappings">
          {(fields, { add, remove }) => (
            <>
              {fields.length === 0 && (
                <div style={{ color: '#bbb', fontSize: 13, marginBottom: 12 }}>
                  Chưa có mapping — nhấn "Thêm tất cả field mặc định" hoặc "Thêm biến" để bắt đầu.
                </div>
              )}
              {fields.map(({ key, name, ...restField }) => (
                <Space key={key} align="baseline" style={{ display: 'flex', marginBottom: 6, flexWrap: 'wrap' }}>
                  <Form.Item {...restField} name={[name, 'template_variable']} rules={[{ required: true, message: 'Bắt buộc' }]}>
                    <Input placeholder="d.ten_bien" style={{ width: 210, fontFamily: 'monospace', fontSize: 12 }} />
                  </Form.Item>
                  <Form.Item {...restField} name={[name, 'source_type']} initialValue="database">
                    <Select style={{ width: 110 }} options={[{ value: 'database', label: 'Database' }, { value: 'bitrix', label: 'Bitrix' }]} />
                  </Form.Item>
                  <Form.Item shouldUpdate noStyle>
                    {() => {
                      const sourceType = form.getFieldValue(['mappings', name, 'source_type'])
                      return sourceType === 'bitrix' ? (
                        <Form.Item {...restField} name={[name, 'bitrix_field']} rules={[{ required: true, message: 'Bắt buộc' }]}>
                          <Input placeholder="Bitrix field" style={{ width: 210 }} />
                        </Form.Item>
                      ) : (
                        <Form.Item {...restField} name={[name, 'database_field']} rules={[{ required: true, message: 'Bắt buộc' }]}>
                          <Select showSearch placeholder="Chọn field" style={{ width: 260 }} optionFilterProp="label" options={DB_FIELD_OPTIONS} />
                        </Form.Item>
                      )
                    }}
                  </Form.Item>
                  <Form.Item {...restField} name={[name, 'is_required']} valuePropName="checked">
                    <Switch checkedChildren="Bắt buộc" unCheckedChildren="Tuỳ chọn" size="small" />
                  </Form.Item>
                  <MinusCircleOutlined onClick={() => remove(name)} style={{ color: '#ff4d4f' }} />
                </Space>
              ))}
              <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ source_type: 'database', is_required: false })} style={{ marginBottom: 12 }}>
                Thêm biến
              </Button>
            </>
          )}
        </Form.List>
        <Button type="primary" onClick={() => form.submit()} loading={saveMutation.isPending}>
          Lưu mapping
        </Button>
      </Form>
    </div>
  )
}
