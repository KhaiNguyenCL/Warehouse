import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Form, Input, InputNumber, Select, Button, DatePicker } from 'antd'
import { ArrowLeftOutlined, SyncOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { api } from '../lib/api'
import { useApiMutation } from '../hooks/useApiMutation'
import { useTermTemplates } from '../hooks/useTermTemplates'
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
  const [dealInput, setDealInput] = useState('')
  const [bitrixLoading, setBitrixLoading] = useState(false)
  const [bitrixError, setBitrixError] = useState<string | null>(null)
  const [bitrixInfo, setBitrixInfo] = useState<string | null>(null)

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
  const { data: termTemplates } = useTermTemplates()

  async function fetchFromBitrix() {
    if (!dealInput.trim()) return
    const dealId = dealInput.trim()
    setBitrixLoading(true)
    setBitrixError(null)
    setBitrixInfo(null)
    try {
      // Gọi song song: resolve (company/contact UUID) + preview-sync (tất cả mapping)
      const [resolveRes, previewRes] = await Promise.all([
        api.get(`/bitrix/deals/${dealId}/resolve`),
        api.get(`/bitrix/deals/${dealId}/preview-sync`).catch(() => null),
      ])
      const d = resolveRes.data
      const patch: Record<string, any> = { bitrix_deal_id: dealId }

      // Base fields từ resolve (luôn có, không phụ thuộc mapping)
      if (d.company?.id)       patch.company_id = d.company.id
      if (d.contact?.id)       patch.contact_id = d.contact.id
      if (d.deal_title)        patch.project_name = d.deal_title
      if (d.delivery_location) patch.delivery_location = d.delivery_location

      // Overlay từ preview-sync (áp mapping đã cấu hình, ghi đè base fields nếu có)
      if (previewRes?.data?.rows) {
        for (const row of previewRes.data.rows) {
          if (!row.skipped && row.form_value != null && row.form_value !== '') {
            patch[row.quotation_field] = row.form_value
          }
        }
      }

      form.setFieldsValue(patch)

      const filled = Object.entries(patch)
        .filter(([k, v]) => k !== 'bitrix_deal_id' && v != null && v !== '')
        .map(([k, v]) => `${k}: ${v}`)
      setBitrixInfo(filled.length ? `Đã điền ${filled.length} field` : 'Fetch thành công — không có field nào match')
    } catch (err: any) {
      setBitrixError(err?.response?.data?.message ?? 'Không fetch được Deal')
    } finally {
      setBitrixLoading(false)
    }
  }

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

            {/* Row 1: Bitrix Deal ID + Fetch — Số báo giá — Ngày báo giá */}
            <div>
              <div style={labelStyle}>Bitrix Deal ID</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <Input
                  placeholder="Deal ID (tuỳ chọn)"
                  value={dealInput}
                  onChange={(e) => setDealInput(e.target.value)}
                  onPressEnter={fetchFromBitrix}
                  style={{ flex: 1, minWidth: 0 }}
                />
                <Button
                  icon={<SyncOutlined />}
                  loading={bitrixLoading}
                  onClick={fetchFromBitrix}
                  disabled={!dealInput.trim()}
                  title="Fetch & điền form từ Bitrix"
                />
              </div>
              {bitrixError && <div style={{ color: '#f5222d', fontSize: 12, marginTop: 4 }}>{bitrixError}</div>}
              {bitrixInfo  && <div style={{ color: '#52c41a', fontSize: 12, marginTop: 4 }}>{bitrixInfo}</div>}
            </div>

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

            {/* Row 2: Khách hàng — Người liên hệ */}
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

            <div /> {/* spacer */}

            {/* Row 3: Tên dự án (full width) */}
            <Field label="Tên dự án" span={3}>
              <Form.Item name="project_name" noStyle>
                <Input style={{ width: '100%' }} placeholder="Tên dự án / công trình" />
              </Form.Item>
            </Field>

            {/* Row 4: Địa điểm giao hàng — Hiệu lực — Kho xuất */}
            <Field label="Địa điểm giao hàng">
              <Form.Item name="delivery_location" noStyle>
                <Input style={{ width: '100%' }} />
              </Form.Item>
            </Field>

            <Field label="Hiệu lực (ngày)">
              <Form.Item name="valid_days" noStyle>
                <InputNumber controls={false} min={1} style={{ width: '100%' }} />
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

            {/* Row 5: Mẫu điều khoản (full width) */}
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={labelStyle}>Điều khoản</div>
              <div style={valueStyle}>
                <Select
                  allowClear
                  placeholder="Chọn mẫu điều khoản (tuỳ chọn)"
                  style={{ width: '100%' }}
                  options={termTemplates?.map((t) => ({ value: t.id, label: t.name }))}
                  onChange={(id) => {
                    const tpl = termTemplates?.find((t) => t.id === id)
                    if (tpl) form.setFieldValue('terms', tpl.content)
                  }}
                />
              </div>
            </div>

            {/* Row 6: Nội dung điều khoản (full width) */}
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={labelStyle}>Nội dung điều khoản</div>
              <Form.Item name="terms" noStyle>
                <Input.TextArea rows={4} style={{ width: '100%' }} placeholder="Nội dung điều khoản (có thể chỉnh sửa sau khi chọn mẫu)..." />
              </Form.Item>
            </div>

            {/* Row 7: Ghi chú (full width) */}
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={labelStyle}>Ghi chú</div>
              <Form.Item name="note" noStyle>
                <Input.TextArea rows={2} style={{ width: '100%' }} />
              </Form.Item>
            </div>

          </div>
        </SectionCard>

        {/* ── Danh sách sản phẩm ── */}
        <SectionCard title="Danh sách sản phẩm">
          <Form.List name="sections">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name }, idx) => (
                  <QuotationSectionItem key={key} form={form} name={name} sectionIndex={idx} remove={() => remove(name)} />
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
