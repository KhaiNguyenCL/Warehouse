import { useNavigate } from 'react-router-dom'
import { Form, Input, InputNumber, Select, Button, DatePicker } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { api } from '../lib/api'
import { useApiMutation } from '../hooks/useApiMutation'
import { PageHeader } from '../components/ui/PageHeader'
import QuotationSectionItem from '../components/QuotationSectionItem'

// ── Layout helpers — giống hệt QuotationDetailPage ───────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-lg)',
      boxShadow: 'var(--shadow-sm)',
      overflow: 'hidden',
    }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>
        {title}
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: 12, color: 'var(--text-2)', fontWeight: 600,
  marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.4px',
}
const valueStyle: React.CSSProperties = {
  fontSize: 14, color: 'var(--text-1)', minHeight: 32, display: 'flex', alignItems: 'center',
}

function Field({ label, children, span }: { label: string; children: React.ReactNode; span?: number }) {
  return (
    <div style={span ? { gridColumn: `span ${span}` } : undefined}>
      <div style={labelStyle}>{label}</div>
      <div style={valueStyle}>{children}</div>
    </div>
  )
}

const moneyProps = {
  controls: false,
  style: { width: '100%' },
  formatter: (v: any) => (v != null && v !== '' ? String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''),
  parser:    (v: any) => (v ? v.replace(/,/g, '') : ''),
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function QuotationCreatePage() {
  const navigate = useNavigate()
  const [form] = Form.useForm()

  const { data: companies } = useQuery({
    queryKey: ['companies', 'customer'],
    queryFn: async () => (await api.get('/companies', { params: { type: 'customer', limit: 100 } })).data,
  })
  const companyId: string | undefined = Form.useWatch('company_id', form)
  const { data: companyDetail } = useQuery({
    queryKey: ['companies', companyId],
    queryFn: async () => (await api.get(`/companies/${companyId}`)).data,
    enabled: !!companyId,
  })
  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => (await api.get('/warehouses')).data,
  })

  const createMutation = useApiMutation(
    (values: any) => api.post('/quotations', values),
    {
      successMessage: 'Tạo báo giá thành công',
      invalidateKey: ['quotations'],
      onSuccess: (res: any) => navigate(`/quotations/${res.data.id}`),
    },
  )

  async function handleSubmit() {
    const values = await form.validateFields()
    const quote_date = values.quote_date ? dayjs(values.quote_date).format('YYYY-MM-DD') : undefined
    createMutation.mutate({ ...values, quote_date })
  }

  return (
    <div style={{ padding: '10px 20px 40px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <PageHeader
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/quotations')} style={{ padding: '0 4px' }} />
            <span style={{ color: 'var(--text-3)', fontSize: 14, cursor: 'pointer' }} onClick={() => navigate('/quotations')}>Báo giá</span>
            <span style={{ color: 'var(--text-3)', fontSize: 14 }}>/</span>
            <span style={{ fontSize: 14 }}>Tạo báo giá mới</span>
          </span>
        }
        actions={
          <>
            <Button onClick={() => navigate('/quotations')}>Huỷ</Button>
            <Button type="primary" loading={createMutation.isPending} onClick={handleSubmit}>
              Tạo báo giá
            </Button>
          </>
        }
      />

      <Form form={form} layout="vertical" initialValues={{ sections: [{ name: 'Nhóm 1', line_items: [{}] }] }}>

        {/* ── Thông tin báo giá ── */}
        <SectionCard title="Thông tin báo giá">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px 24px' }}>

            <Field label="Số báo giá">
              <Form.Item name="quote_number" noStyle>
                <Input style={{ width: '100%' }} placeholder="VD: BG-2026-001" />
              </Form.Item>
            </Field>

            <Field label="Ngày báo giá">
              <Form.Item name="quote_date" noStyle>
                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
              </Form.Item>
            </Field>

            <Field label="Khách hàng">
              <Form.Item name="company_id" noStyle rules={[{ required: true, message: 'Bắt buộc chọn khách hàng' }]}>
                <Select
                  showSearch optionFilterProp="label" style={{ width: '100%' }}
                  placeholder="Chọn khách hàng"
                  options={companies?.data?.map((c: any) => ({ value: c.id, label: c.name }))}
                  onChange={() => form.setFieldValue('contact_id', undefined)}
                />
              </Form.Item>
            </Field>

            <Field label="Người liên hệ">
              <Form.Item name="contact_id" noStyle>
                <Select
                  allowClear style={{ width: '100%' }}
                  disabled={!companyId}
                  placeholder={companyId ? 'Chọn người liên hệ' : 'Chọn khách hàng trước'}
                  options={companyDetail?.contacts?.map((c: any) => ({ value: c.id, label: c.full_name }))}
                />
              </Form.Item>
            </Field>

            <Field label="Tên dự án">
              <Form.Item name="project_name" noStyle>
                <Input style={{ width: '100%' }} placeholder="Tên dự án / công trình" />
              </Form.Item>
            </Field>

            <Field label="Địa điểm giao hàng">
              <Form.Item name="delivery_location" noStyle>
                <Input style={{ width: '100%' }} />
              </Form.Item>
            </Field>

            <Field label="Kho xuất">
              <Form.Item name="warehouse_id" noStyle>
                <Select
                  allowClear style={{ width: '100%' }}
                  placeholder="Bắt buộc khi có dòng giữ chỗ"
                  options={warehouses?.map((w: any) => ({ value: w.id, label: w.name }))}
                />
              </Form.Item>
            </Field>

            <Field label="Hiệu lực (ngày)">
              <Form.Item name="valid_days" noStyle>
                <InputNumber controls={false} min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Field>

            <Field label="Giảm giá">
              <Form.Item name="discount" noStyle>
                <InputNumber {...moneyProps} />
              </Form.Item>
            </Field>

            <Field label="Điều khoản" span={3}>
              <Form.Item name="terms" noStyle>
                <Input.TextArea rows={2} style={{ width: '100%' }} placeholder="Điều khoản thanh toán, giao hàng..." />
              </Form.Item>
            </Field>

            <Field label="Ghi chú" span={3}>
              <Form.Item name="note" noStyle>
                <Input.TextArea rows={2} style={{ width: '100%' }} />
              </Form.Item>
            </Field>

          </div>
        </SectionCard>

        {/* ── Danh sách sản phẩm ── */}
        <SectionCard title="Danh sách sản phẩm">
          <Form.List name="sections">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name }) => (
                  <QuotationSectionItem key={key} form={form} name={name} remove={() => remove(name)} />
                ))}
                <Button style={{ marginTop: 8 }} onClick={() => add({ name: `Nhóm ${fields.length + 1}`, line_items: [{}] })}>
                  + Thêm nhóm
                </Button>
              </>
            )}
          </Form.List>
        </SectionCard>

      </Form>
    </div>
  )
}
