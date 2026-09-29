import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQueryClient } from '@tanstack/react-query'
import { Search, X, Trash2, Pencil, ChevronLeft } from 'lucide-react'

import { useUsers } from '@/hooks/useUsers'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { StatusToggle } from '@/components/ui/StatusToggle'
import { usePageNoPadding } from '@/layout/PageHeaderSlot'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

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
  usePageNoPadding()
  const { data, isLoading, groups, createMutation, updateMutation, deleteMutation } = useUsers()
  const qc = useQueryClient()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing]       = useState<any | null>(null)
  const [search, setSearch]         = useState('')
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mobileDetail, setMobileDetail] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

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
    if (statusFilter === 'active' && !r.is_active) return false
    if (statusFilter === 'inactive' && r.is_active) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      r.full_name?.toLowerCase().includes(q) ||
      r.email?.toLowerCase().includes(q) ||
      (r.groups ?? []).some((g: any) => g.name?.toLowerCase().includes(q))
    )
  })
  const selected = filtered.find((r) => r.id === selectedId) ?? null

  useEffect(() => {
    if (filtered.length === 0) { setSelectedId(null); return }
    if (!selectedId || !filtered.some((r) => r.id === selectedId)) setSelectedId(filtered[0].id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered])

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="theme-2a flex h-full min-h-0 flex-col bg-background p-6">

      <div className="kv-head">
        <div>
          <h1 className="kv-title">Người dùng</h1>
          <p className="kv-sub">{users.length.toLocaleString('vi-VN')} tài khoản truy cập hệ thống</p>
        </div>
        <div className="kv-actions">
          <button type="button" className="kv-btn kv-btn--primary" onClick={openCreate}>Tạo user</button>
        </div>
      </div>

      <div className={cn('kv-md', mobileDetail && 'kv-md--detail-open')}>

        {/* Roster */}
        <div className="kv-md-list">
          <div className="kv-md-tools">
            <div className="kv-search">
              <Search className="h-4 w-4" />
              <input className="kv-input" placeholder="Tìm tên, email, nhóm…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="kv-seg" role="tablist" aria-label="Lọc trạng thái">
              <button type="button" aria-current={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>Tất cả</button>
              <button type="button" aria-current={statusFilter === 'active'} onClick={() => setStatusFilter('active')}>Hoạt động</button>
              <button type="button" aria-current={statusFilter === 'inactive'} onClick={() => setStatusFilter('inactive')}>Ngừng</button>
            </div>
          </div>

          <ul className="kv-md-items">
            {isLoading ? (
              <li className="kv-muted" style={{ padding: '32px 14px', textAlign: 'center', fontSize: 12 }}>Đang tải…</li>
            ) : filtered.length === 0 ? (
              <li className="kv-muted" style={{ padding: '32px 14px', textAlign: 'center', fontSize: 12 }}>
                {search ? 'Không tìm thấy kết quả.' : 'Chưa có người dùng nào.'}
              </li>
            ) : (
              filtered.map((r) => (
                <li key={r.id}>
                  <a
                    className="kv-md-item"
                    aria-current={r.id === selectedId}
                    style={{ opacity: r.is_active ? undefined : 0.5 }}
                    onClick={() => { setSelectedId(r.id); setMobileDetail(true) }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div className="kv-cell-title truncate">{r.full_name}</div>
                      <div className="kv-cell-sub truncate">{r.email}</div>
                      {(r.groups ?? []).length > 0 && (
                        <div className="kv-cell-sub truncate">{(r.groups ?? []).map((g: any) => g.name).join(', ')}</div>
                      )}
                    </div>
                  </a>
                </li>
              ))
            )}
          </ul>

          <div className="kv-md-foot">{filtered.length} người dùng</div>
        </div>

        {/* Detail */}
        {!selected ? (
          <div className="kv-md-detail flex items-center justify-center">
            <p className="kv-muted" style={{ fontSize: 13 }}>Chọn 1 người dùng bên trái để xem chi tiết.</p>
          </div>
        ) : (
          <div className="kv-md-detail">

            <button
              onClick={() => setMobileDetail(false)}
              className="mb-2.5 flex items-center gap-1.5 border-none bg-transparent text-sm font-medium md:hidden"
              style={{ color: 'var(--text-2)', cursor: 'pointer' }}
            >
              <ChevronLeft className="h-4 w-4" />
              Quay lại danh sách
            </button>

            <div className="kv-md-head">
              <div>
                <h2 className="kv-md-title">{selected.full_name}</h2>
                <div className="kv-cell-sub" style={{ marginTop: 4 }}>{selected.email}</div>
              </div>
              <div className="kv-actions">
                <button type="button" className="kv-btn" onClick={() => openEdit(selected)}>
                  <Pencil className="h-3.5 w-3.5" />Sửa
                </button>
                <button type="button" className="kv-btn kv-btn--danger" onClick={() => setDeleteTarget(selected)}>
                  <Trash2 className="h-3.5 w-3.5" />Xoá
                </button>
              </div>
            </div>

            <div className="kv-md-block">
              <div className="kv-md-block-head">
                <h3 className="kv-section-title">Thông tin</h3>
              </div>
              <dl className="kv-dl">
                <div><dt>Số điện thoại</dt><dd>{selected.phone || <span className="kv-empty">Chưa nhập</span>}</dd></div>
                <div><dt>Nhóm</dt><dd>{(selected.groups ?? []).length > 0 ? (selected.groups ?? []).map((g: any) => g.name).join(', ') : <span className="kv-empty">Chưa có</span>}</dd></div>
                <div>
                  <dt>Trạng thái</dt>
                  <dd>
                    <StatusToggle
                      active={selected.is_active}
                      onChange={(v) => updateMutation.mutate({ id: selected.id, is_active: v })}
                    />
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Sheet */}
      <Sheet open={dialogOpen} onOpenChange={(o) => !o && setDialogOpen(false)}>
        <SheetContent side="right" className="theme-2a w-[480px] flex flex-col gap-0" showCloseButton={false}>
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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <div className="flex flex-col gap-4">

                <FormField control={form.control} name="full_name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Họ tên <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Nguyễn Văn A" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {!editing && (
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email <span className="text-destructive">*</span></FormLabel>
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
                      {!editing && <span className="text-destructive"> *</span>}
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

      {/* Delete user dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="theme-2a">
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá hẳn user?</AlertDialogTitle>
            <AlertDialogDescription>
              User <strong className="text-foreground">{deleteTarget?.full_name}</strong> sẽ bị xoá vĩnh viễn khỏi hệ thống.
              Nếu user này đã từng tạo/duyệt phiếu (receipt, PO, quotation, DO...), thao tác sẽ bị chặn —
              dùng công tắc trạng thái để vô hiệu hoá thay thế.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              variant="danger"
              onClick={() => { deleteMutation.mutate(deleteTarget.id); setDeleteTarget(null) }}
            >
              Xoá hẳn
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
