import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Pencil, Trash2, Search, X, ChevronLeft } from 'lucide-react'

import { useBrands } from '@/hooks/useBrands'
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
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { StatusToggle } from '@/components/ui/StatusToggle'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { usePageNoPadding } from '@/layout/PageHeaderSlot'

// ── Schema ─────────────────────────────────────────────────────────────────

const schema = z.object({
  name:       z.string().min(1, 'Nhập tên hãng'),
  short_code: z.string().min(1, 'Nhập mã viết tắt'),
  is_active:  z.boolean(),
})
type BrandForm = z.infer<typeof schema>

// ── Component ──────────────────────────────────────────────────────────────

export default function BrandsPage() {
  usePageNoPadding()
  const { data, isLoading, createMutation, updateMutation, deleteMutation } = useBrands()

  const [dialogOpen, setDialogOpen]     = useState(false)
  const [editing, setEditing]           = useState<any | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [selectedId, setSelectedId]     = useState<string | null>(null)
  // Mobile (< md): grid dồn về 1 cột, chỉ hiện roster HOẶC detail tại 1 thời điểm — tránh
  // detail bị đẩy tràn ngang ra ngoài màn hình khi grid-cols-[380px_1fr] không đủ chỗ co giãn.
  const [mobileDetail, setMobileDetail] = useState(false)

  const form = useForm<BrandForm>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', short_code: '', is_active: true },
  })

  function openCreate() {
    setEditing(null)
    form.reset({ name: '', short_code: '', is_active: true })
    setDialogOpen(true)
  }

  function openEdit(record: any) {
    setEditing(record)
    form.reset({ name: record.name, short_code: record.short_code, is_active: record.is_active ?? true })
    setDialogOpen(true)
  }

  function onSubmit(values: BrandForm) {
    if (editing) {
      updateMutation.mutate({ id: editing.id, ...values }, { onSuccess: () => setDialogOpen(false) })
    } else {
      createMutation.mutate(values, { onSuccess: () => setDialogOpen(false) })
    }
  }

  const allBrands: any[] = data ?? []
  const filtered = allBrands.filter((b) => {
    if (statusFilter === 'active' && !b.is_active) return false
    if (statusFilter === 'inactive' && b.is_active) return false
    if (search && !b.name?.toLowerCase().includes(search.toLowerCase()) && !b.short_code?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })
  const selected = filtered.find((b) => b.id === selectedId) ?? null

  useEffect(() => {
    if (filtered.length === 0) { setSelectedId(null); return }
    if (!selectedId || !filtered.some((b) => b.id === selectedId)) setSelectedId(filtered[0].id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered])

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="theme-2a flex h-full min-h-0 flex-col bg-background p-6">

      <div className="kv-head">
        <div>
          <h1 className="kv-title">Thương hiệu</h1>
          <p className="kv-sub">{allBrands.length.toLocaleString('vi-VN')} hãng sản xuất</p>
        </div>
        <div className="kv-actions">
          <button type="button" className="kv-btn kv-btn--primary" onClick={openCreate}>Tạo mới</button>
        </div>
      </div>

      <div className={cn('kv-md', mobileDetail && 'kv-md--detail-open')}>

        {/* Roster */}
        <div className="kv-md-list">
          <div className="kv-md-tools">
            <div className="kv-search">
              <Search className="h-4 w-4" />
              <input className="kv-input" placeholder="Tìm tên, mã viết tắt…" value={search} onChange={(e) => setSearch(e.target.value)} />
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
                {search ? 'Không tìm thấy kết quả.' : 'Chưa có thương hiệu nào.'}
              </li>
            ) : (
              filtered.map((b) => (
                <li key={b.id}>
                  <a
                    className="kv-md-item"
                    aria-current={b.id === selectedId}
                    style={{ opacity: b.is_active ? undefined : 0.5 }}
                    onClick={() => { setSelectedId(b.id); setMobileDetail(true) }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div className="kv-cell-title truncate">{b.name}</div>
                      <div className="kv-cell-sub mono" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        {b.short_code}
                        {!b.is_active && <span>· Ngừng</span>}
                      </div>
                    </div>
                  </a>
                </li>
              ))
            )}
          </ul>

          <div className="kv-md-foot">{filtered.length} thương hiệu</div>
        </div>

        {/* Detail */}
        {!selected ? (
          <div className="kv-md-detail flex items-center justify-center">
            <p className="kv-muted" style={{ fontSize: 13 }}>Chọn 1 thương hiệu bên trái để xem chi tiết.</p>
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
                <div className="kv-cell-sub mono" style={{ marginTop: 4 }}>{selected.short_code}</div>
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
                <div>
                  <dt>Trạng thái</dt>
                  <dd>
                    <StatusToggle
                      shape="tag"
                      active={selected.is_active}
                      onChange={(v) => updateMutation.mutate({ id: selected.id, is_active: v })}
                    />
                  </dd>
                </div>
                <div><dt>Ngày tạo</dt><dd>{selected.created_at ? new Date(selected.created_at).toLocaleDateString('vi-VN') : <span className="kv-empty">Chưa nhập</span>}</dd></div>
                <div><dt>Người tạo</dt><dd>{selected.created_by_name || <span className="kv-empty">Chưa nhập</span>}</dd></div>
              </dl>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Sheet */}
      <Sheet open={dialogOpen} onOpenChange={(o) => !o && setDialogOpen(false)}>
        <SheetContent side="right" className="theme-2a w-96 flex flex-col gap-0" showCloseButton={false}>
          <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-base font-semibold text-foreground">
              {editing ? editing.name : 'Tạo thương hiệu mới'}
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
                      <FormLabel>Tên hãng</FormLabel>
                      <FormControl><Input placeholder="VD: Cisco" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="short_code" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mã viết tắt</FormLabel>
                      <FormControl><Input placeholder="VD: CSC" className="font-mono" {...field} /></FormControl>
                      <FormDescription>Dùng để gợi ý mã sản phẩm</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                  {editing && (
                    <FormField control={form.control} name="is_active" render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border border-border p-3">
                        <FormLabel className="cursor-pointer text-sm font-normal">Hoạt động</FormLabel>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
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

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="theme-2a">
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá thương hiệu?</AlertDialogTitle>
            <AlertDialogDescription>
              Hãng <strong className="text-foreground">{deleteTarget?.name}</strong> sẽ bị xoá.
              Không thể xoá nếu đang có sản phẩm sử dụng.
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
