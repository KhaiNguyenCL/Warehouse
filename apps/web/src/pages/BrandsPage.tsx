import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  getFilteredRowModel, flexRender,
  type ColumnDef, type SortingState,
} from '@tanstack/react-table'
import { Plus, Pencil, Trash2, ChevronsUpDown, ChevronUp, ChevronDown, Search } from 'lucide-react'

import { useBrands } from '@/hooks/useBrands'
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
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

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
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [search, setSearch]             = useState('')
  const [sorting, setSorting]           = useState<SortingState>([])

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

  // ── Columns ──────────────────────────────────────────────────────────────

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => <ColHeader column={column} label="Tên hãng" />,
      cell: ({ getValue }) => (
        <span className="font-medium text-foreground">{getValue<string>()}</span>
      ),
    },
    {
      accessorKey: 'short_code',
      header: ({ column }) => <ColHeader column={column} label="Mã viết tắt" />,
      size: 160,
      cell: ({ getValue }) => (
        <span className="inline-flex items-center rounded-md border border-border bg-muted/60 px-2 py-0.5 font-mono text-xs font-medium text-foreground">
          {getValue<string>()}
        </span>
      ),
    },
    {
      accessorKey: 'is_active',
      header: 'Trạng thái',
      size: 140,
      cell: ({ getValue }) => (
        <span className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
          getValue<boolean>()
            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
            : 'bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200',
        )}>
          <span className={cn(
            'h-1.5 w-1.5 rounded-full',
            getValue<boolean>() ? 'bg-emerald-500' : 'bg-zinc-400',
          )} />
          {getValue<boolean>() ? 'Hoạt động' : 'Ngừng'}
        </span>
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
  ]

  const table = useReactTable({
    data: data ?? [],
    columns,
    state: { globalFilter: search, sorting },
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
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm tên, mã viết tắt…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-80 rounded-lg border-border pl-9 text-sm shadow-none focus-visible:ring-1"
            />
          </div>
          <span className="text-sm text-muted-foreground">
            {table.getFilteredRowModel().rows.length} kết quả
          </span>
        </div>

        {/* Table */}
        <table className="w-full text-sm">
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
                <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  Đang tải…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  {search ? 'Không tìm thấy kết quả.' : 'Chưa có thương hiệu nào.'}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => openEdit(row.original)}
                  className="group/row cursor-pointer transition-colors hover:bg-muted/40"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
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

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? `Sửa hãng "${editing.name}"` : 'Tạo thương hiệu mới'}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 py-2">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên hãng</FormLabel>
                  <FormControl>
                    <Input placeholder="VD: Cisco" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="short_code" render={({ field }) => (
                <FormItem>
                  <FormLabel>Mã viết tắt</FormLabel>
                  <FormControl>
                    <Input placeholder="VD: CSC" className="font-mono" {...field} />
                  </FormControl>
                  <FormDescription>Dùng để gợi ý mã sản phẩm</FormDescription>
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
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editing ? 'Lưu thay đổi' : 'Tạo mới'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

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

// ── Sort column header ──────────────────────────────────────────────────────

function ColHeader({ column, label }: { column: any; label: string }) {
  const sorted = column.getIsSorted()
  return (
    <button
      onClick={() => column.toggleSorting(sorted === 'asc')}
      className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
    >
      {label}
      {sorted === 'asc'  ? <ChevronUp className="h-3 w-3" /> :
       sorted === 'desc' ? <ChevronDown className="h-3 w-3" /> :
                           <ChevronsUpDown className="h-3 w-3 opacity-50" />}
    </button>
  )
}
