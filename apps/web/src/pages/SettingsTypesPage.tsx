import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, X, Shield } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import { api } from '../lib/api'
import { useApiMutation } from '../hooks/useApiMutation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription,
} from '@/components/ui/form'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'

// ── Constants ────────────────────────────────────────────────────────────────

const REQUIRES_COMPANY_OPTS = [
  { value: 'none',     label: 'Không cần' },
  { value: 'customer', label: 'Khách hàng' },
  { value: 'supplier', label: 'NCC' },
]

const REQUIRES_REF_OPTS = [
  { value: 'none',             label: 'Không cần' },
  { value: 'quotation',        label: 'Quotation' },
  { value: 'stocktake_result', label: 'Stocktake Result' },
]

// ── Shared sub-components ────────────────────────────────────────────────────

function SectionHeader({ title, onAdd }: { title: string; onAdd: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
      <Button size="sm" onClick={onAdd}>
        <Plus className="h-4 w-4" />
        Tạo mới
      </Button>
    </div>
  )
}

function YesNoBadge({ value }: { value: boolean }) {
  return value ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-300">
      Có
    </span>
  ) : (
    <span className="text-muted-foreground text-xs">—</span>
  )
}

function ActiveBadge({ value }: { value: boolean }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
      value
        ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300'
        : 'bg-red-100 text-red-700 ring-1 ring-red-200',
    )}>
      <span className={cn('h-1.5 w-1.5 rounded-full', value ? 'bg-emerald-500' : 'bg-red-500')} />
      {value ? 'Hoạt động' : 'Ngừng'}
    </span>
  )
}

// ── Import Types ─────────────────────────────────────────────────────────────

const importSchema = z.object({
  key:                   z.string().min(1, 'Nhập key'),
  label:                 z.string().min(1, 'Nhập tên hiển thị'),
  parent_key:            z.string().optional(),
  requires_company:      z.string(),
  requires_ref_document: z.string(),
  is_active:             z.boolean(),
})
type ImportForm = z.infer<typeof importSchema>

function ImportTypesSection() {
  const [sheetOpen, setSheetOpen]     = useState(false)
  const [editing, setEditing]         = useState<any | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)

  const { data, isLoading } = useQuery<any[]>({
    queryKey: ['import-types'],
    queryFn: async () => (await api.get('/settings/import-types')).data,
  })

  const form = useForm<ImportForm>({
    resolver: zodResolver(importSchema),
    defaultValues: { key: '', label: '', parent_key: '', requires_company: 'none', requires_ref_document: 'none', is_active: true },
  })

  const createMutation = useApiMutation(
    (v: any) => api.post('/settings/import-types', v),
    { successMessage: 'Tạo thành công', invalidateKey: ['import-types'], onSuccess: () => setSheetOpen(false) },
  )
  const updateMutation = useApiMutation(
    (v: any) => api.patch(`/settings/import-types/${editing?.id}`, v),
    { successMessage: 'Cập nhật thành công', invalidateKey: ['import-types'], onSuccess: () => setSheetOpen(false) },
  )
  const deleteMutation = useApiMutation(
    (id: string) => api.delete(`/settings/import-types/${id}`),
    { successMessage: 'Đã xoá', invalidateKey: ['import-types'] },
  )

  function openCreate() {
    setEditing(null)
    form.reset({ key: '', label: '', parent_key: '', requires_company: 'none', requires_ref_document: 'none', is_active: true })
    setSheetOpen(true)
  }

  function openEdit(r: any) {
    setEditing(r)
    form.reset({
      key: r.key ?? '',
      label: r.label ?? '',
      parent_key: r.parent_key ?? '',
      requires_company: r.requires_company ?? 'none',
      requires_ref_document: r.requires_ref_document ?? 'none',
      is_active: r.is_active ?? true,
    })
    setSheetOpen(true)
  }

  function onSubmit(values: ImportForm) {
    if (editing) updateMutation.mutate(values)
    else createMutation.mutate(values)
  }

  const rows: any[] = data ?? []

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader title="Loại nhập kho" onAdd={openCreate} />

      <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="w-10 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">#</th>
              <th className="w-40 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mã key</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tên hiển thị</th>
              <th className="w-32 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cần đối tác</th>
              <th className="w-36 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cần tham chiếu</th>
              <th className="w-32 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trạng thái</th>
              <th className="w-24 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Hệ thống</th>
              <th className="w-12 px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-xs text-muted-foreground">Đang tải…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-xs text-muted-foreground">Chưa có loại nhập nào.</td></tr>
            ) : rows.map((r, i) => (
              <tr key={r.id} onClick={() => openEdit(r)} className="group/row cursor-pointer transition-colors hover:bg-muted/40">
                <td className="px-4 py-2.5 text-muted-foreground">{i + 1}</td>
                <td className="px-4 py-2.5 font-mono text-sm text-foreground">{r.key}</td>
                <td className="px-4 py-2.5 font-medium text-foreground">{r.label}</td>
                <td className="px-4 py-2.5 text-foreground">{REQUIRES_COMPANY_OPTS.find(o => o.value === r.requires_company)?.label ?? r.requires_company}</td>
                <td className="px-4 py-2.5 text-foreground">{REQUIRES_REF_OPTS.find(o => o.value === r.requires_ref_document)?.label ?? r.requires_ref_document}</td>
                <td className="px-4 py-2.5"><div className="flex justify-center"><ActiveBadge value={r.is_active} /></div></td>
                <td className="px-4 py-2.5">
                  <div className="flex justify-center">
                    {r.is_system ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-blue-200">
                        <Shield className="h-3 w-3" /> Hệ thống
                      </span>
                    ) : <span className="text-muted-foreground">—</span>}
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  {!r.is_system && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(r) }}
                      className="hidden rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 group-hover/row:block"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length > 0 && (
          <div className="border-t border-border px-4 py-2.5">
            <span className="text-xs text-muted-foreground">{rows.length} loại nhập</span>
          </div>
        )}
      </div>

      {/* Sheet */}
      <div className={cn('fixed inset-0 z-40 bg-black/30 transition-opacity duration-200', sheetOpen ? 'opacity-100' : 'pointer-events-none opacity-0')} onClick={() => setSheetOpen(false)} />
      <div className={cn('fixed right-0 top-0 z-50 flex h-full w-[440px] flex-col bg-background shadow-xl transition-transform duration-200', sheetOpen ? 'translate-x-0' : 'translate-x-full')}>
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">{editing ? `Sửa "${editing.label}"` : 'Tạo loại nhập mới'}</h2>
          <button onClick={() => setSheetOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <div className="flex flex-col gap-4">
                {!editing && (
                  <FormField control={form.control} name="key" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Key <span className="text-red-500">*</span></FormLabel>
                      <FormControl><Input placeholder="vd: purchase" {...field} /></FormControl>
                      <FormDescription className="text-xs">Không thể sửa sau khi tạo</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}
                <FormField control={form.control} name="label" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên hiển thị <span className="text-red-500">*</span></FormLabel>
                    <FormControl><Input placeholder="vd: Mua hàng" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="parent_key" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent key</FormLabel>
                    <FormControl><Input placeholder="purchase / return_in / adjustment" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="requires_company" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cần đối tác</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{REQUIRES_COMPANY_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="requires_ref_document" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cần tham chiếu</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{REQUIRES_REF_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
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
              <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>Huỷ</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editing ? 'Lưu thay đổi' : 'Tạo mới'}
              </Button>
            </div>
          </form>
        </Form>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá loại nhập?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-foreground">{deleteTarget?.label}</strong> sẽ bị xoá vĩnh viễn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700"
              onClick={() => { deleteMutation.mutate(deleteTarget.id); setDeleteTarget(null) }}>
              Xoá
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ── Export Types ─────────────────────────────────────────────────────────────

const exportSchema = z.object({
  key:               z.string().min(1, 'Nhập key'),
  label:             z.string().min(1, 'Nhập tên hiển thị'),
  parent_key:        z.string().optional(),
  requires_company:  z.string(),
  requires_quotation: z.boolean(),
  is_active:         z.boolean(),
})
type ExportForm = z.infer<typeof exportSchema>

function ExportTypesSection() {
  const [sheetOpen, setSheetOpen]       = useState(false)
  const [editing, setEditing]           = useState<any | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)

  const { data, isLoading } = useQuery<any[]>({
    queryKey: ['export-types'],
    queryFn: async () => (await api.get('/settings/export-types')).data,
  })

  const form = useForm<ExportForm>({
    resolver: zodResolver(exportSchema),
    defaultValues: { key: '', label: '', parent_key: '', requires_company: 'none', requires_quotation: false, is_active: true },
  })

  const createMutation = useApiMutation(
    (v: any) => api.post('/settings/export-types', v),
    { successMessage: 'Tạo thành công', invalidateKey: ['export-types'], onSuccess: () => setSheetOpen(false) },
  )
  const updateMutation = useApiMutation(
    (v: any) => api.patch(`/settings/export-types/${editing?.id}`, v),
    { successMessage: 'Cập nhật thành công', invalidateKey: ['export-types'], onSuccess: () => setSheetOpen(false) },
  )
  const deleteMutation = useApiMutation(
    (id: string) => api.delete(`/settings/export-types/${id}`),
    { successMessage: 'Đã xoá', invalidateKey: ['export-types'] },
  )

  function openCreate() {
    setEditing(null)
    form.reset({ key: '', label: '', parent_key: '', requires_company: 'none', requires_quotation: false, is_active: true })
    setSheetOpen(true)
  }

  function openEdit(r: any) {
    setEditing(r)
    form.reset({
      key: r.key ?? '',
      label: r.label ?? '',
      parent_key: r.parent_key ?? '',
      requires_company: r.requires_company ?? 'none',
      requires_quotation: r.requires_quotation ?? false,
      is_active: r.is_active ?? true,
    })
    setSheetOpen(true)
  }

  function onSubmit(values: ExportForm) {
    if (editing) updateMutation.mutate(values)
    else createMutation.mutate(values)
  }

  const rows: any[] = data ?? []

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader title="Loại xuất kho" onAdd={openCreate} />

      <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="w-10 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">#</th>
              <th className="w-40 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mã key</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tên hiển thị</th>
              <th className="w-32 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cần đối tác</th>
              <th className="w-28 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cần báo giá</th>
              <th className="w-32 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trạng thái</th>
              <th className="w-24 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Hệ thống</th>
              <th className="w-12 px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-xs text-muted-foreground">Đang tải…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-xs text-muted-foreground">Chưa có loại xuất nào.</td></tr>
            ) : rows.map((r, i) => (
              <tr key={r.id} onClick={() => openEdit(r)} className="group/row cursor-pointer transition-colors hover:bg-muted/40">
                <td className="px-4 py-2.5 text-muted-foreground">{i + 1}</td>
                <td className="px-4 py-2.5 font-mono text-sm text-foreground">{r.key}</td>
                <td className="px-4 py-2.5 font-medium text-foreground">{r.label}</td>
                <td className="px-4 py-2.5 text-foreground">{REQUIRES_COMPANY_OPTS.find(o => o.value === r.requires_company)?.label ?? r.requires_company}</td>
                <td className="px-4 py-2.5"><div className="flex justify-center"><YesNoBadge value={r.requires_quotation} /></div></td>
                <td className="px-4 py-2.5"><div className="flex justify-center"><ActiveBadge value={r.is_active} /></div></td>
                <td className="px-4 py-2.5">
                  <div className="flex justify-center">
                    {r.is_system ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-blue-200">
                        <Shield className="h-3 w-3" /> Hệ thống
                      </span>
                    ) : <span className="text-muted-foreground">—</span>}
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  {!r.is_system && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(r) }}
                      className="hidden rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 group-hover/row:block"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length > 0 && (
          <div className="border-t border-border px-4 py-2.5">
            <span className="text-xs text-muted-foreground">{rows.length} loại xuất</span>
          </div>
        )}
      </div>

      {/* Sheet */}
      <div className={cn('fixed inset-0 z-40 bg-black/30 transition-opacity duration-200', sheetOpen ? 'opacity-100' : 'pointer-events-none opacity-0')} onClick={() => setSheetOpen(false)} />
      <div className={cn('fixed right-0 top-0 z-50 flex h-full w-[440px] flex-col bg-background shadow-xl transition-transform duration-200', sheetOpen ? 'translate-x-0' : 'translate-x-full')}>
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">{editing ? `Sửa "${editing.label}"` : 'Tạo loại xuất mới'}</h2>
          <button onClick={() => setSheetOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <div className="flex flex-col gap-4">
                {!editing && (
                  <FormField control={form.control} name="key" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Key <span className="text-red-500">*</span></FormLabel>
                      <FormControl><Input placeholder="vd: sale" {...field} /></FormControl>
                      <FormDescription className="text-xs">Không thể sửa sau khi tạo</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}
                <FormField control={form.control} name="label" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên hiển thị <span className="text-red-500">*</span></FormLabel>
                    <FormControl><Input placeholder="vd: Bán hàng" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="parent_key" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent key</FormLabel>
                    <FormControl><Input placeholder="sale / internal / demo_out / ..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="requires_company" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cần đối tác</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{REQUIRES_COMPANY_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="requires_quotation" render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border border-border p-3">
                    <FormLabel className="cursor-pointer text-sm font-normal">Cần báo giá</FormLabel>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
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
              <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>Huỷ</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editing ? 'Lưu thay đổi' : 'Tạo mới'}
              </Button>
            </div>
          </form>
        </Form>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá loại xuất?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-foreground">{deleteTarget?.label}</strong> sẽ bị xoá vĩnh viễn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700"
              onClick={() => { deleteMutation.mutate(deleteTarget.id); setDeleteTarget(null) }}>
              Xoá
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsTypesPage() {
  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Loại nhập / xuất kho</h1>
        <p className="text-sm text-muted-foreground">Cấu hình các loại phiếu nhập và xuất kho trong hệ thống</p>
      </div>
      <ImportTypesSection />
      <ExportTypesSection />
    </div>
  )
}
