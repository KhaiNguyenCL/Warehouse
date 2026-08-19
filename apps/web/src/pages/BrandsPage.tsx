import React, { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  getFilteredRowModel, flexRender,
  type ColumnDef, type SortingState,
} from '@tanstack/react-table'
import { Plus, Pencil, Trash2, ChevronsUpDown, ChevronUp, ChevronDown, Search, X } from 'lucide-react'

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
import { CodeText } from '@/components/ui/CodeText'

// ── Schema ─────────────────────────────────────────────────────────────────

const schema = z.object({
  name:       z.string().min(1, 'Nhập tên hãng'),
  short_code: z.string().min(1, 'Nhập mã viết tắt'),
  is_active:  z.boolean(),
})
type BrandForm = z.infer<typeof schema>

// ── Component ──────────────────────────────────────────────────────────────

export default function BrandsPage() {
  const { data, isLoading, createMutation, updateMutation, deleteMutation } = useBrands()

  const [dialogOpen, setDialogOpen]     = useState(false)
  const [editing, setEditing]           = useState<any | null>(null)
  const [isViewing, setIsViewing]       = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [sorting, setSorting]           = useState<SortingState>([])

  const form = useForm<BrandForm>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', short_code: '', is_active: true },
  })

  function openCreate() {
    setEditing(null)
    setIsViewing(false)
    form.reset({ name: '', short_code: '', is_active: true })
    setDialogOpen(true)
  }

  function openEdit(record: any) {
    setEditing(record)
    setIsViewing(true)
    form.reset({ name: record.name, short_code: record.short_code, is_active: record.is_active ?? true })
    setDialogOpen(true)
  }

  function startEdit() {
    setIsViewing(false)
  }

  function onSubmit(values: BrandForm) {
    if (editing) {
      updateMutation.mutate({ id: editing.id, ...values }, { onSuccess: () => setDialogOpen(false) })
    } else {
      createMutation.mutate(values, { onSuccess: () => setDialogOpen(false) })
    }
  }

  // ── Columns ──────────────────────────────────────────────────────────────

  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: 'name',
      header: ({ column }) => <ColHeader column={column} label="Tên hãng" labelClassName="text-xs" />,
      cell: ({ getValue }) => (
        <span className="font-medium text-foreground">{getValue<string>()}</span>
      ),
    },
    {
      accessorKey: 'short_code',
      header: ({ column }) => <ColHeader column={column} label="Mã viết tắt" />,
      size: 160,
      cell: ({ getValue }) => (
        <CodeText>{getValue<string>()}</CodeText>
      ),
    },
    {
      accessorKey: 'is_active',
      header: () => <div className="flex justify-center">Trạng thái</div>,
      size: 140,
      cell: ({ getValue }) => (
        <div className="flex justify-center">
          <span className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
            getValue<boolean>()
              ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300'
              : 'bg-zinc-200 text-zinc-600 ring-1 ring-zinc-300',
          )}>
            <span className={cn(
              'h-1.5 w-1.5 rounded-full',
              getValue<boolean>() ? 'bg-emerald-500' : 'bg-zinc-400',
            )} />
            {getValue<boolean>() ? 'Hoạt động' : 'Ngừng'}
          </span>
        </div>
      ),
    },
    {
      id: 'actions',
      size: 90,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover/row:opacity-100">
          <button
            onClick={(e) => { e.stopPropagation(); openEdit(row.original) }}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(row.original) }}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ], [])

  const allBrands = data ?? []
  const filteredData = useMemo(() =>
    allBrands.filter((b: any) => {
      if (statusFilter === 'active')   return b.is_active
      if (statusFilter === 'inactive') return !b.is_active
      return true
    }),
    [allBrands, statusFilter]
  )

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { globalFilter: search, sorting },
    onGlobalFilterChange: setSearch,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  const rows = table.getRowModel().rows

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Thương hiệu</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Quản lý danh sách hãng sản xuất
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Tạo mới
        </Button>
      </div>

      {/* Table card */}
      <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">

        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
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
                      {allBrands.filter((b: any) => f === 'active' ? b.is_active : !b.is_active).length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
          <span className="text-sm text-muted-foreground">
            {table.getFilteredRowModel().rows.length} kết quả
          </span>
        </div>

        {/* Table */}
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-border bg-muted/40">
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    style={{ width: header.column.getSize() !== 150 ? header.column.getSize() : undefined }}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-xs text-muted-foreground">
                  Đang tải…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-xs text-muted-foreground">
                  {search ? 'Không tìm thấy kết quả.' : 'Chưa có thương hiệu nào.'}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => openEdit(row.original)}
                  className={cn(
                    'group/row cursor-pointer transition-colors hover:bg-muted/40',
                    !row.original.is_active && 'opacity-50',
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Footer */}
        {rows.length > 0 && (
          <div className="border-t border-border px-4 py-2.5">
            <span className="text-xs text-muted-foreground">
              {rows.length} thương hiệu
            </span>
          </div>
        )}
      </div>

      {/* View / Create / Edit Sheet */}
      {dialogOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 transition-opacity duration-200"
            onClick={() => setDialogOpen(false)}
          />
          <div className="fixed right-0 top-0 z-50 flex h-full w-96 flex-col bg-background shadow-xl animate-in slide-in-from-right duration-200">
            {/* header */}
            <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-base font-semibold text-foreground">
                {editing ? editing.name : 'Tạo thương hiệu mới'}
              </h2>
              <div className="flex items-center gap-1">
                {isViewing && (
                  <Button size="sm" variant="outline" onClick={startEdit}>
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
                  <SheetField label="Tên hãng">{editing.name}</SheetField>
                  <SheetField label="Mã viết tắt"><CodeText>{editing.short_code}</CodeText></SheetField>
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
          </div>
        </>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
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

// ── Sheet view-mode field ────────────────────────────────────────────────────

function SheetField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm text-foreground">{children}</div>
    </div>
  )
}

// ── Sort column header ──────────────────────────────────────────────────────

function ColHeader({ column, label, labelClassName }: { column: any; label: string; labelClassName?: string }) {
  const sorted = column.getIsSorted()
  return (
    <button
      onClick={() => column.toggleSorting(sorted === 'asc')}
      className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
    >
      <span className={labelClassName}>{label}</span>
      {sorted === 'asc'  ? <ChevronUp className="h-3 w-3" /> :
       sorted === 'desc' ? <ChevronDown className="h-3 w-3" /> :
                           <ChevronsUpDown className="h-3 w-3 opacity-50" />}
    </button>
  )
}
