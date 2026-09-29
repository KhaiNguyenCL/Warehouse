import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Pencil, Trash2, Shield, X, Search, ChevronLeft } from 'lucide-react'

import { api } from '@/lib/api'
import { useApiMutation } from '@/hooks/useApiMutation'
import { useRoles } from '@/hooks/useRoles'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription,
} from '@/components/ui/form'
import { cn } from '@/lib/utils'
import RolePermissionsPanel from '@/components/RolePermissionsPanel'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { usePageNoPadding } from '@/layout/PageHeaderSlot'

// ── Schema ──────────────────────────────────────────────────────────────────

const schema = z.object({
  name:        z.string().min(1, 'Nhập tên role'),
  description: z.string().optional(),
})
type RoleForm = z.infer<typeof schema>

// ── Component ────────────────────────────────────────────────────────────────

export default function RolesPage() {
  usePageNoPadding()
  const { data, isLoading, createMutation, updateMutation, deleteMutation } = useRoles()

  const [dialogOpen, setDialogOpen]     = useState(false)
  const [editing, setEditing]           = useState<any | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [permSelected, setPermSelected] = useState<Set<string>>(new Set())
  const [search, setSearch]             = useState('')
  const [selectedId, setSelectedId]     = useState<string | null>(null)
  const [mobileDetail, setMobileDetail] = useState(false)

  const form = useForm<RoleForm>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '' },
  })

  const savePermMutation = useApiMutation(
    (roleId: string) => api.put(`/settings/roles/${roleId}/permissions`, { permission_keys: [...permSelected] }),
    { successMessage: 'Cập nhật quyền thành công', invalidateKey: ['settings', 'roles'] },
  )

  function openCreate() {
    setEditing(null)
    setPermSelected(new Set())
    form.reset({ name: '', description: '' })
    setDialogOpen(true)
  }

  const openEditRequestId = useRef(0)
  async function openEdit(record: any) {
    setEditing(record)
    setPermSelected(new Set())
    form.reset({ name: record.name ?? '', description: record.description ?? '' })
    setDialogOpen(true)
    const requestId = ++openEditRequestId.current
    const { data: role } = await api.get(`/settings/roles/${record.id}`)
    if (openEditRequestId.current !== requestId) return
    setPermSelected(new Set(role.permissions.map((p: any) => p.key)))
  }

  function onSubmit(values: RoleForm) {
    if (editing) {
      updateMutation.mutate(
        { id: editing.id, ...values },
        { onSuccess: () => { savePermMutation.mutate(editing.id); setDialogOpen(false) } },
      )
    } else {
      createMutation.mutate(
        { ...values, permission_keys: [...permSelected] },
        { onSuccess: () => setDialogOpen(false) },
      )
    }
  }

  const roles: any[] = data ?? []
  const filtered = roles.filter((r) => !search || r.name?.toLowerCase().includes(search.toLowerCase()))
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
          <h1 className="kv-title">Vai trò &amp; Phân quyền</h1>
          <p className="kv-sub">{roles.length.toLocaleString('vi-VN')} vai trò cho từng nhóm người dùng</p>
        </div>
        <div className="kv-actions">
          <button type="button" className="kv-btn kv-btn--primary" onClick={openCreate}>Tạo role</button>
        </div>
      </div>

      <div className={cn('kv-md', mobileDetail && 'kv-md--detail-open')}>

        {/* Roster */}
        <div className="kv-md-list">
          <div className="kv-md-tools">
            <div className="kv-search">
              <Search className="h-4 w-4" />
              <input className="kv-input" placeholder="Tìm tên vai trò…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>

          <ul className="kv-md-items">
            {isLoading ? (
              <li className="kv-muted" style={{ padding: '32px 14px', textAlign: 'center', fontSize: 12 }}>Đang tải…</li>
            ) : filtered.length === 0 ? (
              <li className="kv-muted" style={{ padding: '32px 14px', textAlign: 'center', fontSize: 12 }}>Chưa có vai trò nào.</li>
            ) : (
              filtered.map((r) => (
                <li key={r.id}>
                  <a
                    className="kv-md-item"
                    aria-current={r.id === selectedId}
                    onClick={() => { setSelectedId(r.id); setMobileDetail(true) }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div className="kv-cell-title truncate">{r.name}</div>
                      {r.description && <div className="kv-cell-sub truncate">{r.description}</div>}
                    </div>
                    {r.is_system && (
                      <div className="kv-tags">
                        <Shield className="h-3 w-3" style={{ color: 'var(--s-approved-color)', flexShrink: 0 }} />
                      </div>
                    )}
                  </a>
                </li>
              ))
            )}
          </ul>

          <div className="kv-md-foot">{filtered.length} vai trò</div>
        </div>

        {/* Detail */}
        {!selected ? (
          <div className="kv-md-detail flex items-center justify-center">
            <p className="kv-muted" style={{ fontSize: 13 }}>Chọn 1 vai trò bên trái để xem chi tiết.</p>
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
                <h2 className="kv-md-title">
                  {selected.name}
                  {selected.is_system && <span className="kv-tag kv-tag--default">Hệ thống</span>}
                </h2>
              </div>
              <div className="kv-actions">
                <button type="button" className="kv-btn" onClick={() => openEdit(selected)}>
                  <Pencil className="h-3.5 w-3.5" />Sửa
                </button>
                {!selected.is_system && (
                  <button type="button" className="kv-btn kv-btn--danger" onClick={() => setDeleteTarget(selected)}>
                    <Trash2 className="h-3.5 w-3.5" />Xoá
                  </button>
                )}
              </div>
            </div>

            <div className="kv-md-block">
              <div className="kv-md-block-head">
                <h3 className="kv-section-title">Thông tin</h3>
              </div>
              <dl className="kv-dl">
                <div className="kv-span-3"><dt>Mô tả</dt><dd>{selected.description || <span className="kv-empty">Chưa nhập</span>}</dd></div>
              </dl>
            </div>

            <p className="kv-muted" style={{ fontSize: 12 }}>
              Bấm biểu tượng sửa để xem/chỉnh danh sách quyền của vai trò này.
            </p>
          </div>
        )}
      </div>

      {/* Create / Edit Sheet */}
      <Sheet open={dialogOpen} onOpenChange={(o) => !o && setDialogOpen(false)}>
        <SheetContent side="right" className="theme-2a w-[720px] flex flex-col gap-0" showCloseButton={false}>
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">
            {editing ? `Sửa role "${editing.name}"` : 'Tạo role mới'}
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

                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên role <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input
                        placeholder="VD: Kế toán"
                        disabled={editing?.is_system === true}
                        {...field}
                      />
                    </FormControl>
                    {editing?.is_system && (
                      <FormDescription className="text-[var(--s-pending-color)]">
                        Role hệ thống — không đổi tên được
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mô tả</FormLabel>
                    <FormControl>
                      <Input placeholder="Mô tả ngắn về vai trò này" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <RolePermissionsPanel
                  roleId={editing?.id ?? ''}
                  selected={permSelected}
                  onChange={setPermSelected}
                />

              </div>
            </div>

            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-5 py-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Huỷ
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending || savePermMutation.isPending}>
                {editing ? 'Lưu thay đổi' : 'Tạo mới'}
              </Button>
            </div>
          </form>
        </Form>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="theme-2a">
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá role?</AlertDialogTitle>
            <AlertDialogDescription>
              Role <strong className="text-foreground">{deleteTarget?.name}</strong> sẽ bị xoá.
              Chỉ xoá được nếu không có user nào đang dùng role này.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              variant="danger"
              onClick={() => { deleteMutation.mutate(deleteTarget.id); setDeleteTarget(null) }}
            >
              Xoá
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
