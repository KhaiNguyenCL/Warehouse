import { forwardRef, useImperativeHandle, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useApiMutation } from '../hooks/useApiMutation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'

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
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Họ tên</th>
              <th className="w-40 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Chức vụ</th>
              <th className="w-36 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">SĐT</th>
              <th className="w-56 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</th>
              <th className="w-20 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Chính</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {contacts.map((c: any) => (
              <tr
                key={c.id}
                onClick={() => openEdit(c)}
                className="cursor-pointer transition-colors hover:bg-muted/40"
              >
                <td className="px-4 py-3 font-medium text-foreground">{c.full_name}</td>
                <td className="px-4 py-3 text-foreground">{c.position || '—'}</td>
                <td className="px-4 py-3 text-foreground">{c.phone || '—'}</td>
                <td className="px-4 py-3 text-foreground">{c.email || '—'}</td>
                <td className="px-4 py-3 text-center">
                  {c.is_primary && (
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                      Chính
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
