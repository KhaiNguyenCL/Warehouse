import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, X, Tag } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '../lib/api'
import { useApiMutation } from '../hooks/useApiMutation'
import { useProducts } from '../hooks/useProducts'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'

// ── Constants ────────────────────────────────────────────────────────────────

const OBJECT_TYPES = [
  { value: 'quotation',      label: 'Quotation' },
  { value: 'receipt',        label: 'Receipt' },
  { value: 'delivery_order', label: 'Delivery Order' },
  { value: 'purchase_order', label: 'Purchase Order' },
  { value: 'transfer_order', label: 'Transfer Order' },
  { value: 'stocktake',      label: 'Stocktake' },
  { value: 'product',        label: 'Product' },
  { value: 'company',        label: 'Company' },
]

const FIELD_TYPES = [
  { value: 'text',    label: 'Text' },
  { value: 'number',  label: 'Number' },
  { value: 'date',    label: 'Date' },
  { value: 'select',  label: 'Select' },
  { value: 'boolean', label: 'Boolean' },
]

const ATTR_FIELD_TYPES = [
  { value: 'select',  label: 'Danh sách (chọn từ giá trị có sẵn)' },
  { value: 'text',    label: 'Nhập tự do' },
  { value: 'boolean', label: 'Có / Không' },
  { value: 'date',    label: 'Ngày' },
]

// ── Shared helpers ───────────────────────────────────────────────────────────

function ActiveBadge({ value }: { value: boolean }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
      value ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300'
            : 'bg-red-100 text-red-700 ring-1 ring-red-200',
    )}>
      <span className={cn('h-1.5 w-1.5 rounded-full', value ? 'bg-emerald-500' : 'bg-red-500')} />
      {value ? 'Hoạt động' : 'Ngừng'}
    </span>
  )
}

// ── Tab 1: Thuộc tính SKU ────────────────────────────────────────────────────

const attrSchema = z.object({
  name:        z.string().min(1, 'Nhập tên thuộc tính'),
  field_type:  z.string(),
  unit:        z.string().optional(),
  applies_to:  z.string(),
  product_ids: z.array(z.string()).optional(),
  is_active:   z.boolean().optional(),
})
type AttrForm = z.infer<typeof attrSchema>

function VariantAttributesTab() {
  const qc = useQueryClient()
  const [sheetOpen, setSheetOpen]       = useState(false)
  const [editing, setEditing]           = useState<any | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [options, setOptions]           = useState<string[]>([])
  const [optionInput, setOptionInput]   = useState('')

  const { data, isLoading } = useQuery<any[]>({
    queryKey: ['variant-attribute-defs'],
    queryFn: async () => (await api.get('/settings/variant-attribute-defs')).data,
  })

  const { data: productsData } = useProducts()
  const products: any[] = (productsData as any)?.data ?? productsData ?? []

  const form = useForm<AttrForm>({
    resolver: zodResolver(attrSchema),
    defaultValues: { name: '', field_type: 'select', unit: '', applies_to: 'all', product_ids: [], is_active: true },
  })

  const fieldType = form.watch('field_type')
  const appliesTo = form.watch('applies_to')

  async function handleSave(values: AttrForm) {
    const body = { ...values, options: values.field_type === 'select' ? options : [] }
    try {
      if (editing) {
        await api.patch(`/settings/variant-attribute-defs/${editing.id}`, body)
      } else {
        await api.post('/settings/variant-attribute-defs', body)
      }
      qc.invalidateQueries({ queryKey: ['variant-attribute-defs'] })
      setSheetOpen(false)
    } catch (err: any) {
      console.error(err)
    }
  }

  async function handleDelete(id: string) {
    await api.delete(`/settings/variant-attribute-defs/${id}`)
    qc.invalidateQueries({ queryKey: ['variant-attribute-defs'] })
  }

  function openCreate() {
    setEditing(null)
    setOptions([])
    setOptionInput('')
    form.reset({ name: '', field_type: 'select', unit: '', applies_to: 'all', product_ids: [], is_active: true })
    setSheetOpen(true)
  }

  function openEdit(r: any) {
    setEditing(r)
    setOptions(r.options ?? [])
    setOptionInput('')
    form.reset({
      name: r.name,
      field_type: r.field_type ?? 'select',
      unit: r.unit ?? '',
      applies_to: r.applies_to,
      product_ids: r.products?.map((p: any) => p.product_id) ?? [],
      is_active: r.is_active,
    })
    setSheetOpen(true)
  }

  function addOption() {
    const val = optionInput.trim()
    if (!val || options.includes(val)) return
    setOptions([...options, val])
    setOptionInput('')
  }

  const rows: any[] = data ?? []

  const ATTR_TYPE_LABELS: Record<string, string> = { text: 'Nhập tự do', select: 'Danh sách', boolean: 'Có/Không', date: 'Ngày' }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" />Thêm thuộc tính</Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="w-10 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">#</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tên thuộc tính</th>
              <th className="w-28 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Loại</th>
              <th className="w-20 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Đơn vị</th>
              <th className="w-32 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trạng thái</th>
              <th className="w-16 px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-xs text-muted-foreground">Đang tải…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-xs text-muted-foreground">Chưa có thuộc tính nào.</td></tr>
            ) : rows.map((r, i) => (
              <tr key={r.id} onClick={() => openEdit(r)} className="group/row cursor-pointer transition-colors hover:bg-muted/40">
                <td className="px-4 py-2.5 text-muted-foreground">{i + 1}</td>
                <td className="px-4 py-2.5 font-medium text-foreground">{r.name}</td>
                <td className="px-4 py-2.5 text-foreground">{ATTR_TYPE_LABELS[r.field_type] ?? r.field_type}</td>
                <td className="px-4 py-2.5 text-foreground">{r.unit ?? <span className="text-muted-foreground">—</span>}</td>
                <td className="px-4 py-2.5"><div className="flex justify-center"><ActiveBadge value={r.is_active} /></div></td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover/row:opacity-100">
                    <button onClick={(e) => { e.stopPropagation(); openEdit(r) }} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(r) }} className="rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length > 0 && (
          <div className="border-t border-border px-4 py-2.5">
            <span className="text-xs text-muted-foreground">{rows.length} thuộc tính</span>
          </div>
        )}
      </div>

      {/* Sheet */}
      <div className={cn('fixed inset-0 z-40 bg-black/30 transition-opacity duration-200', sheetOpen ? 'opacity-100' : 'pointer-events-none opacity-0')} onClick={() => setSheetOpen(false)} />
      <div className={cn('fixed right-0 top-0 z-50 flex h-full w-[480px] flex-col bg-background shadow-xl transition-transform duration-200', sheetOpen ? 'translate-x-0' : 'translate-x-full')}>
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold">{editing ? `Sửa "${editing.name}"` : 'Thêm thuộc tính SKU'}</h2>
          <button onClick={() => setSheetOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSave)} className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <div className="flex flex-col gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên thuộc tính <span className="text-red-500">*</span></FormLabel>
                    <FormControl><Input placeholder="Ví dụ: Số port, RAM, Dung lượng" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="field_type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Loại</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{ATTR_FIELD_TYPES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="unit" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ký hiệu đơn vị</FormLabel>
                    <FormControl><Input placeholder="Ví dụ: P, G, TB — để trống nếu không cần" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Options list — only for select type */}
                {fieldType === 'select' && (
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">
                      Các giá trị <span className="text-xs font-normal text-muted-foreground">(nhấn Enter hoặc +)</span>
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {options.map((o) => (
                        <span key={o} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
                          {o}
                          <button type="button" onClick={() => setOptions(options.filter((x) => x !== o))} className="ml-0.5 text-muted-foreground hover:text-foreground">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={optionInput}
                        onChange={(e) => setOptionInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOption() } }}
                        placeholder="Nhập giá trị rồi Enter"
                        className="flex-1"
                      />
                      <Button type="button" variant="outline" onClick={addOption}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                <FormField control={form.control} name="applies_to" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Áp dụng cho</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="all">Tất cả sản phẩm</SelectItem>
                        <SelectItem value="product">Chỉ một số sản phẩm</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                {appliesTo === 'product' && (
                  <FormField control={form.control} name="product_ids" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sản phẩm áp dụng</FormLabel>
                      <div className="flex flex-wrap gap-1.5 rounded-lg border border-border p-2">
                        {products.map((p: any) => {
                          const selected = (field.value ?? []).includes(p.id)
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                const curr = field.value ?? []
                                field.onChange(selected ? curr.filter((x) => x !== p.id) : [...curr, p.id])
                              }}
                              className={cn(
                                'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                                selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-muted/80',
                              )}
                            >
                              {p.code}
                            </button>
                          )
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}

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
              <Button type="submit">{editing ? 'Lưu thay đổi' : 'Tạo mới'}</Button>
            </div>
          </form>
        </Form>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá thuộc tính?</AlertDialogTitle>
            <AlertDialogDescription><strong className="text-foreground">{deleteTarget?.name}</strong> sẽ bị xoá.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => { handleDelete(deleteTarget.id); setDeleteTarget(null) }}>Xoá</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ── Tab 2: Trường tùy chỉnh ──────────────────────────────────────────────────

const cfSchema = z.object({
  field_name:  z.string().regex(/^[a-z][a-z0-9_]*$/, 'snake_case, bắt đầu bằng chữ thường').optional(),
  field_type:  z.string().optional(),
  field_label: z.string().min(1, 'Nhập tên hiển thị'),
  options:     z.array(z.string()).optional(),
  sort_order:  z.number().optional(),
  is_active:   z.boolean().optional(),
})
type CfForm = z.infer<typeof cfSchema>

function CustomFieldsTab() {
  const [objectType, setObjectType]     = useState('product')
  const [sheetOpen, setSheetOpen]       = useState(false)
  const [editing, setEditing]           = useState<any | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [tagInput, setTagInput]         = useState('')

  const { data, isLoading } = useQuery<any[]>({
    queryKey: ['custom-fields', objectType],
    queryFn: async () => (await api.get('/custom-fields', { params: { object_type: objectType } })).data,
  })

  const form = useForm<CfForm>({
    resolver: zodResolver(cfSchema),
    defaultValues: { field_name: '', field_type: 'text', field_label: '', options: [], sort_order: 0, is_active: true },
  })

  const fieldType  = form.watch('field_type')
  const optionList = form.watch('options') ?? []

  const createMutation = useApiMutation(
    (v: any) => api.post('/custom-fields', { ...v, object_type: objectType }),
    { successMessage: 'Tạo field thành công', invalidateKey: ['custom-fields', objectType], onSuccess: () => setSheetOpen(false) },
  )
  const updateMutation = useApiMutation(
    (v: any) => api.patch(`/custom-fields/${editing?.id}`, v),
    { successMessage: 'Cập nhật thành công', invalidateKey: ['custom-fields', objectType], onSuccess: () => setSheetOpen(false) },
  )
  const deleteMutation = useApiMutation(
    (id: string) => api.delete(`/custom-fields/${id}`),
    { successMessage: 'Đã xoá', invalidateKey: ['custom-fields', objectType] },
  )

  function openCreate() {
    setEditing(null)
    setTagInput('')
    form.reset({ field_name: '', field_type: 'text', field_label: '', options: [], sort_order: 0, is_active: true })
    setSheetOpen(true)
  }

  function openEditField(r: any) {
    setEditing(r)
    setTagInput('')
    form.reset({
      field_label: r.field_label,
      options: r.options ?? [],
      sort_order: r.sort_order ?? 0,
      is_active: r.is_active,
    })
    setSheetOpen(true)
  }

  function onSubmit(values: CfForm) {
    if (editing) updateMutation.mutate(values)
    else createMutation.mutate(values)
  }

  function addTag() {
    const val = tagInput.trim()
    if (!val || optionList.includes(val)) return
    form.setValue('options', [...optionList, val])
    setTagInput('')
  }

  const rows: any[] = data ?? []
  const FIELD_TYPE_LABELS: Record<string, string> = { text: 'Text', number: 'Number', date: 'Date', select: 'Select', boolean: 'Boolean' }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Select value={objectType} onValueChange={setObjectType}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>{OBJECT_TYPES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" />Tạo field</Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="w-10 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">#</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tên trường</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nhãn hiển thị</th>
              <th className="w-24 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Loại</th>
              <th className="w-16 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Thứ tự</th>
              <th className="w-32 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trạng thái</th>
              <th className="w-16 px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-xs text-muted-foreground">Đang tải…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-xs text-muted-foreground">Chưa có field nào cho loại này.</td></tr>
            ) : rows.map((r, i) => (
              <tr key={r.id} onClick={() => openEditField(r)} className="group/row cursor-pointer transition-colors hover:bg-muted/40">
                <td className="px-4 py-2.5 text-muted-foreground">{i + 1}</td>
                <td className="px-4 py-2.5 font-mono text-sm text-foreground">{r.field_name}</td>
                <td className="px-4 py-2.5 font-medium text-foreground">{r.field_label}</td>
                <td className="px-4 py-2.5 text-foreground">{FIELD_TYPE_LABELS[r.field_type] ?? r.field_type}</td>
                <td className="px-4 py-2.5 text-center text-foreground">{r.sort_order}</td>
                <td className="px-4 py-2.5"><div className="flex justify-center"><ActiveBadge value={r.is_active} /></div></td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover/row:opacity-100">
                    <button onClick={(e) => { e.stopPropagation(); openEditField(r) }} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(r) }} className="rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length > 0 && (
          <div className="border-t border-border px-4 py-2.5">
            <span className="text-xs text-muted-foreground">{rows.length} field</span>
          </div>
        )}
      </div>

      {/* Sheet */}
      <div className={cn('fixed inset-0 z-40 bg-black/30 transition-opacity duration-200', sheetOpen ? 'opacity-100' : 'pointer-events-none opacity-0')} onClick={() => setSheetOpen(false)} />
      <div className={cn('fixed right-0 top-0 z-50 flex h-full w-[440px] flex-col bg-background shadow-xl transition-transform duration-200', sheetOpen ? 'translate-x-0' : 'translate-x-full')}>
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold">{editing ? `Sửa "${editing.field_name}"` : 'Tạo trường mới'}</h2>
          <button onClick={() => setSheetOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <div className="flex flex-col gap-4">
                {!editing && (
                  <>
                    <FormField control={form.control} name="field_name" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tên trường (machine key) <span className="text-red-500">*</span></FormLabel>
                        <FormControl><Input placeholder="vd: warranty_note" {...field} /></FormControl>
                        <p className="text-xs text-muted-foreground">snake_case — không sửa được sau khi tạo</p>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="field_type" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Loại trường <span className="text-red-500">*</span></FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>{FIELD_TYPES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">Không sửa được sau khi tạo</p>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </>
                )}

                <FormField control={form.control} name="field_label" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên hiển thị <span className="text-red-500">*</span></FormLabel>
                    <FormControl><Input placeholder="vd: Ghi chú bảo hành" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {(editing ? editing.field_type : fieldType) === 'select' && (
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Options <span className="text-red-500">*</span></label>
                    <div className="flex flex-wrap gap-1.5">
                      {optionList.map((o) => (
                        <span key={o} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
                          {o}
                          <button type="button" onClick={() => form.setValue('options', optionList.filter((x) => x !== o))} className="ml-0.5 text-muted-foreground hover:text-foreground">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                        placeholder="Nhập giá trị rồi Enter"
                        className="flex-1"
                      />
                      <Button type="button" variant="outline" onClick={addTag}><Plus className="h-4 w-4" /></Button>
                    </div>
                  </div>
                )}

                <FormField control={form.control} name="sort_order" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Thứ tự hiển thị</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value ?? 0}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
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
            <AlertDialogTitle>Xoá field?</AlertDialogTitle>
            <AlertDialogDescription><strong className="text-foreground">{deleteTarget?.field_name}</strong> sẽ bị xoá vĩnh viễn.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => { deleteMutation.mutate(deleteTarget.id); setDeleteTarget(null) }}>Xoá</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CustomFieldsSettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Trường tùy chỉnh</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Quản lý thuộc tính SKU và các trường bổ sung cho phiếu/đơn</p>
      </div>
      <Tabs defaultValue="attr">
        <TabsList>
          <TabsTrigger value="attr">Thuộc tính SKU</TabsTrigger>
          <TabsTrigger value="custom">Trường tùy chỉnh (phiếu/đơn)</TabsTrigger>
        </TabsList>
        <TabsContent value="attr"><VariantAttributesTab /></TabsContent>
        <TabsContent value="custom"><CustomFieldsTab /></TabsContent>
      </Tabs>
    </div>
  )
}
