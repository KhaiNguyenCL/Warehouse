import { useState } from 'react'
import { X, Pencil, Check, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { api } from '../lib/api'
import { useApiMutation } from '../hooks/useApiMutation'

interface Props {
  open: boolean
  contact: any | null
  onClose: () => void
  onUpdated?: () => void
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2 py-2">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{value || '—'}</span>
    </div>
  )
}

export default function ContactSheet({ open, contact, onClose, onUpdated }: Props) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ full_name: '', position: '', phone: '', email: '', is_primary: false })

  function startEdit() {
    if (!contact) return
    setForm({
      full_name:  contact.full_name  ?? '',
      position:   contact.position   ?? '',
      phone:      contact.phone      ?? '',
      email:      contact.email      ?? '',
      is_primary: contact.is_primary ?? false,
    })
    setEditing(true)
  }

  const updateMutation = useApiMutation(
    (values: any) => api.patch(`/companies/${contact?.company_id}/contacts/${contact?.id}`, values),
    {
      successMessage: 'Đã cập nhật người liên hệ',
      invalidateKey: ['contacts'],
      onSuccess: () => { setEditing(false); onUpdated?.() },
    },
  )

  if (!open || !contact) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/20" onClick={() => { setEditing(false); onClose() }} />

      {/* Sheet */}
      <div className={cn(
        'fixed right-0 top-0 z-50 flex h-full flex-col bg-background shadow-xl',
        'w-[440px] border-l border-border',
      )}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-base font-semibold">{contact.full_name}</span>
            {contact.position && (
              <span className="text-xs text-muted-foreground">{contact.position}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!editing ? (
              <Button variant="outline" size="sm" onClick={startEdit}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Sửa
              </Button>
            ) : (
              <Button
                size="sm"
                disabled={updateMutation.isPending || !form.full_name.trim()}
                onClick={() => updateMutation.mutate(form)}
              >
                <Check className="mr-1.5 h-3.5 w-3.5" />
                Lưu
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(false); onClose() }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">

          {/* Company badge */}
          {contact.company_name && (
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
              <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{contact.company_name}</div>
                {contact.company_code && (
                  <div className="text-xs text-muted-foreground font-mono">{contact.company_code}</div>
                )}
              </div>
              {contact.is_primary && (
                <span className="ml-auto flex-shrink-0 inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                  Chính
                </span>
              )}
            </div>
          )}

          {!editing ? (
            <div className="divide-y divide-border">
              <InfoRow label="Họ tên"    value={contact.full_name} />
              <InfoRow label="Chức vụ"   value={contact.position} />
              <InfoRow label="SĐT"       value={contact.phone} />
              <InfoRow label="Email"     value={contact.email} />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Họ tên <span className="text-red-500">*</span></Label>
                <Input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label>Chức vụ</Label>
                  <Input placeholder="Giám đốc" value={form.position} onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>SĐT</Label>
                  <Input placeholder="0901234567" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Email</Label>
                <Input type="email" placeholder="email@company.com" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <Label className="cursor-pointer font-normal text-sm">Đặt làm liên hệ chính</Label>
                <Switch checked={form.is_primary} onCheckedChange={(v) => setForm((f) => ({ ...f, is_primary: v }))} />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
