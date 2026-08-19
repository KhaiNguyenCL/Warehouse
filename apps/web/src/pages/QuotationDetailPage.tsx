import { useParams } from 'react-router-dom'
import {
  Form, Input, InputNumber, Select, Button, Tag, Popconfirm, Table, Skeleton,
  DatePicker,
} from 'antd'
import { ArrowLeftOutlined, EditOutlined, SyncOutlined, FileExcelOutlined, FilePdfOutlined, EyeOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { useQuotationDetail } from '../hooks/useQuotationDetail'
import { useTermTemplates } from '../hooks/useTermTemplates'

function toRoman(n: number): string {
  const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1]
  const syms = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I']
  let s = ''
  for (let i = 0; i < vals.length; i++) {
    while (n >= vals[i]) { s += syms[i]; n -= vals[i] }
  }
  return s
}
import { PageHeader } from '../components/ui/PageHeader'
import { StatusBadge } from '../components/ui/StatusBadge'
import CustomFieldsPanel from '../components/CustomFieldsPanel'
import QuotationSectionItem from '../components/QuotationSectionItem'

const LINE_COLS = [
  { title: 'Sản phẩm',   width: 240, render: (_: any, l: any) => l.bundle_name ?? l.variant_name ?? l.description ?? '—' },
  { title: 'Mã hàng',    width: 130, render: (_: any, l: any) => l.bundle_item_code ?? l.variant_item_code ?? '—' },
  { title: 'SL',         dataIndex: 'quantity',     width: 60,  align: 'right' as const },
  { title: 'Đơn giá',   dataIndex: 'unit_price',   width: 120, align: 'right' as const, render: fmt },
  { title: 'VAT%',       dataIndex: 'vat_percent',  width: 70,  align: 'right' as const },
  { title: 'Thành tiền', dataIndex: 'line_total',   width: 120, align: 'right' as const, render: fmt },
  { title: 'Tiền VAT',   dataIndex: 'vat_amount',   width: 100, align: 'right' as const, render: fmt },
  { title: 'Bảo hành',  dataIndex: 'warranty',     width: 100 },
  { title: 'Giữ chỗ',   dataIndex: 'is_reserved',  width: 80,  render: (v: boolean) => <Tag color={v ? 'blue' : 'default'}>{v ? 'Có' : 'Không'}</Tag> },
  { title: 'Đã xuất',   dataIndex: 'exported_qty', width: 80,  align: 'right' as const },
  { title: 'Chờ xuất',  dataIndex: 'pending_qty',  width: 80,  align: 'right' as const },
  { title: 'Còn lại',   dataIndex: 'remaining_qty',width: 80,  align: 'right' as const },
  { title: 'Ghi chú',   dataIndex: 'note',         width: 140 },
]

function LineTable({ rows, nested }: { rows: any[]; nested?: boolean }) {
  if (!rows.length) return null
  return (
    <Table
      rowKey="id"
      dataSource={rows}
      pagination={false}
      size="small"
      scroll={{ x: 'max-content' }}
      columns={LINE_COLS}
      style={nested ? { border: '1px solid #b0c4e8', borderTop: 'none', borderRadius: '0 0 6px 6px' } : undefined}
    />
  )
}

function SectionCard({ title, extra, children }: { title: string; extra?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>{title}</span>
        {extra}
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: 12, color: 'var(--text-2)', fontWeight: 700,
  marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.4px',
}
const valueStyle: React.CSSProperties = {
  fontSize: 14, color: 'var(--text-1)', minHeight: 32, display: 'flex', alignItems: 'center',
}
const valueViewStyle: React.CSSProperties = {
  ...valueStyle,
  border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px',
  backgroundColor: 'var(--muted)',
}

function Field({ label, children, editing }: { label: string; children: React.ReactNode; editing?: boolean }) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      <div style={editing ? valueStyle : valueViewStyle}>{children}</div>
    </div>
  )
}

function Val({ v }: { v?: React.ReactNode }) {
  return v != null && v !== '' ? <>{v}</> : <span style={{ color: 'var(--text-3)' }}>—</span>
}

function fmt(n: any) {
  if (n == null) return '—'
  return Number(n).toLocaleString('en-US')
}

export default function QuotationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const hook = useQuotationDetail(id!)
  const { data: termTemplates } = useTermTemplates()

  // Computed expiry preview trong edit mode
  const watchQuoteDate = Form.useWatch('quote_date', hook.form)
  const watchValidDays = Form.useWatch('valid_days', hook.form)
  const computedExpiry = watchQuoteDate && watchValidDays
    ? dayjs(watchQuoteDate).add(Number(watchValidDays), 'day').format('DD/MM/YYYY')
    : null

  if (!hook.isNew && (hook.isLoading || !hook.data)) return <Skeleton active style={{ padding: 20 }} />

  const q = hook.data
  const isDraft = hook.isNew || q?.status === 'draft'
  const isConfirmed = q?.status === 'confirmed'
  const allDone = q?.sections?.every((s: any) => s.line_items?.every((l: any) => Number(l.remaining_qty) <= 0))

  const exportActions = !hook.isNew && !hook.isEditing ? (
    <>
      <Button
        size="small"
        icon={<EyeOutlined />}
        loading={hook.exporting}
        onClick={hook.handlePdfPreview}
      >
        Xem trước
      </Button>
      <Button
        size="small"
        icon={<FilePdfOutlined />}
        type="primary"
        loading={hook.exporting}
        onClick={hook.handlePdfExport}
      >
        Xuất PDF
      </Button>
      <Select
        placeholder="Chọn template Excel"
        style={{ width: 180 }}
        size="small"
        options={hook.templates?.data?.map((t: any) => ({ value: t.id, label: t.name }))}
        onChange={hook.setTemplateId}
        notFoundContent="Chưa có template"
      />
      <Button size="small" icon={<FileExcelOutlined />} loading={hook.exporting}
        disabled={!hook.templateId} onClick={() => hook.handleExport('xlsx')}>Excel</Button>
    </>
  ) : null

  return (
    <div style={{ padding: '10px 20px 40px', display: 'flex', flexDirection: 'column', gap: 28 }}>
      <PageHeader
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => hook.navigate('/quotations')} style={{ padding: '0 4px' }} />
            <span style={{ color: 'var(--text-3)', fontSize: 14, cursor: 'pointer' }} onClick={() => hook.navigate('/quotations')}>Báo giá</span>
            <span style={{ color: 'var(--text-3)', fontSize: 14 }}>/</span>
            <span style={{ fontSize: 14 }}>{hook.isNew ? 'Tạo mới' : q?.code}</span>
            {!hook.isNew && q && <StatusBadge status={q.status} />}
          </span>
        }
        actions={
          hook.isEditing ? (
            <>
              <Button onClick={hook.cancelEdit}>Huỷ</Button>
              <Button type="primary" loading={hook.savePending} onClick={hook.saveEdit}>
                {hook.isNew ? 'Tạo báo giá' : 'Lưu'}
              </Button>
            </>
          ) : (
            <>
              {exportActions}
              {isDraft && <Button icon={<EditOutlined />} onClick={hook.startEdit}>Sửa</Button>}
              {isDraft && !hook.isNew && (
                <Button type="primary" loading={hook.confirmMutation.isPending} onClick={() => hook.confirmMutation.mutate()}>
                  Confirm
                </Button>
              )}
              {isConfirmed && (
                <>
                  <Button loading={hook.unconfirmMutation.isPending} onClick={() => hook.unconfirmMutation.mutate()}>Về Draft</Button>
                  <Popconfirm title="Đánh dấu hết hạn?" onConfirm={() => hook.expireMutation.mutate()}>
                    <Button>Hết hạn</Button>
                  </Popconfirm>
                  <Button type="primary" disabled={allDone} onClick={() => hook.navigate(`/deliveries?quotation_id=${q!.id}`)}>
                    Tạo Delivery Order
                  </Button>
                </>
              )}
              {!hook.isNew && !['cancelled', 'expired'].includes(q?.status ?? '') && (
                <Popconfirm title="Huỷ báo giá này?" onConfirm={() => hook.cancelMutation.mutate()}>
                  <Button danger loading={hook.cancelMutation.isPending}>Huỷ</Button>
                </Popconfirm>
              )}
            </>
          )
        }
      />

      <Form form={hook.form} layout="vertical"
        style={{ display: 'flex', flexDirection: 'column', gap: 28 }}
        initialValues={hook.isNew ? { sections: [{ name: 'Nhóm 1', line_items: [{}] }] } : undefined}>

        {/* ── Thông tin báo giá ── */}
        <SectionCard title="Thông tin báo giá">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '22px 28px' }}>

            {/* Row 1: Bitrix ID+Fetch | Số báo giá | Ngày báo giá */}
            <div>
              <div style={labelStyle}>Bitrix Deal ID</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <Input
                  placeholder="Deal ID (tuỳ chọn)"
                  value={hook.dealId}
                  onChange={(e) => hook.setDealId(e.target.value)}
                  onPressEnter={hook.fetchFromBitrix}
                  style={{ flex: 1, minWidth: 0 }}
                  disabled={!hook.isEditing}
                />
                {hook.isEditing && (
                  <Button icon={<SyncOutlined />} loading={hook.bitrixLoading}
                    onClick={hook.fetchFromBitrix} disabled={!hook.dealId.trim()}
                    title="Fetch & điền form từ Bitrix" />
                )}
              </div>
              {hook.bitrixError && <div style={{ color: '#f5222d', fontSize: 12, marginTop: 4 }}>{hook.bitrixError}</div>}
              {hook.bitrixInfo  && <div style={{ color: '#52c41a', fontSize: 12, marginTop: 4 }}>{hook.bitrixInfo}</div>}
            </div>

            <Field editing={hook.isEditing} label="Số báo giá">
              {hook.isEditing
                ? <Form.Item name="quote_number" noStyle><Input style={{ width: '100%' }} placeholder="VD: BG-2026-001" /></Form.Item>
                : <Val v={q?.quote_number} />}
            </Field>

            <Field editing={hook.isEditing} label="Ngày báo giá">
              {hook.isEditing
                ? <Form.Item name="quote_date" noStyle><DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} /></Form.Item>
                : <Val v={q?.quote_date ? new Date(q.quote_date).toLocaleDateString('vi-VN') : undefined} />}
            </Field>

            {/* Row 2: Khách hàng | Người liên hệ | Hiệu lực */}
            <Field editing={hook.isEditing} label="Khách hàng">
              {hook.isEditing
                ? <Form.Item name="company_id" noStyle rules={[{ required: true, message: 'Bắt buộc chọn khách hàng' }]}>
                    <Select showSearch optionFilterProp="label" style={{ width: '100%' }} placeholder="Chọn khách hàng"
                      options={hook.companies?.data?.map((c: any) => ({ value: c.id, label: c.name }))}
                      onChange={() => hook.form.setFieldValue('contact_id', undefined)} />
                  </Form.Item>
                : <Val v={q?.company_name} />}
            </Field>

            <Field editing={hook.isEditing} label="Người liên hệ">
              {hook.isEditing
                ? <Form.Item name="contact_id" noStyle>
                    <Select allowClear style={{ width: '100%' }} disabled={!hook.companyId}
                      placeholder={hook.companyId ? 'Chọn người liên hệ' : 'Chọn khách hàng trước'}
                      options={hook.companyDetail?.contacts?.map((c: any) => ({ value: c.id, label: c.full_name }))} />
                  </Form.Item>
                : <Val v={q?.contact_name} />}
            </Field>

            <Field editing={hook.isEditing} label="Hiệu lực (ngày)">
              {hook.isEditing
                ? <Form.Item name="valid_days" noStyle><InputNumber controls={false} min={1} style={{ width: '100%' }} /></Form.Item>
                : <Val v={q?.valid_days != null ? `${q.valid_days} ngày` : undefined} />}
            </Field>

            {/* Row 3: Tên dự án (full width) */}
            <div style={{ gridColumn: '1 / -1' }}>
              <Field editing={hook.isEditing} label="Tên dự án">
                {hook.isEditing
                  ? <Form.Item name="project_name" noStyle><Input style={{ width: '100%' }} placeholder="Tên dự án / công trình" /></Form.Item>
                  : <Val v={q?.project_name} />}
              </Field>
            </div>

            {/* Row 4: Địa điểm | Kho xuất | Hết hạn */}
            <Field editing={hook.isEditing} label="Địa điểm giao hàng">
              {hook.isEditing
                ? <Form.Item name="delivery_location" noStyle><Input style={{ width: '100%' }} /></Form.Item>
                : <Val v={q?.delivery_location} />}
            </Field>

            <Field editing={hook.isEditing} label="Kho xuất">
              {hook.isEditing
                ? <Form.Item name="warehouse_id" noStyle>
                    <Select allowClear style={{ width: '100%' }} placeholder="Bắt buộc khi có dòng giữ chỗ"
                      options={hook.warehouses?.map((w: any) => ({ value: w.id, label: w.name }))} />
                  </Form.Item>
                : <Val v={q?.warehouse_name} />}
            </Field>

            <Field editing={hook.isEditing} label="Hết hạn">
              {hook.isEditing
                ? <span style={{ fontSize: 14, color: computedExpiry ? 'var(--text-1)' : 'var(--text-3)' }}>
                    {computedExpiry ?? '— nhập Ngày BG + Hiệu lực'}
                  </span>
                : <Val v={q?.expired_at ? new Date(q.expired_at).toLocaleDateString('vi-VN') : undefined} />}
            </Field>

            {/* Điều khoản: label 1 lần, Select chọn mẫu + TextArea */}
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={labelStyle}>Điều khoản</div>
              {hook.isEditing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <Select
                    allowClear
                    placeholder="Chọn mẫu điều khoản (tuỳ chọn)"
                    style={{ width: '100%' }}
                    options={termTemplates?.map((t) => ({ value: t.id, label: t.name }))}
                    onChange={(tid) => {
                      const tpl = termTemplates?.find((t) => t.id === tid)
                      if (tpl) hook.form.setFieldValue('terms', tpl.content)
                    }}
                  />
                  <Form.Item name="terms" noStyle>
                    <Input.TextArea rows={4} style={{ width: '100%' }} placeholder="Nội dung điều khoản..." />
                  </Form.Item>
                </div>
              ) : (
                <div style={{ ...valueStyle, whiteSpace: 'pre-wrap' }}><Val v={q?.terms} /></div>
              )}
            </div>

            {/* Ghi chú */}
            <div style={{ gridColumn: '1 / -1' }}>
              <Field editing={hook.isEditing} label="Ghi chú">
                {hook.isEditing
                  ? <Form.Item name="note" noStyle><Input.TextArea rows={2} style={{ width: '100%' }} /></Form.Item>
                  : <Val v={q?.note} />}
              </Field>
            </div>

          </div>

          {!hook.isNew && (
            <div style={{ marginTop: 16 }}>
              <CustomFieldsPanel objectType="quotation" objectId={id!} inline />
            </div>
          )}
        </SectionCard>

        {/* ── Danh sách sản phẩm ── */}
        {hook.isEditing ? (
          <SectionCard title="Danh sách sản phẩm">
            <Form.List name="sections">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name }, idx) => (
                    <QuotationSectionItem key={key} form={hook.form} name={name} sectionIndex={idx} remove={() => remove(name)} />
                  ))}
                  <Button style={{ marginTop: 8 }} onClick={() => add({ name: `Nhóm ${fields.length + 1}`, line_items: [{}] })}>
                    + Thêm nhóm
                  </Button>
                </>
              )}
            </Form.List>
          </SectionCard>
        ) : (
          q?.sections?.map((section: any, sIdx: number) => (
            <SectionCard key={section.id} title={`${toRoman(sIdx + 1)}. ${section.name}`}>
              <LineTable rows={section.line_items ?? []} />
              {(section.sub_sections ?? []).map((ss: any, ssIdx: number) => (
                <div key={ss.id} style={{ marginTop: 10 }}>
                  <div style={{
                    padding: '4px 10px',
                    background: '#dce8fb',
                    border: '1px solid #b0c4e8',
                    borderBottom: 'none',
                    borderRadius: '6px 6px 0 0',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#4472c4',
                  }}>
                    <span style={{ marginRight: 6 }}>{ssIdx + 1}.</span>
                    {ss.name}
                    {ss.product_name && ss.product_name !== ss.name && (
                      <span style={{ fontWeight: 400, color: '#8aa6d4', marginLeft: 6, fontSize: 12 }}>
                        ({ss.product_name})
                      </span>
                    )}
                  </div>
                  <LineTable rows={ss.line_items ?? []} nested />
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '6px 0 0', fontSize: 13, color: 'var(--text-2)' }}>
                Tổng nhóm: <strong style={{ marginLeft: 8 }}>{fmt(section.subtotal)}</strong>
              </div>
            </SectionCard>
          ))
        )}

        {/* ── Tổng cộng (chỉ hiện khi đang xem báo giá đã có) ── */}
        {!hook.isNew && !hook.isEditing && q && (
          <SectionCard title="Tổng cộng">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
              <div style={{ display: 'flex', gap: 32, fontSize: 14 }}>
                <span style={{ color: 'var(--text-2)' }}>Tạm tính</span>
                <span style={{ minWidth: 140, textAlign: 'right' }}>{fmt(q.subtotal)}</span>
              </div>
              <div style={{ display: 'flex', gap: 32, fontSize: 14 }}>
                <span style={{ color: 'var(--text-2)' }}>Tiền VAT</span>
                <span style={{ minWidth: 140, textAlign: 'right' }}>{fmt(q.vat_total)}</span>
              </div>
              {Number(q.discount) > 0 && (
                <div style={{ display: 'flex', gap: 32, fontSize: 14 }}>
                  <span style={{ color: 'var(--text-2)' }}>Giảm giá</span>
                  <span style={{ minWidth: 140, textAlign: 'right', color: '#f5222d' }}>- {fmt(q.discount)}</span>
                </div>
              )}
              <div style={{ display: 'flex', gap: 32, fontSize: 16, fontWeight: 700, borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4 }}>
                <span>Tổng cộng</span>
                <span style={{ minWidth: 140, textAlign: 'right' }}>{fmt(q.grand_total)}</span>
              </div>
            </div>
          </SectionCard>
        )}

      </Form>
    </div>
  )
}
