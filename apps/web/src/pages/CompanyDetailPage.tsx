import { useParams, useNavigate } from 'react-router-dom'
import { Button, Input, Select, Popconfirm, Tag, Space, Skeleton, Tooltip } from 'antd'

import { COUNTRIES } from '../constants/countries'
import { ArrowLeftOutlined, EditOutlined, SaveOutlined, CloseOutlined, DeleteOutlined, LockFilled, UnlockOutlined } from '@ant-design/icons'
import { useCompany } from '../hooks/useCompany'
import ContactsPanel from '../components/ContactsPanel'
import SupplierProductsPanel from '../components/SupplierProductsPanel'
import { PageHeader, InfoGrid, InfoField, CodeText } from '../components/ui'

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-lg)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border)',
          fontSize: 15,
          fontWeight: 700,
          color: 'var(--text-1)',
        }}
      >
        {title}
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  )
}

// Một ô trong lưới — hiện text khi view, hiện input khi edit
function EditField({
  label,
  field,
  editValues,
  onChange,
  full = false,
  multiline = false,
  inputProps = {},
}: {
  label: string
  field: string
  editValues: Record<string, any>
  onChange: (field: string, value: any) => void
  full?: boolean
  multiline?: boolean
  inputProps?: Record<string, any>
}) {
  return (
    <div style={full ? { gridColumn: '1 / -1' } : {}}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 4 }}>
        {label}
      </div>
      {multiline ? (
        <Input.TextArea
          value={editValues[field] ?? ''}
          onChange={(e) => onChange(field, e.target.value)}
          rows={2}
          size="small"
          {...inputProps}
          style={{ maxWidth: '50%', ...(inputProps.style ?? {}) }}
        />
      ) : (
        <Input
          value={editValues[field] ?? ''}
          onChange={(e) => onChange(field, e.target.value)}
          size="small"
          {...inputProps}
          style={{ maxWidth: '50%', ...(inputProps.style ?? {}) }}
        />
      )}
    </div>
  )
}

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const hook = useCompany(id!)
  const { company, isLoading } = hook

  function onFieldChange(field: string, value: any) {
    hook.setEditValues((prev) => ({ ...prev, [field]: value }))
  }

  const typeTags = company?.types?.map((t: string) =>
    t === 'customer'
      ? <Tag key={t} color="blue"   style={{ margin: 0 }}>Khách hàng</Tag>
      : <Tag key={t} color="purple" style={{ margin: 0 }}>NCC</Tag>
  )

  return (
    <div style={{ padding: '10px 20px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── Breadcrumb ── */}
      <button
        onClick={() => navigate('/companies')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 13,
          color: 'var(--text-2)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          width: 'fit-content',
        }}
      >
        <ArrowLeftOutlined style={{ fontSize: 11 }} />
        Đối tác
      </button>

      {/* ── Header ── */}
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 1 }} />
      ) : (
        <PageHeader
          title={
            <span style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {company?.name}
              <Space size={4}>{typeTags}</Space>
            </span>
          }
          meta={company?.code ? <CodeText>{company.code}</CodeText> : undefined}
          actions={
            hook.editing ? (
              <>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  disabled={!hook.isDirty}
                  loading={hook.updateMutation.isPending}
                  onClick={() => hook.updateMutation.mutate(hook.editValues)}
                >
                  Lưu
                </Button>
                <Button icon={<CloseOutlined />} onClick={hook.cancelEdit}>
                  Huỷ
                </Button>
              </>
            ) : (
              <>
                <Tooltip title={company?.sync_locked ? 'Đang khoá sync Bitrix — nhấn để mở khoá' : 'Mở khoá sync Bitrix'}>
                  <Button
                    icon={company?.sync_locked ? <LockFilled style={{ color: '#d97706' }} /> : <UnlockOutlined />}
                    loading={hook.toggleLockMutation.isPending}
                    onClick={() => hook.toggleLockMutation.mutate(undefined)}
                  />
                </Tooltip>
                <Button icon={<EditOutlined />} onClick={hook.startEdit}>
                  Sửa
                </Button>
                <Popconfirm
                  title="Xoá công ty này?"
                  description="Không thể khôi phục sau khi xoá."
                  onConfirm={() => hook.deleteMutation.mutate(id!)}
                  okText="Xoá"
                  okButtonProps={{ danger: true }}
                  cancelText="Huỷ"
                >
                  <Button danger icon={<DeleteOutlined />} loading={hook.deleteMutation.isPending}>
                    Xoá
                  </Button>
                </Popconfirm>
              </>
            )
          }
        />
      )}

      {/* ── Thông tin cơ bản ── */}
      <SectionCard title="Thông tin">
        {isLoading ? (
          <Skeleton active paragraph={{ rows: 3 }} />
        ) : hook.editing ? (
          <InfoGrid>
            <EditField label="Tên công ty" field="name"         editValues={hook.editValues} onChange={onFieldChange} />
            <EditField label="Mã"          field="code"         editValues={hook.editValues} onChange={onFieldChange} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 4 }}>Loại</div>
              <Select
                mode="multiple"
                size="small"
                style={{ width: '100%', maxWidth: '50%' }}
                value={hook.editValues.types ?? []}
                onChange={(v) => onFieldChange('types', v)}
                options={[
                  { value: 'customer', label: 'Khách hàng' },
                  { value: 'supplier', label: 'NCC (Nhà cung cấp)' },
                ]}
              />
            </div>
            <EditField label="Số điện thoại" field="phone"    editValues={hook.editValues} onChange={onFieldChange} />
            <EditField label="Email"          field="email"    editValues={hook.editValues} onChange={onFieldChange} />
            <EditField label="Mã số thuế"     field="tax_code" editValues={hook.editValues} onChange={onFieldChange} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 4 }}>Quốc gia</div>
              <Select
                size="small"
                showSearch
                optionFilterProp="label"
                style={{ maxWidth: '50%' }}
                value={hook.editValues.country ?? undefined}
                onChange={(v) => onFieldChange('country', v)}
                options={COUNTRIES}
              />
            </div>
            <EditField label="Số tài khoản"   field="bank_account" editValues={hook.editValues} onChange={onFieldChange} />
            <EditField label="Ngân hàng"       field="bank_name"    editValues={hook.editValues} onChange={onFieldChange} />
            <EditField label="Địa chỉ" field="address" editValues={hook.editValues} onChange={onFieldChange} full />
            <EditField label="Ghi chú" field="note"    editValues={hook.editValues} onChange={onFieldChange} full multiline />
          </InfoGrid>
        ) : (
          <InfoGrid>
            <InfoField label="Số điện thoại" value={company?.phone} />
            <InfoField label="Email"          value={company?.email} />
            <InfoField label="Mã số thuế"     value={company?.tax_code} />
            <InfoField label="Quốc gia"       value={company?.country} />
            {(company?.bank_account || company?.bank_name) && (
              <>
                <InfoField label="Số tài khoản" value={company?.bank_account} />
                <InfoField label="Ngân hàng"    value={company?.bank_name} />
              </>
            )}
            {company?.address && <InfoField label="Địa chỉ" value={company?.address} full />}
            {company?.note    && <InfoField label="Ghi chú" value={company?.note}    full />}
          </InfoGrid>
        )}
      </SectionCard>

      {/* ── Người liên hệ ── */}
      <SectionCard title="Người liên hệ">
        {id && <ContactsPanel companyId={id} />}
      </SectionCard>

      {/* ── Hàng hóa cung cấp (NCC only) ── */}
      {hook.isSupplier && (
        <SectionCard title="Hàng hóa cung cấp">
          {id && <SupplierProductsPanel companyId={id} />}
        </SectionCard>
      )}

    </div>
  )
}
