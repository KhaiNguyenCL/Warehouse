import { useParams } from 'react-router-dom'
import {
  Form, Input, InputNumber, Select, Button, Tag, Popconfirm, Table, Skeleton, DatePicker,
} from 'antd'
import dayjs from 'dayjs'
import { ArrowLeftOutlined, EditOutlined } from '@ant-design/icons'
import { useQuotationDetail } from '../hooks/useQuotationDetail'
import { useTermTemplates } from '../hooks/useTermTemplates'
import { PageHeader } from '../components/ui/PageHeader'
import { StatusBadge } from '../components/ui/StatusBadge'
import CustomFieldsPanel from '../components/CustomFieldsPanel'

function SectionCard({ title, extra, children }: { title: string; extra?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-lg)',
      boxShadow: 'var(--shadow-sm)',
      overflow: 'hidden',
    }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>{title}</span>
        {extra}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      <div style={valueStyle}>{children}</div>
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

  if (hook.isLoading || !hook.data) return <Skeleton active style={{ padding: 20 }} />

  const q = hook.data
  const isDraft = q.status === 'draft'
  const isConfirmed = q.status === 'confirmed'
  const allDone = q.sections?.every((s: any) => s.line_items?.every((l: any) => Number(l.remaining_qty) <= 0))

  return (
    <div style={{ padding: '10px 20px 40px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <PageHeader
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => hook.navigate('/quotations')} style={{ padding: '0 4px' }} />
            <span style={{ color: 'var(--text-3)', fontSize: 14, cursor: 'pointer' }} onClick={() => hook.navigate('/quotations')}>Báo giá</span>
            <span style={{ color: 'var(--text-3)', fontSize: 14 }}>/</span>
            <span style={{ fontSize: 14 }}>{q.code}</span>
            <StatusBadge status={q.status} />
          </span>
        }
        actions={
          hook.isEditing ? (
            <>
              <Button onClick={hook.cancelEdit}>Huỷ</Button>
              <Button type="primary" loading={hook.updateMutation.isPending} onClick={hook.saveEdit}>Lưu</Button>
            </>
          ) : (
            <>
              {isDraft && <Button icon={<EditOutlined />} onClick={hook.startEdit}>Sửa</Button>}
              {isDraft && (
                <Button type="primary" loading={hook.confirmMutation.isPending} onClick={() => hook.confirmMutation.mutate()}>
                  Confirm
                </Button>
              )}
              {isConfirmed && (
                <>
                  <Button loading={hook.unconfirmMutation.isPending} onClick={() => hook.unconfirmMutation.mutate()}>
                    Về Draft
                  </Button>
                  <Popconfirm title="Đánh dấu hết hạn?" onConfirm={() => hook.expireMutation.mutate()}>
                    <Button>Hết hạn</Button>
                  </Popconfirm>
                  <Button
                    type="primary"
                    disabled={allDone}
                    onClick={() => hook.navigate(`/deliveries?quotation_id=${q.id}`)}
                  >
                    Tạo Delivery Order
                  </Button>
                </>
              )}
              {!['cancelled', 'expired'].includes(q.status) && (
                <Popconfirm title="Huỷ báo giá này?" onConfirm={() => hook.cancelMutation.mutate()}>
                  <Button danger loading={hook.cancelMutation.isPending}>Huỷ</Button>
                </Popconfirm>
              )}
            </>
          )
        }
      />

      {/* ── Thông tin báo giá ── */}
      <SectionCard title="Thông tin báo giá">
        <Form form={hook.form} layout="vertical" style={{ marginBottom: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px 24px' }}>

            <Field label="Số báo giá">
              {hook.isEditing
                ? <Form.Item name="quote_number" noStyle>
                    <Input style={{ width: '100%' }} placeholder="VD: BG-2026-001" />
                  </Form.Item>
                : <Val v={q.quote_number} />
              }
            </Field>

            <Field label="Ngày báo giá">
              {hook.isEditing
                ? <Form.Item name="quote_date" noStyle>
                    <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                  </Form.Item>
                : <Val v={q.quote_date ? new Date(q.quote_date).toLocaleDateString('vi-VN') : undefined} />
              }
            </Field>

            <Field label="Khách hàng">
              {hook.isEditing
                ? <Form.Item name="company_id" noStyle rules={[{ required: true }]}>
                    <Select
                      showSearch optionFilterProp="label" style={{ width: '100%' }}
                      options={hook.companies?.data?.map((c: any) => ({ value: c.id, label: c.name }))}
                      onChange={() => hook.form.setFieldValue('contact_id', undefined)}
                    />
                  </Form.Item>
                : <Val v={q.company_name} />
              }
            </Field>

            <Field label="Người liên hệ">
              {hook.isEditing
                ? <Form.Item name="contact_id" noStyle>
                    <Select
                      allowClear style={{ width: '100%' }}
                      disabled={!hook.companyId}
                      options={hook.companyDetail?.contacts?.map((c: any) => ({ value: c.id, label: c.full_name }))}
                    />
                  </Form.Item>
                : <Val v={q.contact_name} />
              }
            </Field>

            <Field label="Tên dự án">
              {hook.isEditing
                ? <Form.Item name="project_name" noStyle>
                    <Input style={{ width: '100%' }} />
                  </Form.Item>
                : <Val v={q.project_name} />
              }
            </Field>

            <Field label="Địa điểm giao hàng">
              {hook.isEditing
                ? <Form.Item name="delivery_location" noStyle>
                    <Input style={{ width: '100%' }} />
                  </Form.Item>
                : <Val v={q.delivery_location} />
              }
            </Field>

            <Field label="Kho xuất">
              {hook.isEditing
                ? <Form.Item name="warehouse_id" noStyle>
                    <Select
                      allowClear style={{ width: '100%' }}
                      options={hook.warehouses?.map((w: any) => ({ value: w.id, label: w.name }))}
                    />
                  </Form.Item>
                : <Val v={q.warehouse_name} />
              }
            </Field>

            <Field label="Hiệu lực (ngày)">
              {hook.isEditing
                ? <Form.Item name="valid_days" noStyle>
                    <InputNumber controls={false} min={1} style={{ width: '100%' }} />
                  </Form.Item>
                : <Val v={q.valid_days != null ? `${q.valid_days} ngày` : undefined} />
              }
            </Field>

            <Field label="Hết hạn">
              <Val v={q.expired_at ? new Date(q.expired_at).toLocaleDateString('vi-VN') : undefined} />
            </Field>

            <div style={{ gridColumn: '1 / -1' }}>
              {hook.isEditing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Điều khoản</div>
                  <Select
                    allowClear
                    placeholder="Chọn mẫu điều khoản (tuỳ chọn)"
                    style={{ width: '100%' }}
                    options={termTemplates?.map((t) => ({ value: t.id, label: t.name }))}
                    onChange={(id) => {
                      const tpl = termTemplates?.find((t) => t.id === id)
                      if (tpl) hook.form.setFieldValue('terms', tpl.content)
                    }}
                  />
                  <Form.Item name="terms" noStyle>
                    <Input.TextArea rows={4} style={{ width: '100%' }} placeholder="Nội dung điều khoản (có thể chỉnh sửa sau khi chọn mẫu)..." />
                  </Form.Item>
                </div>
              ) : (
                <Field label="Điều khoản">
                  <Val v={q.terms} />
                </Field>
              )}
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <Field label="Ghi chú">
                {hook.isEditing
                  ? <Form.Item name="note" noStyle>
                      <Input.TextArea rows={2} style={{ width: '100%' }} />
                    </Form.Item>
                  : <Val v={q.note} />
                }
              </Field>
            </div>

          </div>
        </Form>
        <div style={{ marginTop: 16 }}>
          <CustomFieldsPanel objectType="quotation" objectId={id!} inline />
        </div>
      </SectionCard>

      {/* ── Bitrix CRM ── */}
      <SectionCard title="Tích hợp Bitrix CRM">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {q.bitrix_deal_id ? (
            <span style={{ fontSize: 14 }}>
              Deal{' '}
              {q.bitrix_deal_url
                ? <a href={q.bitrix_deal_url} target="_blank" rel="noreferrer">#{q.bitrix_deal_id}</a>
                : <>#{q.bitrix_deal_id}</>}
              {q.bitrix_synced_at && <span style={{ color: 'var(--text-3)', marginLeft: 8, fontSize: 12 }}>
                đồng bộ lúc {new Date(q.bitrix_synced_at).toLocaleString('vi-VN')}
              </span>}
            </span>
          ) : (
            <span style={{ color: 'var(--text-3)', fontSize: 14 }}>Chưa đồng bộ Bitrix</span>
          )}
          {isDraft && (
            <>
              <Input
                placeholder={q.bitrix_deal_id ? 'Để trống = sync lại deal cũ' : 'Nhập Bitrix Deal ID'}
                style={{ width: 220 }}
                value={hook.dealId}
                onChange={(e) => hook.setDealId(e.target.value)}
              />
              <Button
                loading={hook.syncMutation.isPending}
                disabled={!hook.dealId && !q.bitrix_deal_id}
                onClick={() => hook.syncMutation.mutate()}
              >
                {q.bitrix_deal_id ? 'Sync lại' : 'Đồng bộ'}
              </Button>
            </>
          )}
        </div>
      </SectionCard>

      {/* ── Xuất báo giá ── */}
      <SectionCard title="Xuất báo giá">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Select
            placeholder="Chọn template"
            style={{ width: 260 }}
            options={hook.templates?.data?.map((t: any) => ({ value: t.id, label: t.name }))}
            onChange={hook.setTemplateId}
            notFoundContent="Chưa có template — tạo ở Settings > Template"
          />
          <Button loading={hook.exporting} disabled={!hook.templateId} onClick={() => hook.handleExport('xlsx')}>
            Xuất Excel
          </Button>
          <Button loading={hook.exporting} disabled={!hook.templateId} onClick={() => hook.handleExport('pdf')}>
            Xuất PDF
          </Button>
        </div>
      </SectionCard>

      {/* ── Danh sách sản phẩm (sections) ── */}
      {q.sections?.map((section: any) => (
        <SectionCard key={section.id} title={section.name}>
          <Table
            rowKey="id"
            dataSource={section.line_items}
            pagination={false}
            size="small"
            scroll={{ x: 'max-content' }}
            columns={[
              {
                title: 'Sản phẩm',
                width: 240,
                render: (_: any, l: any) => l.bundle_name ?? l.variant_name ?? l.description ?? '—',
              },
              {
                title: 'Mã hàng',
                width: 130,
                render: (_: any, l: any) => l.bundle_item_code ?? l.variant_item_code ?? '—',
              },
              { title: 'SL', dataIndex: 'quantity', width: 60, align: 'right' as const },
              { title: 'Đơn giá', dataIndex: 'unit_price', width: 120, align: 'right' as const, render: fmt },
              { title: 'VAT (%)', dataIndex: 'vat_percent', width: 80, align: 'right' as const },
              { title: 'Thành tiền', dataIndex: 'line_total', width: 120, align: 'right' as const, render: fmt },
              { title: 'Tiền VAT', dataIndex: 'vat_amount', width: 100, align: 'right' as const, render: fmt },
              { title: 'Bảo hành', dataIndex: 'warranty', width: 100 },
              {
                title: 'Giữ chỗ',
                dataIndex: 'is_reserved',
                width: 80,
                render: (v: boolean) => <Tag color={v ? 'blue' : 'default'}>{v ? 'Có' : 'Không'}</Tag>,
              },
              { title: 'Đã xuất', dataIndex: 'exported_qty', width: 80, align: 'right' as const },
              { title: 'Chờ xuất', dataIndex: 'pending_qty', width: 80, align: 'right' as const },
              { title: 'Còn lại', dataIndex: 'remaining_qty', width: 80, align: 'right' as const },
              { title: 'Ghi chú', dataIndex: 'note', width: 140 },
            ]}
            summary={() => (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={5} align="right">
                  <span style={{ color: 'var(--text-2)', fontSize: 12 }}>Tổng nhóm</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right">
                  <strong>{fmt(section.subtotal)}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} colSpan={7} />
              </Table.Summary.Row>
            )}
          />
        </SectionCard>
      ))}

      {/* ── Tổng cộng ── */}
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
    </div>
  )
}
