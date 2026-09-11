import { useState, useEffect } from 'react'
import { Building2, Check, Pencil, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { SectionCard, InfoRow } from '@/components/ui/SectionCard'
import { api } from '../lib/api'
import { useApiMutation } from '../hooks/useApiMutation'

// Panel chi tiết người liên hệ — nửa phải của layout master-detail (roster trái + panel
// phải), thay cho ContactSheet cũ (đã xoá). Nhận thẳng object contact từ danh sách bên
// trái thay vì tự fetch, vì roster đã có đủ dữ liệu — tránh round-trip network thừa.
interface Props { contact: any | null }

export default function ContactDetailPanel({ contact }: Props) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ full_name: '', position: '', phone: '', email: '', is_primary: false })

  // Đổi contact (chọn dòng khác) → thoát chế độ sửa, nạp lại form theo contact mới.
  useEffect(() => {
    setEditing(false)
    if (contact) {
      setForm({
        full_name:  contact.full_name  ?? '',
        position:   contact.position   ?? '',
        phone:      contact.phone      ?? '',
        email:      contact.email      ?? '',
        is_primary: contact.is_primary ?? false,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contact?.id])

  const updateMutation = useApiMutation(
    (values: typeof form) => api.patch(`/companies/${contact?.company_id}/contacts/${contact?.id}`, values),
    { successMessage: 'Đã cập nhật người liên hệ', invalidateKey: ['contacts'], onSuccess: () => setEditing(false) },
  )

  if (!contact) {
    return (
      <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-dashed border-border-md bg-background/60">
        <p className="text-sm text-muted-foreground">Chọn 1 người liên hệ bên trái để xem chi tiết.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--accent-bg)] text-[var(--accent-text)]">
            <User className="h-5 w-5" />
          </span>
          <div className="flex flex-col gap-1 min-w-0">
            <h2 className="font-serif text-lg font-semibold leading-snug text-foreground">{contact.full_name}</h2>
            {contact.position && <p className="text-sm text-muted-foreground">{contact.position}</p>}
          </div>
        </div>

        {!editing ? (
          <Button variant="outline" size="sm" className="flex-shrink-0" onClick={() => setEditing(true)}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Sửa
          </Button>
        ) : (
          <div className="flex flex-shrink-0 items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(false)}>Huỷ</Button>
            <Button
              size="sm"
              disabled={updateMutation.isPending || !form.full_name.trim()}
              onClick={() => updateMutation.mutate(form)}
            >
              <Check className="mr-1.5 h-3.5 w-3.5" />
              Lưu
            </Button>
          </div>
        )}
      </div>

      {/* Company badge */}
      {contact.company_name && (
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
          <Building2 className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <div className="truncate text-sm font-medium" title={contact.company_name}>{contact.company_name}</div>
            {contact.company_code && <div className="font-mono text-xs text-muted-foreground">{contact.company_code}</div>}
          </div>
          {contact.is_primary && (
            <span className="ml-auto flex-shrink-0 text-sm font-medium text-emerald-700">Chính</span>
          )}
        </div>
      )}

      <SectionCard title="Thông tin">
        {!editing ? (
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <InfoRow label="Chức vụ" value={contact.position} />
            <InfoRow label="Số điện thoại" value={contact.phone} />
            <InfoRow label="Email" value={contact.email} full />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Họ tên <span className="text-red-500">*</span></Label>
                <Input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Chức vụ</Label>
                <Input placeholder="Giám đốc" value={form.position} onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>SĐT</Label>
                <Input placeholder="0901234567" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Email</Label>
                <Input type="email" placeholder="email@company.com" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <Label className="cursor-pointer text-sm font-normal">Đặt làm liên hệ chính</Label>
              <Switch checked={form.is_primary} onCheckedChange={(v) => setForm((f) => ({ ...f, is_primary: v }))} />
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  )
}
