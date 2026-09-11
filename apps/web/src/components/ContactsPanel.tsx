import { forwardRef, useImperativeHandle, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Phone, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '../lib/api'
import { useApiMutation } from '../hooks/useApiMutation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table'

function initials(name?: string | null) {
  return (name ?? '?').replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2).toUpperCase() || '?'
}

// Cùng palette Tailwind cứng như bảng "Người liên hệ" ở CompaniesPage — giữ đúng màu
// mẫu gốc, không quy về token WMS (nên không tự đổi theo dark mode của app).
const AVATAR_PALETTE = ['bg-rose-500', 'bg-violet-600', 'bg-emerald-500', 'bg-cyan-500', 'bg-sky-600', 'bg-amber-600', 'bg-indigo-600']
function avatarColor(seed: string) {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length]
}

function Avatar({ name }: { name?: string | null }) {
  return (
    <span className={cn('flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-white font-semibold text-xs', avatarColor(name ?? '?'))}>
      {initials(name)}
    </span>
  )
}

function PrimaryBadge({ isPrimary }: { isPrimary: boolean }) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset',
      isPrimary ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-slate-100 text-slate-600 ring-slate-200',
    )}>
      <span className="mr-2 h-1.5 w-1.5 rounded-full bg-current" />
      {isPrimary ? 'Chính' : 'Phụ'}
    </span>
  )
}

interface ContactForm {
  full_name: string
  position: string
  phone: string
  email: string
  is_primary: boolean
}

const DEFAULT_FORM: ContactForm = {
  full_name: '', position: '', phone: '', email: '', is_primary: false,
}

export interface ContactsPanelRef {
  openCreate(): void
}

interface Props { companyId: string }

const ContactsPanel = forwardRef<ContactsPanelRef, Props>(function ContactsPanel({ companyId }, ref) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [form, setForm] = useState<ContactForm>(DEFAULT_FORM)

  useImperativeHandle(ref, () => ({
    openCreate() {
      setEditing(null)
      setForm(DEFAULT_FORM)
      setOpen(true)
    },
  }))

  const { data: company, isLoading } = useQuery({
    queryKey: ['companies', companyId],
    queryFn: async () => (await api.get(`/companies/${companyId}`)).data,
  })

  const invalidate = { invalidateKey: ['companies', companyId] }

  const createMutation = useApiMutation(
    (values: any) => api.post(`/companies/${companyId}/contacts`, values),
    { successMessage: 'Thêm người liên hệ thành công', ...invalidate, onSuccess: () => setOpen(false) },
  )

  const updateMutation = useApiMutation(
    (values: any) => api.patch(`/companies/${companyId}/contacts/${editing?.id}`, values),
    { successMessage: 'Cập nhật thành công', ...invalidate, onSuccess: () => setOpen(false) },
  )

  const pending = createMutation.isPending || updateMutation.isPending
  const contacts: any[] = company?.contacts ?? []

  function openEdit(contact: any) {
    setEditing(contact)
    setForm({
      full_name: contact.full_name ?? '',
      position:  contact.position  ?? '',
      phone:     contact.phone     ?? '',
      email:     contact.email     ?? '',
      is_primary: contact.is_primary ?? false,
    })
    setOpen(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (editing) {
      updateMutation.mutate(form)
    } else {
      createMutation.mutate(form)
    }
  }

  return (
    <>
      {isLoading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">Đang tải…</div>
      ) : contacts.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">Chưa có người liên hệ</div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-200 bg-slate-100 hover:bg-slate-100 [&>th]:text-xs [&>th]:uppercase [&>th]:tracking-wider [&>th]:text-slate-600 [&>th+th]:border-l [&>th+th]:border-slate-200">
                <TableHead>Họ tên</TableHead>
                <TableHead className="w-36">Chức vụ</TableHead>
                <TableHead className="w-48">Liên hệ</TableHead>
                <TableHead className="w-16 text-center">Chính</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((c: any, i: number) => (
                <TableRow
                  key={c.id}
                  onClick={() => openEdit(c)}
                  className={cn(
                    'cursor-pointer border-slate-200 transition-colors hover:bg-slate-200 [&>td+td]:border-l [&>td+td]:border-slate-200',
                    i % 2 === 1 && 'bg-slate-50',
                  )}
                >
                  <TableCell>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={c.full_name} />
                      <span className="truncate font-semibold text-slate-900">{c.full_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-normal text-slate-700">{c.position || <span className="text-slate-400">—</span>}</TableCell>
                  <TableCell>
                    {c.phone || c.email ? (
                      <div className="flex flex-col gap-0.5 min-w-0">
                        {c.phone && (
                          <span className="flex items-center gap-1.5 text-xs text-slate-700 min-w-0">
                            <Phone className="h-3 w-3 flex-shrink-0 text-slate-400" />
                            <span className="truncate">{c.phone}</span>
                          </span>
                        )}
                        {c.email && (
                          <span className="flex items-center gap-1.5 text-xs text-slate-700 min-w-0">
                            <Mail className="h-3 w-3 flex-shrink-0 text-slate-400" />
                            <span className="truncate" title={c.email}>{c.email}</span>
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <PrimaryBadge isPrimary={!!c.is_primary} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => !pending && setOpen(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Sửa người liên hệ' : 'Thêm người liên hệ'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-1">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ct-name">
                Họ tên <span className="text-red-500">*</span>
              </Label>
              <Input
                id="ct-name"
                placeholder="Nguyễn Văn A"
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ct-position">Chức vụ</Label>
                <Input
                  id="ct-position"
                  placeholder="Giám đốc"
                  value={form.position}
                  onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ct-phone">Số điện thoại</Label>
                <Input
                  id="ct-phone"
                  placeholder="0901234567"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ct-email">Email</Label>
              <Input
                id="ct-email"
                type="email"
                placeholder="email@company.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <Label htmlFor="ct-primary" className="cursor-pointer font-normal text-sm">
                Đặt làm liên hệ chính
              </Label>
              <Switch
                id="ct-primary"
                checked={form.is_primary}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_primary: v }))}
              />
            </div>

            <DialogFooter className="pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
                Huỷ
              </Button>
              <Button type="submit" disabled={pending || !form.full_name.trim()}>
                {pending ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Thêm'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
})

export default ContactsPanel
