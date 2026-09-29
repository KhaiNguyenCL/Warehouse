import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Pencil, Trash2, X, Search, ChevronLeft } from 'lucide-react'

import { useGroups } from '@/hooks/useGroups'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import GroupMembersPanel from '@/components/GroupMembersPanel'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { usePageNoPadding } from '@/layout/PageHeaderSlot'

// ── Schema ──────────────────────────────────────────────────────────────────

const schema = z.object({
  name:        z.string().min(1, 'Nhập tên nhóm'),
  description: z.string().optional(),
  role_id:     z.string().min(1, 'Chọn vai trò'),
})
type GroupForm = z.infer<typeof schema>

// ── Component ────────────────────────────────────────────────────────────────

export default function GroupsPage() {
  usePageNoPadding()
  const { data, isLoading, roles, createMutation, updateMutation, deleteMutation } = useGroups()

  const [dialogOpen, setDialogOpen]     = useState(false)
  const [editing, setEditing]           = useState<any | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [search, setSearch]             = useState('')
  const [selectedId, setSelectedId]     = useState<string | null>(null)
  const [mobileDetail, setMobileDetail] = useState(false)

  const form = useForm<GroupForm>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '', role_id: '' },
  })

  function openCreate() {
    setEditing(null)
    form.reset({ name: '', description: '', role_id: '' })
    setDialogOpen(true)
  }

  function openEdit(record: any) {
    setEditing(record)
    form.reset({
      name:        record.name ?? '',
      description: record.description ?? '',
      role_id:     record.role_id ?? '',
    })
    setDialogOpen(true)
  }

  function onSubmit(values: GroupForm) {
    if (editing) {
      updateMutation.mutate({ id: editing.id, ...values }, { onSuccess: () => setDialogOpen(false) })
    } else {
      createMutation.mutate(values, { onSuccess: () => setDialogOpen(false) })
    }
  }

  const groups: any[] = data ?? []
  const filtered = groups.filter((g) => !search || g.name?.toLowerCase().includes(search.toLowerCase()))
  const selected = filtered.find((g) => g.id === selectedId) ?? null

  useEffect(() => {
    if (filtered.length === 0) { setSelectedId(null); return }
    if (!selectedId || !filtered.some((g) => g.id === selectedId)) setSelectedId(filtered[0].id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered])

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="theme-2a flex h-full min-h-0 flex-col bg-background p-6">

      <div className="kv-head">
        <div>
          <h1 className="kv-title">Nhóm người dùng</h1>
          <p className="kv-sub">{groups.length.toLocaleString('vi-VN')} nhóm — mỗi nhóm gắn 1 vai trò</p>
        </div>
        <div className="kv-actions">
          <button type="button" className="kv-btn kv-btn--primary" onClick={openCreate}>Tạo nhóm</button>
        </div>
      </div>

      <div className={cn('kv-md', mobileDetail && 'kv-md--detail-open')}>

        {/* Roster */}
        <div className="kv-md-list">
          <div className="kv-md-tools">
            <div className="kv-search">
              <Search className="h-4 w-4" />
              <input className="kv-input" placeholder="Tìm tên nhóm…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>

          <ul className="kv-md-items">
            {isLoading ? (
              <li className="kv-muted" style={{ padding: '32px 14px', textAlign: 'center', fontSize: 12 }}>Đang tải…</li>
            ) : filtered.length === 0 ? (
              <li className="kv-muted" style={{ padding: '32px 14px', textAlign: 'center', fontSize: 12 }}>Chưa có nhóm nào.</li>
            ) : (
              filtered.map((g) => (
                <li key={g.id}>
                  <a
                    className="kv-md-item"
                    aria-current={g.id === selectedId}
                    onClick={() => { setSelectedId(g.id); setMobileDetail(true) }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div className="kv-cell-title truncate">{g.name}</div>
                      <div className="kv-cell-sub truncate">{g.role_name}</div>
                    </div>
                  </a>
                </li>
              ))
            )}
          </ul>

          <div className="kv-md-foot">{filtered.length} nhóm</div>
        </div>

        {/* Detail */}
        {!selected ? (
          <div className="kv-md-detail flex items-center justify-center">
            <p className="kv-muted" style={{ fontSize: 13 }}>Chọn 1 nhóm bên trái để xem chi tiết.</p>
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
                <h2 className="kv-md-title">{selected.name}</h2>
                <div className="kv-cell-sub" style={{ marginTop: 4 }}>{selected.role_name}</div>
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
                <div><dt>Vai trò</dt><dd>{selected.role_name || <span className="kv-empty">Chưa gán</span>}</dd></div>
                <div className="kv-span-2"><dt>Mô tả</dt><dd>{selected.description || <span className="kv-empty">Chưa nhập</span>}</dd></div>
              </dl>
            </div>

            <div className="kv-md-block">
              <div className="kv-md-block-head">
                <h3 className="kv-section-title">Thành viên</h3>
              </div>
              <div style={{ marginTop: 12 }}>
                <GroupMembersPanel groupId={selected.id} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Sheet */}
      <Sheet open={dialogOpen} onOpenChange={(o) => !o && setDialogOpen(false)}>
        <SheetContent side="right" className="theme-2a w-[480px] flex flex-col gap-0" showCloseButton={false}>
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">
            {editing ? `Sửa nhóm "${editing.name}"` : 'Tạo nhóm mới'}
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
                    <FormLabel>Tên nhóm <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="VD: Kho HCM" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mô tả</FormLabel>
                    <FormControl>
                      <Input placeholder="Mô tả ngắn về nhóm này" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="role_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vai trò <span className="text-destructive">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn vai trò" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="theme-2a">
                        {(roles ?? []).map((r: any) => (
                          <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

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

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="theme-2a">
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá nhóm?</AlertDialogTitle>
            <AlertDialogDescription>
              Nhóm <strong className="text-foreground">{deleteTarget?.name}</strong> sẽ bị xoá.
              Các thành viên sẽ mất quyền theo vai trò của nhóm này.
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
