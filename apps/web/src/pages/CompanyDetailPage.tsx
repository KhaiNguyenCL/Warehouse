import { useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Popconfirm } from 'antd'
import { ArrowLeft, Trash2, Plus } from 'lucide-react'
import { useCompany } from '../hooks/useCompany'
import ContactsPanel, { type ContactsPanelRef } from '../components/ContactsPanel'
import SupplierProductsPanel from '../components/SupplierProductsPanel'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function TypeBadge({ types }: { types: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {types?.map((t) => (
        <span key={t} className={cn(
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
          t === 'customer'
            ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
            : 'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
        )}>
          {t === 'customer' ? 'Khách hàng' : 'NCC'}
        </span>
      ))}
    </div>
  )
}

function SectionCard({
  title, children, actions,
}: { title: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {actions}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function InfoRow({ label, value, full }: { label: string; value?: string | null; full?: boolean }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm text-foreground">{value || '—'}</div>
    </div>
  )
}

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const hook = useCompany(id!)
  const { company, isLoading } = hook
  const contactsRef = useRef<ContactsPanelRef>(null)

  return (
    <div className="flex flex-col gap-5 pb-10">

      {/* Breadcrumb */}
      <button
        onClick={() => navigate('/companies')}
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Đối tác
      </button>

      {/* Header */}
      {isLoading ? (
        <div className="h-8 w-64 animate-pulse rounded-md bg-muted" />
      ) : (
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{company?.name}</h1>
              <TypeBadge types={company?.types ?? []} />
            </div>
            {company?.code && (
              <span className="inline-flex w-fit items-center rounded-md border border-border bg-muted/60 px-2 py-0.5 font-mono text-xs font-medium text-foreground">
                {company.code}
              </span>
            )}
          </div>

          <Popconfirm
            title="Xoá công ty này?"
            description="Không thể khôi phục sau khi xoá."
            onConfirm={() => hook.deleteMutation.mutate(id!)}
            okText="Xoá"
            okButtonProps={{ danger: true }}
            cancelText="Huỷ"
          >
            <Button
              variant="destructive"
              size="sm"
              className="gap-1.5 flex-shrink-0"
              disabled={hook.deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4" />
              Xoá
            </Button>
          </Popconfirm>
        </div>
      )}

      {/* Thông tin cơ bản */}
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
          <div className="grid grid-cols-2 gap-x-12 gap-y-5">
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

      {/* Người liên hệ */}
      <SectionCard
        title="Người liên hệ"
        actions={
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => contactsRef.current?.openCreate()}
          >
            <Plus className="h-3.5 w-3.5" />
            Thêm người liên hệ
          </Button>
        }
      >
        {id && <ContactsPanel ref={contactsRef} companyId={id} />}
      </SectionCard>

      {/* Hàng hóa cung cấp (NCC only) */}
      {hook.isSupplier && (
        <SectionCard title="Hàng hóa cung cấp">
          {id && <SupplierProductsPanel companyId={id} />}
        </SectionCard>
      )}

    </div>
  )
}
