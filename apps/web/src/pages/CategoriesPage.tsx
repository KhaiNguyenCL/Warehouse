import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronRight, ChevronDown, ChevronLeft, Pencil, Trash2, Search, X } from 'lucide-react'

import { useCategories } from '@/hooks/useCategories'
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { StatusToggle } from '@/components/ui/StatusToggle'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { usePageNoPadding } from '@/layout/PageHeaderSlot'

// ── Helpers ─────────────────────────────────────────────────────────────────

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u'])

function generateShortCode(name: string): string {
  const tokens = name.trim().split(/\s+/)
  if (tokens.length > 1) {
    return tokens
      .map((t) => (/^\d/.test(t) ? t.replace(/\D/g, '').slice(0, 2) : t[0].toUpperCase()))
      .join('')
      .slice(0, 4)
  }
  const word = name.trim().toUpperCase()
  const rest = word.slice(1).split('').filter((c) => !VOWELS.has(c.toLowerCase()))
  return (word[0] + rest.slice(0, 2).join('')).slice(0, 3)
}

interface FlatRow {
  item: any
  depth: number
  hasChildren: boolean
}

function buildFlatRows(flat: any[], expandedIds: Set<string>): FlatRow[] {
  if (!flat?.length) return []
  const map: Record<string, any & { children: any[] }> = {}
  flat.forEach((c) => (map[c.id] = { ...c, children: [] }))
  const roots: any[] = []
  flat.forEach((c) => {
    if (c.parent_id && map[c.parent_id]) {
      map[c.parent_id].children.push(map[c.id])
    } else {
      roots.push(map[c.id])
    }
  })
  const result: FlatRow[] = []
  function traverse(nodes: any[], depth: number) {
    for (const node of nodes) {
      const hasChildren = node.children.length > 0
      result.push({ item: node, depth, hasChildren })
      if (hasChildren && expandedIds.has(node.id)) {
        traverse(node.children, depth + 1)
      }
    }
  }
  traverse(roots, 0)
  return result
}

// ── Schema ─────────────────────────────────────────────────────────────────

const schema = z.object({
  name:       z.string().min(1, 'Nhập tên danh mục'),
  short_code: z.string().min(1, 'Nhập mã viết tắt'),
  parent_id:  z.string().optional(),
  is_active:  z.boolean(),
})
type CategoryForm = z.infer<typeof schema>

// ── Component ──────────────────────────────────────────────────────────────

export default function CategoriesPage() {
  usePageNoPadding()
  const { data, isLoading, createMutation, updateMutation, deleteMutation, buildParentOptions } =
    useCategories()

  const [dialogOpen, setDialogOpen]     = useState(false)
  const [editing, setEditing]           = useState<any | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [expandedIds, setExpandedIds]   = useState<Set<string>>(new Set())
  const [selectedId, setSelectedId]     = useState<string | null>(null)
  const [mobileDetail, setMobileDetail] = useState(false)

  // Auto-expand all categories on first load
  useEffect(() => {
    if (data?.length) {
      setExpandedIds(new Set(data.map((c: any) => c.id)))
    }
  }, [data])

  const form = useForm<CategoryForm>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', short_code: '', parent_id: '', is_active: true },
  })

  // Auto-fill short_code when name changes and short_code is still empty
  const watchedName = form.watch('name')
  useEffect(() => {
    const current = form.getValues('short_code')
    if (watchedName && !current) {
      form.setValue('short_code', generateShortCode(watchedName))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedName])

  function openCreate() {
    setEditing(null)
    form.reset({ name: '', short_code: '', parent_id: '', is_active: true })
    setDialogOpen(true)
  }

  function openEdit(record: any) {
    setEditing(record)
    form.reset({
      name:       record.name,
      short_code: record.short_code ?? '',
      parent_id:  record.parent_id ?? '',
      is_active:  record.is_active ?? true,
    })
    setDialogOpen(true)
  }

  function onSubmit(values: CategoryForm) {
    const payload = { ...values, parent_id: values.parent_id || null }
    if (editing) {
      updateMutation.mutate(
        { id: editing.id, ...payload },
        { onSuccess: () => setDialogOpen(false) },
      )
    } else {
      createMutation.mutate(payload, { onSuccess: () => setDialogOpen(false) })
    }
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Rows to display: flat-filtered when searching, tree-structured otherwise
  const flat = data ?? []
  const filteredFlat = flat.filter((c: any) => {
    if (statusFilter === 'active')   return c.is_active
    if (statusFilter === 'inactive') return !c.is_active
    return true
  })
  const flatRows: FlatRow[] = search
    ? filteredFlat
        .filter((c: any) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          (c.short_code ?? '').toLowerCase().includes(search.toLowerCase()),
        )
        .map((item: any) => ({ item, depth: 0, hasChildren: false }))
    : buildFlatRows(filteredFlat, expandedIds)

  const parentOptions = buildParentOptions(flat, editing?.id)
  const selected = flat.find((c: any) => c.id === selectedId) ?? null
  const selectedParentName = selected?.parent_id
    ? flat.find((c: any) => c.id === selected.parent_id)?.name
    : null

  useEffect(() => {
    if (flatRows.length === 0) { setSelectedId(null); return }
    if (!selectedId || !flatRows.some((r) => r.item.id === selectedId)) setSelectedId(flatRows[0].item.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flatRows])

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="theme-2a flex h-full min-h-0 flex-col bg-background p-6">

      <div className="kv-head">
        <div>
          <h1 className="kv-title">Danh mục sản phẩm</h1>
          <p className="kv-sub">{flat.length.toLocaleString('vi-VN')} danh mục và phân loại sản phẩm</p>
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
            ) : flatRows.length === 0 ? (
              <li className="kv-muted" style={{ padding: '32px 14px', textAlign: 'center', fontSize: 12 }}>
                {search ? 'Không tìm thấy kết quả.' : 'Chưa có danh mục nào.'}
              </li>
            ) : (
              flatRows.map(({ item, depth, hasChildren }) => (
                <li key={item.id}>
                  <a
                    className="kv-md-item"
                    aria-current={item.id === selectedId}
                    style={{ opacity: item.is_active ? undefined : 0.5, paddingLeft: 14 + depth * 20 }}
                    onClick={() => { setSelectedId(item.id); setMobileDetail(true) }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
                      {hasChildren ? (
                        <span
                          role="button"
                          onClick={(e) => { e.stopPropagation(); toggleExpand(item.id) }}
                          style={{ display: 'flex', flexShrink: 0, borderRadius: 4, padding: 1, color: 'var(--text-2)' }}
                        >
                          {expandedIds.has(item.id)
                            ? <ChevronDown className="h-3.5 w-3.5" />
                            : <ChevronRight className="h-3.5 w-3.5" />}
                        </span>
                      ) : (
                        <span style={{ width: 14, flexShrink: 0 }} />
                      )}
                      <div style={{ minWidth: 0 }}>
                        <div className="kv-cell-title truncate">{item.name}</div>
                        <div className="kv-cell-sub mono" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          {item.short_code}
                          {!item.is_active && <span>· Ngừng</span>}
                        </div>
                      </div>
                    </div>
                  </a>
                </li>
              ))
            )}
          </ul>

          <div className="kv-md-foot">{flat.length} danh mục</div>
        </div>

        {/* Detail */}
        {!selected ? (
          <div className="kv-md-detail flex items-center justify-center">
            <p className="kv-muted" style={{ fontSize: 13 }}>Chọn 1 danh mục bên trái để xem chi tiết.</p>
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
                {selected.short_code && <div className="kv-cell-sub mono" style={{ marginTop: 4 }}>{selected.short_code}</div>}
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
                <div><dt>Danh mục cha</dt><dd>{selectedParentName ?? <span className="kv-empty">Không có (danh mục gốc)</span>}</dd></div>
                <div>
                  <dt>Trạng thái</dt>
                  <dd>
                    <StatusToggle
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

      {/* ── Create / Edit Sheet ───────────────────────────────────── */}
      <Sheet open={dialogOpen} onOpenChange={(o) => !o && setDialogOpen(false)}>
        <SheetContent side="right" className="theme-2a w-96 flex flex-col gap-0" showCloseButton={false}>
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">
            {editing ? editing.name : 'Tạo danh mục mới'}
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
                    <FormLabel>Tên danh mục</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="VD: Switch"
                        {...field}
                        onChange={(e) => {
                          const v = e.target.value
                          field.onChange(v.charAt(0).toUpperCase() + v.slice(1))
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="short_code" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mã viết tắt</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="VD: SW"
                        className="font-mono"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      />
                    </FormControl>
                    <FormDescription>Tự sinh từ tên, có thể sửa. Dùng để gợi ý mã sản phẩm.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="parent_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Danh mục cha (tuỳ chọn)</FormLabel>
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Không có (danh mục gốc)">
                            {field.value
                              ? (parentOptions.find(o => o.value === field.value)?.label ?? '—')
                              : 'Không có (danh mục gốc)'}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="theme-2a">
                        <SelectItem value="">Không có (danh mục gốc)</SelectItem>
                        {parentOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

      {/* ── Delete confirmation ──────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="theme-2a">
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá danh mục?</AlertDialogTitle>
            <AlertDialogDescription>
              Danh mục{' '}
              <strong className="text-foreground">{deleteTarget?.name}</strong>{' '}
              sẽ bị xoá vĩnh viễn. Không thể xoá nếu đang có sản phẩm hoặc danh mục con.
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
