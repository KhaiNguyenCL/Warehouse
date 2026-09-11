import { useRef, useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Popconfirm } from 'antd'
import { Building2, Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CodeText } from '@/components/ui/CodeText'
import { SectionCard, InfoRow } from '@/components/ui/SectionCard'
import { api } from '../lib/api'
import { useApiMutation } from '../hooks/useApiMutation'
import ContactsPanel, { type ContactsPanelRef } from './ContactsPanel'
import SupplierProductsPanel from './SupplierProductsPanel'

function TypeBadge({ types }: { types: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {types?.map((t) => {
        const isCust = t === 'customer'
        const color = isCust ? 'var(--accent-text)' : 'var(--s-expired-color)'
        const bg    = isCust ? 'var(--accent-bg)'   : 'var(--s-expired-bg)'
        return (
          <span
            key={t}
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{ background: bg, color }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
            {isCust ? 'Khách hàng' : 'NCC'}
          </span>
        )
      })}
    </div>
  )
}

// ── inline editable Mã field ──────────────────────────────────────────────────

function EditableCode({ companyId, initialCode }: { companyId: string; initialCode: string }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(initialCode)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setValue(initialCode) }, [initialCode])
  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  const saveMutation = useApiMutation(
    (code: string) => api.patch(`/companies/${companyId}`, { code }),
    {
      successMessage: 'Đã cập nhật mã',
      invalidateKey: ['companies'],
      onSuccess: () => setEditing(false),
    },
  )

  function handleCancel() {
    setValue(initialCode)
    setEditing(false)
  }

  function handleSave() {
    if (value.trim() && value.trim() !== initialCode) {
      saveMutation.mutate(value.trim())
    } else {
      setValue(initialCode)
      setEditing(false)
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave()
            if (e.key === 'Escape') handleCancel()
          }}
          className="h-7 w-32 px-1.5 py-0 font-mono text-xs"
          disabled={saveMutation.isPending}
        />
        <button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="flex h-5 w-5 items-center justify-center rounded text-emerald-600 hover:bg-emerald-50"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={handleCancel}
          className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-muted"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div className="group flex items-center gap-1.5">
      <CodeText>{initialCode}</CodeText>
      <button
        onClick={() => setEditing(true)}
        className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted"
        title="Sửa mã"
      >
        <Pencil className="h-3 w-3" />
      </button>
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────

interface Props { companyId: string | null }

export default function CompanyDetailPanel({ companyId }: Props) {
  const contactsRef = useRef<ContactsPanelRef>(null!)

  const { data: company, isLoading } = useQuery({
    queryKey: ['companies', companyId],
    queryFn: async () => (await api.get(`/companies/${companyId}`)).data,
    enabled: !!companyId,
  })

  const deleteMutation = useApiMutation(
    () => api.delete(`/companies/${companyId}`),
    { successMessage: 'Đã xoá công ty', invalidateKey: ['companies'] },
  )

  if (!companyId) {
    return (
      <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-dashed border-border-md bg-background/60">
        <p className="text-sm text-muted-foreground">Chọn 1 đối tác bên trái để xem chi tiết.</p>
      </div>
    )
  }

  const isSupplier = company?.types?.includes('supplier')

  return (
    <div className="flex flex-col gap-4">

      {/* Header */}
      {isLoading ? (
        <div className="h-8 w-64 animate-pulse rounded-md bg-muted" />
      ) : (
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--accent-bg)] text-[var(--accent-text)]">
              <Building2 className="h-5 w-5" />
            </span>
            <div className="flex flex-col gap-1.5 min-w-0">
              <h2 className="font-serif text-lg font-semibold leading-snug text-foreground">{company?.name}</h2>
              <div className="flex flex-wrap items-center gap-2">
                {company?.code && <EditableCode companyId={companyId} initialCode={company.code} />}
                <TypeBadge types={company?.types ?? []} />
              </div>
            </div>
          </div>

          <Popconfirm
            title="Xoá công ty này?"
            description="Không thể khôi phục sau khi xoá."
            onConfirm={() => deleteMutation.mutate(undefined)}
            okText="Xoá"
            okButtonProps={{ danger: true }}
            cancelText="Huỷ"
            placement="bottomRight"
          >
            <Button
              variant="ghost" size="icon"
              className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-destructive"
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </Popconfirm>
        </div>
      )}

      <SectionCard title="Thông tin">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                <div className="h-4 w-36 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <InfoRow label="Số điện thoại" value={company?.phone} />
            <InfoRow label="Email"          value={company?.email} />
            <InfoRow label="Mã số thuế"     value={company?.tax_code} />
            <InfoRow label="Quốc gia"       value={company?.country} />
            {(company?.bank_account || company?.bank_name) && (
              <>
                <InfoRow label="Số tài khoản" value={company?.bank_account} />
                <InfoRow label="Ngân hàng"    value={company?.bank_name} />
              </>
            )}
            {company?.address && <InfoRow label="Địa chỉ" value={company.address} full />}
            {company?.note    && <InfoRow label="Ghi chú" value={company.note}    full />}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Người liên hệ"
        actions={
          <Button
            size="sm" variant="outline" className="gap-1.5 h-7 text-xs"
            onClick={() => contactsRef.current?.openCreate()}
          >
            <Plus className="h-3.5 w-3.5" />
            Thêm
          </Button>
        }
      >
        {!isLoading && <ContactsPanel ref={contactsRef} companyId={companyId} />}
      </SectionCard>

      {isSupplier && (
        <SectionCard title="Hàng hóa cung cấp">
          <SupplierProductsPanel companyId={companyId} />
        </SectionCard>
      )}
    </div>
  )
}
