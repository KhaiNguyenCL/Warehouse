import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'

import { useWarehouses } from '@/hooks/useWarehouses'
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
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

// ── Schema ─────────────────────────────────────────────────────────────────

const schema = z.object({
  code:        z.string().min(1, 'Nhập mã kho'),
  name:        z.string().min(1, 'Nhập tên kho'),
  type:        z.enum(['physical', 'virtual']),
  address:     z.string().optional(),
  description: z.string().optional(),
  manager_id:  z.string().optional(),
  is_default:  z.boolean(),
  is_active:   z.boolean(),
})
type WarehouseForm = z.infer<typeof schema>

// ── Component ──────────────────────────────────────────────────────────────

export default function WarehousesPage() {
  const { data, isLoading, users, createMutation, updateMutation, deleteMutation } = useWarehouses()

  const [dialogOpen, setDialogOpen]     = useState(false)
  const [editing, setEditing]           = useState<any | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [search, setSearch]             = useState('')

  const form = useForm<WarehouseForm>({
    resolver: zodResolver(schema),
    defaultValues: { code: '', name: '', type: 'physical', address: '', description: '', manager_id: '', is_default: false, is_active: true },
  })

  function openCreate() {
    setEditing(null)
    form.reset({ code: '', name: '', type: 'physical', address: '', description: '', manager_id: '', is_default: false, is_active: true })
    setDialogOpen(true)
  }

  function openEdit(record: any) {
    setEditing(record)
    form.reset({
      code:        record.code        ?? '',
      name:        record.name        ?? '',
      type:        record.type        ?? 'physical',
      address:     record.address     ?? '',
      description: record.description ?? '',
      manager_id:  record.manager_id  ?? '',
      is_default:  record.is_default  ?? false,
      is_active:   record.is_active   ?? true,
    })
    setDialogOpen(true)
  }

  function onSubmit(values: WarehouseForm) {
    // Strip empty optional strings so API doesn't receive empty ""
    const payload: any = { ...values }
    if (!payload.address)     delete payload.address
    if (!payload.description) delete payload.description
    if (!payload.manager_id)  delete payload.manager_id

    if (editing) {
      updateMutation.mutate({ id: editing.id, ...payload }, { onSuccess: () => setDialogOpen(false) })
    } else {
      createMutation.mutate(payload, { onSuccess: () => setDialogOpen(false) })
    }
  }

  const warehouses: any[] = data ?? []
  const filtered = warehouses.filter((r) =>
    !search ||
    r.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.code?.toLowerCase().includes(search.toLowerCase()),
  )

  const userList: any[] = users?.data ?? []

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kho hàng</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Quản lý danh sách kho vật lý và kho ảo
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Tạo kho
        </Button>
      </div>

      {/* Table card */}
      <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">

        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm tên, mã kho…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-80 rounded-lg border-border pl-9 text-sm shadow-none focus-visible:ring-1"
            />
          </div>
          <span className="text-sm text-muted-foreground">{filtered.length} kết quả</span>
        </div>

        {/* Table */}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="w-12 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">#</th>
              <th className="w-28 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mã</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tên</th>
              <th className="w-28 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Loại</th>
              <th className="w-24 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mặc định</th>
              <th className="w-40 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quản lý</th>
              <th className="w-20 px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  Đang tải…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  {search ? 'Không tìm thấy kết quả.' : 'Chưa có kho nào.'}
                </td>
              </tr>
            ) : (
              filtered.map((row, i) => (
                <tr
                  key={row.id}
                  onClick={() => openEdit(row)}
                  className="group/row cursor-pointer transition-colors hover:bg-muted/40"
                >
                  <td className="px-4 py-3 text-center text-xs text-muted-foreground">{i + 1}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-md border border-border bg-muted/60 px-2 py-0.5 font-mono text-xs font-medium text-foreground">
                      {row.code}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">{row.name}</td>
                  <td className="px-4 py-3">
                    <TypeBadge type={row.type} />
                  </td>
                  <td className="px-4 py-3">
                    {row.is_default && (
                      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Mặc định
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {userList.find((u) => u.id === row.manager_id)?.full_name ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover/row:opacity-100">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(row) }}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(row) }}
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

        {/* Footer */}
        {filtered.length > 0 && (
          <div className="border-t border-border px-4 py-2.5">
            <span className="text-xs text-muted-foreground">{filtered.length} kho</span>
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? `Sửa kho "${editing.name}"` : 'Tạo kho mới'}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 py-2">

              {/* Code */}
              <FormField control={form.control} name="code" render={({ field }) => (
                <FormItem>
                  <FormLabel>Mã kho</FormLabel>
                  <FormControl>
                    <Input placeholder="VD: WH-01" className="font-mono" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Name */}
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên kho</FormLabel>
                  <FormControl>
                    <Input placeholder="VD: Kho chính Hà Nội" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Type */}
              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Loại kho</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn loại kho" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="physical">Vật lý</SelectItem>
                      <SelectItem value="virtual">Ảo (Demo / Bảo hành / Chờ QC…)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Address */}
              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem>
                  <FormLabel>Địa chỉ</FormLabel>
                  <FormControl>
                    <Input placeholder="Địa chỉ kho" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Description */}
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Mô tả</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Mô tả thêm về kho…" rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Manager */}
              <FormField control={form.control} name="manager_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Người quản lý</FormLabel>
                  <Select value={field.value ?? ''} onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Không chỉ định" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">Không chỉ định</SelectItem>
                      {userList.map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              {/* is_default */}
              <FormField control={form.control} name="is_default" render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <FormLabel className="cursor-pointer text-sm font-normal">
                      Kho mặc định
                    </FormLabel>
                    <FormDescription className="mt-0.5 text-xs">
                      Tự động chọn khi tạo phiếu
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )} />

              {/* is_active — only when editing */}
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
                  {editing ? 'Lưu thay đổi' : 'Tạo kho'}
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
            <AlertDialogTitle>Xoá kho?</AlertDialogTitle>
            <AlertDialogDescription>
              Kho <strong className="text-foreground">{deleteTarget?.name}</strong> sẽ bị xoá.
              Không thể xoá nếu kho đang có hàng hoặc được tham chiếu bởi phiếu nhập/xuất/chuyển.
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

// ── Type badge ─────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: string }) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
      type === 'physical'
        ? 'border-blue-200 bg-blue-50 text-blue-700'
        : 'border-orange-200 bg-orange-50 text-orange-700',
    )}>
      {type === 'physical' ? 'Vật lý' : 'Ảo'}
    </span>
  )
}
