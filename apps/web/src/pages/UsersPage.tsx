import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, Search, X } from 'lucide-react'

import { useUsers } from '@/hooks/useUsers'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { ActiveBadge } from '@/components/ui/ActiveBadge'
import { Sheet, SheetContent } from '@/components/ui/sheet'

// ── Schema ──────────────────────────────────────────────────────────────────

const schema = z.object({
  full_name: z.string().min(1, 'Nhập họ tên'),
  email:     z.string().email('Email không hợp lệ').optional().or(z.literal('')),
  phone:     z.string().optional(),
  group_ids: z.array(z.string()),
  password:  z.string().optional(),
  is_active: z.boolean(),
})
type UserForm = z.infer<typeof schema>

// ── Component ────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const { data, isLoading, groups, createMutation, updateMutation } = useUsers()
  const qc = useQueryClient()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing]       = useState<any | null>(null)
  const [search, setSearch]         = useState('')

  const form = useForm<UserForm>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: '', email: '', phone: '', group_ids: [], password: '', is_active: true },
  })

  function openCreate() {
    setEditing(null)
    form.reset({ full_name: '', email: '', phone: '', group_ids: [], password: '', is_active: true })
    setDialogOpen(true)
  }

  function openEdit(record: any) {
    setEditing(record)
    form.reset({
      full_name: record.full_name ?? '',
      email:     '',
      phone:     record.phone ?? '',
      group_ids: (record.groups ?? []).map((g: any) => g.id),
      password:  '',
      is_active: record.is_active ?? true,
    })
    setDialogOpen(true)
  }

  function onSubmit(values: UserForm) {
    const { group_ids, ...userValues } = values

    if (!editing) {
      // Extra validation for create-only required fields
      let hasError = false
      if (!userValues.email) {
        form.setError('email', { message: 'Nhập email' })
        hasError = true
      }
      if (!userValues.password || userValues.password.length < 6) {
        form.setError('password', { message: 'Tối thiểu 6 ký tự' })
        hasError = true
      }
      if (hasError) return
      createMutation.mutate(userValues, {
        onSuccess: async (res: any) => {
          const userId = res.data.id
          await Promise.all(group_ids.map((gid) => api.post(`/settings/groups/${gid}/members`, { user_id: userId })))
          qc.invalidateQueries({ queryKey: ['settings', 'users'] })
          qc.invalidateQueries({ queryKey: ['settings', 'groups'] })
          setDialogOpen(false)
        },
      })
    } else {
      const before = new Set<string>((editing.groups ?? []).map((g: any) => g.id))
      const after = new Set(group_ids)
      const toAdd = group_ids.filter((id) => !before.has(id))
      const toRemove = [...before].filter((id) => !after.has(id))
      updateMutation.mutate({ id: editing.id, ...userValues }, {
        onSuccess: async () => {
          await Promise.all([
            ...toAdd.map((gid) => api.post(`/settings/groups/${gid}/members`, { user_id: editing.id })),
            ...toRemove.map((gid) => api.delete(`/settings/groups/${gid}/members/${editing.id}`)),
          ])
          qc.invalidateQueries({ queryKey: ['settings', 'users'] })
          qc.invalidateQueries({ queryKey: ['settings', 'groups'] })
          setDialogOpen(false)
        },
      })
    }
  }

  const users: any[] = data?.data ?? data ?? []
  const filtered = users.filter((r) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      r.full_name?.toLowerCase().includes(q) ||
      r.email?.toLowerCase().includes(q) ||
      (r.groups ?? []).some((g: any) => g.name?.toLowerCase().includes(q))
    )
  })

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight">Người dùng</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Quản lý tài khoản và phân quyền truy cập
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Tạo user
        </Button>
      </div>

      {/* Table card */}
      <div className="overflow-hidden rounded-xl border border-border-md bg-background shadow-sm">

        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm tên, email, nhóm…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-64 pl-9 text-sm shadow-none focus-visible:ring-1"
            />
          </div>
          <span className="text-sm text-muted-foreground">{filtered.length} kết quả</span>
        </div>

        {/* Table */}
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/60">
              <th className="w-12 px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">#</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Họ tên</th>
              <th className="w-56 px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Email</th>
              <th className="w-32 px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">SĐT</th>
              <th className="w-48 px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Nhóm</th>
              <th className="w-40 px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-xs text-muted-foreground">
                  Đang tải…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-xs text-muted-foreground">
                  {search ? 'Không tìm thấy kết quả.' : 'Chưa có người dùng nào.'}
                </td>
              </tr>
            ) : (
              filtered.map((r, i) => (
                <tr
                  key={r.id}
                  onClick={() => openEdit(r)}
                  className="group/row cursor-pointer transition-colors hover:bg-muted/30"
                >
                  <td className="px-4 py-2 text-muted-foreground">{i + 1}</td>
                  <td className="px-4 py-2 font-medium text-foreground">{r.full_name}</td>
                  <td className="px-4 py-2 text-foreground">{r.email}</td>
                  <td className="px-4 py-2 text-foreground">{r.phone ?? <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-4 py-2 text-foreground">
                    {(r.groups ?? []).length > 0
                      ? (r.groups ?? []).map((g: any) => g.name).join(', ')
                      : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex justify-center">
                      <ActiveBadge active={r.is_active} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Footer */}
        {filtered.length > 0 && (
          <div className="border-t border-border px-4 py-2.5">
            <span className="text-xs text-muted-foreground">{filtered.length} người dùng</span>
          </div>
        )}
      </div>

      {/* Create / Edit Sheet */}
      <Sheet open={dialogOpen} onOpenChange={(o) => !o && setDialogOpen(false)}>
        <SheetContent side="right" className="w-[480px] flex flex-col gap-0" showCloseButton={false}>
        {/* header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">
            {editing ? `Sửa user "${editing.full_name}"` : 'Tạo user mới'}
          </h2>
          <button
            onClick={() => setDialogOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* scrollable body + footer */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <div className="flex flex-col gap-4">

                <FormField control={form.control} name="full_name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Họ tên <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Nguyễn Văn A" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {!editing && (
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="user@company.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}

                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>SĐT</FormLabel>
                    <FormControl>
                      <Input placeholder="0901 234 567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="group_ids" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nhóm</FormLabel>
                    <FormControl>
                      <div className="flex flex-col gap-2 rounded-lg border border-border-md p-3">
                        {(groups ?? []).length === 0 ? (
                          <p className="text-xs text-muted-foreground">Chưa có nhóm nào — tạo nhóm ở trang Nhóm người dùng trước.</p>
                        ) : (groups ?? []).map((g: any) => (
                          <label key={g.id} className="flex cursor-pointer items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-border accent-primary"
                              checked={field.value?.includes(g.id) ?? false}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? [...(field.value ?? []), g.id]
                                  : (field.value ?? []).filter((id: string) => id !== g.id)
                                field.onChange(next)
                              }}
                            />
                            <span className="text-foreground">{g.name}</span>
                            <span className="text-xs text-muted-foreground">({g.role_name})</span>
                          </label>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {editing ? 'Đổi password' : 'Password'}
                      {!editing && <span className="text-red-500"> *</span>}
                      {editing && <span className="ml-1 text-xs font-normal text-muted-foreground">(để trống nếu không đổi)</span>}
                    </FormLabel>
                    <FormControl>
                      <Input type="password" placeholder={editing ? '••••••' : 'Tối thiểu 6 ký tự'} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {editing && (
                  <FormField control={form.control} name="is_active" render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border border-border p-3">
                      <FormLabel className="cursor-pointer text-sm font-normal">Hoạt động</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )} />
                )}

              </div>
            </div>

            {/* footer */}
            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-5 py-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Huỷ
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editing ? 'Lưu thay đổi' : 'Tạo mới'}
              </Button>
            </div>
          </form>
        </Form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
