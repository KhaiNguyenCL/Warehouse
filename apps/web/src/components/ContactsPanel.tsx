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

function PrimaryBadge({ isPrimary }: { isPrimary: boolean }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
      style={isPrimary
        ? { background: 'var(--s-completed-bg)', color: 'var(--s-completed-color)' }
        : { background: 'var(--muted)', color: 'var(--muted-foreground)' }}
    >
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
        <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent [&>th]:h-8 [&>th]:text-xs [&>th]:font-medium [&>th]:text-muted-foreground">
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
                    'cursor-pointer border-border transition-colors hover:bg-muted',
                    i % 2 === 1 && 'bg-muted/40',
                  )}
                >
                  <TableCell>
                    <span className="truncate font-semibold text-foreground">{c.full_name}</span>
                  </TableCell>
                  <TableCell className="whitespace-normal text-foreground">{c.position || <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell>
                    {c.phone || c.email ? (
                      <div className="flex flex-col gap-0.5 min-w-0">
                        {c.phone && (
                          <span className="flex items-center gap-1.5 text-xs text-foreground min-w-0">
                            <Phone className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                            <span className="truncate">{c.phone}</span>
                          </span>
                        )}
                        {c.email && (
                          <span className="flex items-center gap-1.5 text-xs text-foreground min-w-0">
                            <Mail className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                            <span className="truncate" title={c.email}>{c.email}</span>
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <PrimaryBadge isPrimary={!!c.is_primary} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
        </Table>
      )}

      <Dialog open={open} onOpenChange={(o) => !pending && setOpen(o)}>
        <DialogContent className="theme-2a sm:max-w-md">
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
