import { useRef, useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Popconfirm } from 'antd'
import { X, Plus, Trash2, Pencil, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { api } from '../lib/api'
import { useApiMutation } from '../hooks/useApiMutation'
import ContactsPanel, { type ContactsPanelRef } from './ContactsPanel'
import SupplierProductsPanel from './SupplierProductsPanel'

function TypeBadge({ types }: { types: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {types?.map((t) => (
        <span key={t} className={cn(
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
          t === 'customer'
            ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-300'
            : 'bg-purple-100 text-purple-800 ring-1 ring-purple-300',
        )}>
          {t === 'customer' ? 'Khách hàng' : 'NCC'}
        </span>
      ))}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm text-foreground">{value || '—'}</div>
    </div>
  )
}

function SectionBlock({
  title, children, action,
}: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  )
}

// ── inline editable Mã field ──────────────────────────────────────────────────

function EditableCode({
  companyId, initialCode,
}: { companyId: string; initialCode: string }) {
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
          className="h-6 w-32 px-1.5 py-0 font-mono text-xs"
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
      <span className="inline-flex items-center rounded-md border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-xs font-medium text-foreground">
        {initialCode}
      </span>
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

interface Props {
  open: boolean
  companyId: string | null
  onClose: () => void
}

export default function CompanySheet({ open, companyId, onClose }: Props) {
  const contactsRef = useRef<ContactsPanelRef>(null!)

  const { data: company, isLoading } = useQuery({
    queryKey: ['companies', companyId],
    queryFn: async () => (await api.get(`/companies/${companyId}`)).data,
    enabled: !!companyId && open,
  })

  const deleteMutation = useApiMutation(
    () => api.delete(`/companies/${companyId}`),
    {
      successMessage: 'Đã xoá công ty',
      invalidateKey: ['companies'],
      onSuccess: () => onClose(),
    },
  )

  const isSupplier = company?.types?.includes('supplier')

  return (
    <>
      {/* backdrop — dims but does NOT lock scroll */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/30 supports-backdrop-filter:backdrop-blur-sm transition-opacity duration-200',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
      />

      {/* panel */}
      <div
        className={cn(
          'fixed right-0 top-0 z-50 flex h-full w-1/2 flex-col bg-background shadow-xl transition-transform duration-200',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* header */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4">
          {isLoading ? (
            <div className="h-6 w-48 animate-pulse rounded bg-muted" />
          ) : (
            <div className="flex flex-col gap-1.5 min-w-0">
              <h2 className="text-base font-semibold text-foreground leading-snug">{company?.name}</h2>
              <TypeBadge types={company?.types ?? []} />
            </div>
          )}

          <div className="flex shrink-0 items-center gap-1">
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
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </Popconfirm>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col gap-4 px-5 py-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-6 px-5 py-5">

              <SectionBlock title="Thông tin">
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  {company?.code != null && (
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mã đối tác</div>
                      <div className="mt-0.5"><EditableCode companyId={companyId!} initialCode={company.code} /></div>
                    </div>
                  )}
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
                  {company?.address && (
                    <div className="col-span-2">
                      <InfoRow label="Địa chỉ" value={company.address} />
                    </div>
                  )}
                  {company?.note && (
                    <div className="col-span-2">
                      <InfoRow label="Ghi chú" value={company.note} />
                    </div>
                  )}
                </div>
              </SectionBlock>

              <div className="border-t border-border" />

              <SectionBlock
                title="Người liên hệ"
                action={
                  <Button
                    size="sm" variant="outline" className="gap-1.5 h-7 text-xs"
                    onClick={() => contactsRef.current?.openCreate()}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Thêm
                  </Button>
                }
              >
                {companyId && <ContactsPanel ref={contactsRef} companyId={companyId} />}
              </SectionBlock>

              {isSupplier && companyId && (
                <>
                  <div className="border-t border-border" />
                  <SectionBlock title="Hàng hóa cung cấp">
                    <SupplierProductsPanel companyId={companyId} />
                  </SectionBlock>
                </>
              )}

            </div>
          )}
        </div>
      </div>
    </>
  )
}
