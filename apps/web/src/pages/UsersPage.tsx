import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Search, X } from 'lucide-react'

import { useUsers } from '@/hooks/useUsers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

// ── Schema ──────────────────────────────────────────────────────────────────

const schema = z.object({
  full_name: z.string().min(1, 'Nhập họ tên'),
  email:     z.string().email('Email không hợp lệ').optional().or(z.literal('')),
  phone:     z.string().optional(),
  role_id:   z.string().min(1, 'Chọn vai trò'),
  password:  z.string().optional(),
  is_active: z.boolean(),
})
type UserForm = z.infer<typeof schema>

// ── Component ────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const { data, isLoading, roles, createMutation, updateMutation } = useUsers()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing]       = useState<any | null>(null)
  const [search, setSearch]         = useState('')

  const form = useForm<UserForm>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: '', email: '', phone: '', role_id: '', password: '', is_active: true },
  })

  function openCreate() {
    setEditing(null)
    form.reset({ full_name: '', email: '', phone: '', role_id: '', password: '', is_active: true })
    setDialogOpen(true)
  }

  function openEdit(record: any) {
    setEditing(record)
    form.reset({
      full_name: record.full_name ?? '',
      email:     '',
      phone:     record.phone ?? '',
      role_id:   record.role_id ?? '',
      password:  '',
      is_active: record.is_active ?? true,
    })
    setDialogOpen(true)
  }

  function onSubmit(values: UserForm) {
    if (!editing) {
      // Extra validation for create-only required fields
      let hasError = false
      if (!values.email) {
        form.setError('email', { message: 'Nhập email' })
        hasError = true
      }
      if (!values.password || values.password.length < 6) {
        form.setError('password', { message: 'Tối thiểu 6 ký tự' })
        hasError = true
      }
      if (hasError) return
      createMutation.mutate(values, { onSuccess: () => setDialogOpen(false) })
    } else {
      updateMutation.mutate({ id: editing.id, ...values }, { onSuccess: () => setDialogOpen(false) })
    }
  }

  const users: any[] = data?.data ?? data ?? []
  const filtered = users.filter((r) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      r.full_name?.toLowerCase().includes(q) ||
      r.email?.toLowerCase().includes(q) ||
      r.role_name?.toLowerCase().includes(q)
    )
  })

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Người dùng</h1>
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
      <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">

        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm tên, email, vai trò…"
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
            <tr className="border-b border-border bg-muted/40">
              <th className="w-12 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">#</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Họ tên</th>
              <th className="w-56 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</th>
              <th className="w-32 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">SĐT</th>
              <th className="w-36 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vai trò</th>
              <th className="w-40 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trạng thái</th>
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
                  className="group/row cursor-pointer transition-colors hover:bg-muted/40"
                >
                  <td className="px-4 py-2 text-muted-foreground">{i + 1}</td>
                  <td className="px-4 py-2 font-medium text-foreground">{r.full_name}</td>
                  <td className="px-4 py-2 text-foreground">{r.email}</td>
                  <td className="px-4 py-2 text-foreground">{r.phone ?? <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-4 py-2 text-foreground">{r.role_name ?? <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-4 py-2">
                    <div className="flex justify-center">
                      <span className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
                        r.is_active
                          ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300'
                          : 'bg-red-100 text-red-700 ring-1 ring-red-200',
                      )}>
                        <span className={cn(
                          'h-1.5 w-1.5 rounded-full',
                          r.is_active ? 'bg-emerald-500' : 'bg-red-500',
                        )} />
                        {r.is_active ? 'Hoạt động' : 'Ngừng'}
                      </span>
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
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/30 supports-backdrop-filter:backdrop-blur-sm transition-opacity duration-200',
          dialogOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={() => setDialogOpen(false)}
      />
      <div
        className={cn(
          'fixed right-0 top-0 z-50 flex h-full w-[480px] flex-col bg-background shadow-xl transition-transform duration-200',
          dialogOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
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

                <FormField control={form.control} name="role_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vai trò <span className="text-red-500">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn vai trò" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(roles ?? []).map((r: any) => (
                          <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
      </div>
    </div>
  )
}
