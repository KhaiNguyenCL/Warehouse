import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronRight, ChevronDown, Plus, Pencil, Trash2, Search } from 'lucide-react'

import { useCategories } from '@/hooks/useCategories'
import { PageHeader } from '@/components/ui/PageHeader'
import { TableCard } from '@/components/ui/TableCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
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
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [search, setSearch]             = useState('')
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
  const flatRows: FlatRow[] = search
    ? flat
        .filter((c: any) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          (c.short_code ?? '').toLowerCase().includes(search.toLowerCase()),
        )
        .map((item: any) => ({ item, depth: 0, hasChildren: false }))
    : buildFlatRows(flat, expandedIds)

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
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm tên, mã viết tắt…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-80 rounded-lg border-border pl-9 text-sm shadow-none focus-visible:ring-1"
            />
          </div>
        }
        actions={
          <span className="text-sm text-muted-foreground">{flatRows.length} kết quả</span>
        }
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Tên
              </th>
              <th className="w-32 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Mã viết tắt
              </th>
              <th className="w-36 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  Đang tải…
                </td>
              </tr>
            ) : flatRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  {search ? 'Không tìm thấy kết quả.' : 'Chưa có danh mục nào.'}
                </td>
              </tr>
            ) : (
              flatRows.map(({ item, depth, hasChildren }) => (
                <tr
                  key={item.id}
                  onClick={() => openEdit(item)}
                  className="group/row cursor-pointer transition-colors hover:bg-muted/40"
                >
                  {/* Name — indented by depth */}
                  <td className="px-4 py-3">
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
                  <td className="px-4 py-3">
                    {item.short_code ? (
                      <span className="inline-flex items-center rounded-md border border-border bg-muted/60 px-2 py-0.5 font-mono text-xs font-medium text-foreground">
                        {item.short_code}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>

                  {/* Status badge */}
                  <td className="px-4 py-3">
                    <span className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
                      item.is_active
                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                        : 'bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200',
                    )}>
                      <span className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        item.is_active ? 'bg-emerald-500' : 'bg-zinc-400',
                      )} />
                      {item.is_active ? 'Hoạt động' : 'Ngừng'}
                    </span>
                  </td>

                  {/* Created at */}
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {item.created_at
                      ? new Date(item.created_at).toLocaleDateString('vi-VN')
                      : '—'}
                  </td>

                  {/* Created by */}
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {item.created_by_name ?? '—'}
                  </td>

                  {/* Actions — hover reveal */}
                  <td className="px-4 py-3">
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

      {/* ── Create / Edit Dialog ─────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? `Sửa danh mục "${editing.name}"` : 'Tạo danh mục mới'}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 py-2">

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
                  <FormDescription>
                    Tự sinh từ tên, có thể sửa. Dùng để gợi ý mã sản phẩm.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="parent_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Danh mục cha (tuỳ chọn)</FormLabel>
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Không có (danh mục gốc)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">Không có (danh mục gốc)</SelectItem>
                      {parentOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              {editing && (
                <FormField control={form.control} name="is_active" render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border border-border p-3">
                    <FormLabel className="cursor-pointer text-sm font-normal">
                      Hoạt động
                    </FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )} />
              )}

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Huỷ
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editing ? 'Lưu thay đổi' : 'Tạo mới'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

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
