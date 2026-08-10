import { useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Popconfirm } from 'antd'
import { X, Plus, Trash2 } from 'lucide-react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
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
            ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
            : 'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
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
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="flex flex-col gap-0 p-0 sm:max-w-[580px] w-[580px]">

        {/* header */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4">
          {isLoading ? (
            <div className="h-6 w-48 animate-pulse rounded bg-muted" />
          ) : (
            <div className="flex flex-col gap-1.5 min-w-0">
              <h2 className="text-base font-semibold text-foreground leading-snug">{company?.name}</h2>
              <div className="flex items-center gap-2 flex-wrap">
                {company?.code && (
                  <span className="inline-flex items-center rounded-md border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-xs font-medium text-foreground">
                    {company.code}
                  </span>
                )}
                <TypeBadge types={company?.types ?? []} />
              </div>
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

              {/* Info */}
              <SectionBlock title="Thông tin">
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

              {/* Contacts */}
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

              {/* Supplier products */}
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

      </SheetContent>
    </Sheet>
  )
}
