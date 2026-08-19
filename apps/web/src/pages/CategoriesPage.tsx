import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronRight, ChevronDown, Plus, Pencil, Trash2, Search, X } from 'lucide-react'

import { useCategories } from '@/hooks/useCategories'
import { PageHeader } from '@/components/ui/PageHeader'
import { TableCard } from '@/components/ui/TableCard'
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
import { CodeText } from '@/components/ui/CodeText'

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
  const { data, isLoading, createMutation, updateMutation, deleteMutation, buildParentOptions } =
    useCategories()

  const [dialogOpen, setDialogOpen]     = useState(false)
  const [editing, setEditing]           = useState<any | null>(null)
  const [isViewing, setIsViewing]       = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [expandedIds, setExpandedIds]   = useState<Set<string>>(new Set())

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
    setIsViewing(false)
    form.reset({ name: '', short_code: '', parent_id: '', is_active: true })
    setDialogOpen(true)
  }

  function openEdit(record: any) {
    setEditing(record)
    setIsViewing(true)
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

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">

      <PageHeader
        title="Danh mục sản phẩm"
        meta="Quản lý danh mục và phân loại sản phẩm"
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Tạo mới
          </Button>
        }
      />

      <TableCard
        toolbar={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tìm tên, mã viết tắt…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-64 rounded-lg border-border pl-9 text-sm shadow-none focus-visible:ring-1"
              />
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-0.5">
              {(['all', 'active', 'inactive'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                    statusFilter === f
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {f === 'all' ? 'Tất cả' : f === 'active' ? 'Hoạt động' : 'Ngừng'}
                  {f !== 'all' && (
                    <span className="ml-1 tabular-nums text-muted-foreground">
                      {flat.filter((c: any) => f === 'active' ? c.is_active : !c.is_active).length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        }
        actions={
          <span className="text-sm text-muted-foreground">{flatRows.length} kết quả</span>
        }
      >
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Tên
              </th>
              <th className="w-32 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Mã viết tắt
              </th>
              <th className="w-36 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Trạng thái
              </th>
              <th className="w-28 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Ngày tạo
              </th>
              <th className="w-36 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Người tạo
              </th>
              <th className="w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-xs text-muted-foreground">
                  Đang tải…
                </td>
              </tr>
            ) : flatRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-xs text-muted-foreground">
                  {search ? 'Không tìm thấy kết quả.' : 'Chưa có danh mục nào.'}
                </td>
              </tr>
            ) : (
              flatRows.map(({ item, depth, hasChildren }) => (
                <tr
                  key={item.id}
                  onClick={() => openEdit(item)}
                  className={cn(
                    'group/row cursor-pointer transition-colors hover:bg-muted/40',
                    !item.is_active && 'opacity-50',
                  )}
                >
                  {/* Name — indented by depth */}
                  <td className="px-4 py-2">
                    <div
                      className="flex items-center gap-1"
                      style={{ paddingLeft: depth * 24 }}
                    >
                      {hasChildren ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleExpand(item.id) }}
                          className="flex-shrink-0 rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                        >
                          {expandedIds.has(item.id)
                            ? <ChevronDown className="h-4 w-4" />
                            : <ChevronRight className="h-4 w-4" />}
                        </button>
                      ) : (
                        <span className="w-5 flex-shrink-0" />
                      )}
                      <span className="font-medium text-foreground">{item.name}</span>
                    </div>
                  </td>

                  {/* Short code */}
                  <td className="px-4 py-2">
                    {item.short_code ? (
                      <CodeText>{item.short_code}</CodeText>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>

                  {/* Status badge */}
                  <td className="px-4 py-2">
                    <div className="flex justify-center">
                      <span className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
                        item.is_active
                          ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300'
                          : 'bg-zinc-200 text-zinc-600 ring-1 ring-zinc-300',
                      )}>
                        <span className={cn(
                          'h-1.5 w-1.5 rounded-full',
                          item.is_active ? 'bg-emerald-500' : 'bg-zinc-400',
                        )} />
                        {item.is_active ? 'Hoạt động' : 'Ngừng'}
                      </span>
                    </div>
                  </td>

                  {/* Created at */}
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {item.created_at
                      ? new Date(item.created_at).toLocaleDateString('vi-VN')
                      : '—'}
                  </td>

                  {/* Created by */}
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {item.created_by_name ?? '—'}
                  </td>

                  {/* Actions — hover reveal */}
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover/row:opacity-100">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(item) }}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(item) }}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {flatRows.length > 0 && (
          <div className="border-t border-border px-4 py-2.5">
            <span className="text-xs text-muted-foreground">{flat.length} danh mục</span>
          </div>
        )}
      </TableCard>

      {/* ── View / Create / Edit Sheet ───────────────────────────────────── */}
      {dialogOpen && <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={() => setDialogOpen(false)}
      />}
      {dialogOpen && <div
        className="fixed right-0 top-0 z-50 flex h-full w-96 flex-col bg-background shadow-xl animate-in slide-in-from-right duration-200"
      >
        {/* header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">
            {editing ? editing.name : 'Tạo danh mục mới'}
          </h2>
          <div className="flex items-center gap-1">
            {isViewing && (
              <Button size="sm" variant="outline" onClick={() => setIsViewing(false)}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" />Chỉnh sửa
              </Button>
            )}
            <button
              onClick={() => setDialogOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {isViewing && editing ? (
          /* ── View mode ── */
          <div className="flex-1 overflow-y-auto px-5 py-5">
            <div className="flex flex-col gap-5">
              <SheetField label="Tên danh mục">{editing.name}</SheetField>
              <SheetField label="Mã viết tắt"><CodeText>{editing.short_code || '—'}</CodeText></SheetField>
              <SheetField label="Danh mục cha">
                {editing.parent_id
                  ? (parentOptions.find((o: any) => o.value === editing.parent_id)?.label ?? '—')
                  : <span className="text-muted-foreground">Không có (danh mục gốc)</span>}
              </SheetField>
              <SheetField label="Trạng thái">
                <span className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
                  editing.is_active
                    ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300'
                    : 'bg-zinc-200 text-zinc-600 ring-1 ring-zinc-300',
                )}>
                  <span className={cn('h-1.5 w-1.5 rounded-full', editing.is_active ? 'bg-emerald-500' : 'bg-zinc-400')} />
                  {editing.is_active ? 'Hoạt động' : 'Ngừng'}
                </span>
              </SheetField>
            </div>
          </div>
        ) : (
          /* ── Create / Edit mode ── */
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
                        <SelectContent>
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
                <Button type="button" variant="outline" onClick={() => editing ? setIsViewing(true) : setDialogOpen(false)}>
                  Huỷ
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editing ? 'Lưu thay đổi' : 'Tạo mới'}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </div>}

      {/* ── Delete confirmation ──────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
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
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
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

function SheetField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm text-foreground">{children}</div>
    </div>
  )
}
