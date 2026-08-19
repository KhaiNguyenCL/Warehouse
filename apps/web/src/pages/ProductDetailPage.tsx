import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Form as AntForm, Input as AntInput, Select as AntSelect,
  TreeSelect, Switch as AntSwitch, InputNumber, message,
} from 'antd'
import {
  ArrowLeft, Plus, Pencil, Trash2, X, ChevronRight,
  Layers, Star, ChevronsUpDown, Package,
} from 'lucide-react'
import { api } from '../lib/api'
import { useApiMutation } from '../hooks/useApiMutation'
import { moneyProps } from '../lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command'
import { ColumnToggle, useColumnVisibility } from '@/components/ui/ColumnToggle'
import { cn } from '@/lib/utils'
import { CodeText } from '@/components/ui/CodeText'

// ─── Constants ────────────────────────────────────────────────────────────────

const PRODUCT_TYPES = [
  { value: 'storable',   label: 'Lưu kho (có serial)' },
  { value: 'consumable', label: 'Vật tư tiêu hao' },
  { value: 'service',    label: 'Dịch vụ' },
  { value: 'bundle',     label: 'Gói sản phẩm' },
]
const UNITS = ['Cái', 'Chiếc', 'Bộ', 'Hộp', 'Cuộn', 'Mét', 'Cổng', 'License', 'Gói', 'Dây', 'Lần', 'Giờ', 'Ngày']
const TYPE_STYLES: Record<string, string> = {
  storable:   'bg-blue-100 text-blue-800 ring-1 ring-blue-300',
  consumable: 'bg-amber-100 text-amber-800 ring-1 ring-amber-300',
  service:    'bg-purple-100 text-purple-800 ring-1 ring-purple-300',
  bundle:     'bg-teal-100 text-teal-800 ring-1 ring-teal-300',
}
const TYPE_LABEL: Record<string, string> = {
  storable: 'Lưu kho', consumable: 'Vật tư', service: 'Dịch vụ', bundle: 'Gói SP',
}
const SKU_COLUMNS = [
  { key: 'sku',         label: 'Mã hàng',    fixed: true },
  { key: 'name',        label: 'Tên SKU',    fixed: true },
  { key: 'model',       label: 'Model' },
  { key: 'part_number', label: 'Part Number' },
  { key: 'unit',        label: 'Đơn vị' },
  { key: 'cost_price',  label: 'Giá vốn' },
  { key: 'sale_price',  label: 'Giá bán' },
  { key: 'vat_percent', label: 'VAT%' },
  { key: 'weight_kg',   label: 'Trọng lượng' },
  { key: 'qty',         label: 'Tồn kho' },
  { key: 'avail',       label: 'Khả dụng' },
  { key: 'warehouse',   label: 'Phân bổ kho' },
]

// ─── SKU form schema ──────────────────────────────────────────────────────────

const numOpt = z.union([z.number().min(0), z.literal('')]).optional()
const intOpt = z.union([z.number().int().min(0), z.literal('')]).optional()
const skuSchema = z.object({
  item_code:       z.string().min(1, 'Nhập mã SKU'),
  name:            z.string().min(1, 'Nhập tên SKU'),
  unit:            z.string().optional(),
  cost_price:      numOpt,
  sale_price:      numOpt,
  vat_percent:     numOpt,
  model:           z.string().optional(),
  part_number:     z.string().optional(),
  warranty_months: intOpt,
  reorder_point:   intOpt,
  weight_kg:       numOpt,
  is_active:       z.boolean().optional(),
})
type SkuForm = z.infer<typeof skuSchema>

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildCategoryTree(flat: any[]): any[] {
  const map: Record<string, any> = {}
  flat.forEach((c) => (map[c.id] = { value: c.id, title: c.name }))
  const roots: any[] = []
  flat.forEach((c) => {
    if (c.parent_id && map[c.parent_id]) {
      map[c.parent_id].children = [...(map[c.parent_id].children ?? []), map[c.id]]
    } else {
      roots.push(map[c.id])
    }
  })
  return roots
}

function fmtMoney(v: number | null | undefined) {
  return v == null ? '—' : Number(v).toLocaleString('en-US')
}

const labelStyle: React.CSSProperties = {
  fontSize: 12, color: 'var(--text-2)', fontWeight: 600,
  marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.4px',
}

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div style={full ? { gridColumn: '1 / -1' } : {}}>
      <div style={labelStyle}>{label}</div>
      {children}
    </div>
  )
}

function InfoRow({ label, value, full, children }: {
  label: string; value?: string | null; full?: boolean; children?: React.ReactNode
}) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm text-foreground">{children ?? (value || '—')}</div>
    </div>
  )
}

// ─── CompanyCombobox ──────────────────────────────────────────────────────────

function CompanyCombobox({ companies, value, onChange, placeholder = 'Chọn…', disabled = false }: {
  companies: any[]; value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const selected = companies.find((c) => c.id === value)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" disabled={disabled}
          className={cn(
            'flex h-9 w-full items-center justify-between rounded-3xl border border-input bg-background px-3 text-sm transition-[border-color] outline-none',
            'hover:border-primary focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          <span className={cn('truncate', !selected && 'text-muted-foreground')}>
            {selected ? selected.name : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={4} style={{ width: 'var(--radix-popover-trigger-width)' }} className="gap-0 p-0">
        <Command>
          <CommandInput placeholder="Tìm…" />
          <CommandList>
            <CommandEmpty>Không tìm thấy.</CommandEmpty>
            <CommandGroup>
              {companies.map((c) => (
                <CommandItem key={c.id} value={c.name} data-checked={c.id === value}
                  onSelect={() => { onChange(c.id); setOpen(false) }}>
                  {c.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ─── VariantSuppliersPanel ────────────────────────────────────────────────────

const SUPPLIER_DRAFT_DEFAULT = { company_id: '', supplier_sku: '', supplier_price: '', lead_time_days: '', is_preferred: false }

function VariantSuppliersPanel({ productId, variantId, supplierCompanies }: {
  productId: string; variantId: string; supplierCompanies: any[]
}) {
  const qc = useQueryClient()
  const [formOpen, setFormOpen]   = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft]         = useState(SUPPLIER_DRAFT_DEFAULT)
  const [deleteId, setDeleteId]   = useState<string | null>(null)

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['variant-suppliers', variantId],
    queryFn:  () => api.get(`/products/${productId}/variants/${variantId}/suppliers`).then(r => r.data),
  })

  const addMutation = useMutation({
    mutationFn: (body: any) => api.post(`/products/${productId}/variants/${variantId}/suppliers`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['variant-suppliers', variantId] }); setFormOpen(false); message.success('Đã thêm nhà cung cấp') },
    onError: (e: any) => message.error(e.response?.data?.message ?? 'Lỗi khi thêm NCC'),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: any) => api.patch(`/products/${productId}/variants/${variantId}/suppliers/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['variant-suppliers', variantId] }); setFormOpen(false); message.success('Đã cập nhật') },
    onError: (e: any) => message.error(e.response?.data?.message ?? 'Lỗi'),
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${productId}/variants/${variantId}/suppliers/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['variant-suppliers', variantId] }); setDeleteId(null); message.success('Đã xoá nhà cung cấp') },
    onError: (e: any) => message.error(e.response?.data?.message ?? 'Lỗi'),
  })

  function openAdd() { setEditingId(null); setDraft(SUPPLIER_DRAFT_DEFAULT); setFormOpen(true) }
  function openEdit(s: any) {
    setEditingId(s.id)
    setDraft({ company_id: s.company_id, supplier_sku: s.supplier_sku ?? '', supplier_price: s.supplier_price != null ? String(s.supplier_price) : '', lead_time_days: s.lead_time_days != null ? String(s.lead_time_days) : '', is_preferred: s.is_preferred ?? false })
    setFormOpen(true)
  }
  function handleSave() {
    const body: any = { is_preferred: draft.is_preferred }
    if (draft.supplier_sku.trim())   body.supplier_sku   = draft.supplier_sku.trim()
    if (draft.supplier_price !== '') body.supplier_price = Number(draft.supplier_price)
    if (draft.lead_time_days !== '') body.lead_time_days = Number(draft.lead_time_days)
    if (editingId) { updateMutation.mutate({ id: editingId, ...body }) }
    else { if (!draft.company_id) { message.warning('Chọn nhà cung cấp'); return }; addMutation.mutate({ company_id: draft.company_id, ...body }) }
  }
  const isPending = addMutation.isPending || updateMutation.isPending

  return (
    <div className="flex flex-col gap-2">
      {isLoading ? (
        <div className="text-xs text-muted-foreground">Đang tải…</div>
      ) : (suppliers as any[]).length > 0 ? (
        <div className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border">
          {(suppliers as any[]).map((s: any) => (
            <div key={s.id} className="group/row flex items-center gap-2 px-3 py-2 hover:bg-muted/30 transition-colors">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  {s.is_preferred && <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />}
                  <span className="truncate text-sm font-medium">{s.company_name}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                  {s.supplier_sku   && <span className="font-mono">{s.supplier_sku}</span>}
                  {s.supplier_price != null && <span>{Number(s.supplier_price).toLocaleString('vi-VN')}đ</span>}
                  {s.lead_time_days != null && <span>{s.lead_time_days} ngày</span>}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/row:opacity-100">
                <button onClick={() => openEdit(s)} className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"><Pencil className="h-3 w-3" /></button>
                <button onClick={() => setDeleteId(s.id)} className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"><Trash2 className="h-3 w-3" /></button>
              </div>
            </div>
          ))}
        </div>
      ) : !formOpen ? (
        <p className="text-xs italic text-muted-foreground">Chưa có nhà cung cấp</p>
      ) : null}

      {formOpen && (
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium">Nhà cung cấp <span className="text-destructive">*</span></p>
              <CompanyCombobox companies={supplierCompanies} value={draft.company_id} onChange={(v) => setDraft(d => ({ ...d, company_id: v }))} placeholder="Chọn NCC…" disabled={!!editingId} />
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium">Mã SKU của NCC</p>
              <Input placeholder="VD: CS-SG110-16" value={draft.supplier_sku} onChange={(e) => setDraft(d => ({ ...d, supplier_sku: e.target.value }))} className="h-9 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-medium">Giá NCC (VND)</p>
                <InputNumber {...moneyProps} min={0} placeholder="0" value={draft.supplier_price !== '' ? Number(draft.supplier_price) : undefined} onChange={(val) => setDraft(d => ({ ...d, supplier_price: val != null ? String(val) : '' }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-medium">Lead time (ngày)</p>
                <Input type="number" min={0} step={1} placeholder="0" value={draft.lead_time_days} onChange={(e) => setDraft(d => ({ ...d, lead_time_days: e.target.value }))} className="h-9 text-sm" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="sup-preferred" checked={draft.is_preferred} onCheckedChange={(v) => setDraft(d => ({ ...d, is_preferred: v }))} />
              <label htmlFor="sup-preferred" className="cursor-pointer text-sm">NCC ưu tiên</label>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button size="sm" variant="outline" type="button" onClick={() => setFormOpen(false)}>Huỷ</Button>
              <Button size="sm" type="button" onClick={handleSave} disabled={isPending}>{isPending ? 'Đang lưu…' : editingId ? 'Cập nhật' : 'Thêm'}</Button>
            </div>
          </div>
        </div>
      )}

      {!formOpen && (
        <button type="button" onClick={openAdd} className="flex w-fit items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">
          <Plus className="h-3 w-3" />Thêm nhà cung cấp
        </button>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Xoá nhà cung cấp?</AlertDialogTitle><AlertDialogDescription>Không thể hoàn tác.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Xoá</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── VariantCustomerPricesPanel ───────────────────────────────────────────────

const PRICE_DRAFT_DEFAULT = { company_id: '', price: '', note: '' }

function VariantCustomerPricesPanel({ productId, variantId, customerCompanies }: {
  productId: string; variantId: string; customerCompanies: any[]
}) {
  const qc = useQueryClient()
  const [formOpen, setFormOpen]   = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft]         = useState(PRICE_DRAFT_DEFAULT)
  const [deleteId, setDeleteId]   = useState<string | null>(null)

  const { data: prices = [], isLoading } = useQuery({
    queryKey: ['variant-customer-prices', variantId],
    queryFn:  () => api.get(`/products/${productId}/variants/${variantId}/customer-prices`).then(r => r.data),
  })

  const addMutation = useMutation({
    mutationFn: (body: any) => api.post(`/products/${productId}/variants/${variantId}/customer-prices`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['variant-customer-prices', variantId] }); setFormOpen(false); message.success('Đã thêm giá khách hàng') },
    onError: (e: any) => message.error(e.response?.data?.message ?? 'Lỗi khi thêm giá'),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: any) => api.patch(`/products/${productId}/variants/${variantId}/customer-prices/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['variant-customer-prices', variantId] }); setFormOpen(false); message.success('Đã cập nhật') },
    onError: (e: any) => message.error(e.response?.data?.message ?? 'Lỗi'),
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${productId}/variants/${variantId}/customer-prices/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['variant-customer-prices', variantId] }); setDeleteId(null); message.success('Đã xoá') },
    onError: (e: any) => message.error(e.response?.data?.message ?? 'Lỗi'),
  })

  function openAdd() { setEditingId(null); setDraft(PRICE_DRAFT_DEFAULT); setFormOpen(true) }
  function openEdit(p: any) { setEditingId(p.id); setDraft({ company_id: p.company_id, price: p.price != null ? String(p.price) : '', note: p.note ?? '' }); setFormOpen(true) }
  function handleSave() {
    if (!draft.price) { message.warning('Nhập giá'); return }
    const body: any = { price: Number(draft.price) }
    if (draft.note.trim()) body.note = draft.note.trim()
    if (editingId) { updateMutation.mutate({ id: editingId, ...body }) }
    else { if (!draft.company_id) { message.warning('Chọn khách hàng'); return }; addMutation.mutate({ company_id: draft.company_id, ...body }) }
  }
  const isPending = addMutation.isPending || updateMutation.isPending

  return (
    <div className="flex flex-col gap-2">
      {isLoading ? (
        <div className="text-xs text-muted-foreground">Đang tải…</div>
      ) : (prices as any[]).length > 0 ? (
        <div className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border">
          {(prices as any[]).map((p: any) => (
            <div key={p.id} className="group/row flex items-center gap-2 px-3 py-2 hover:bg-muted/30 transition-colors">
              <div className="min-w-0 flex-1">
                <span className="truncate text-sm font-medium">{p.company_name}</span>
                <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{Number(p.price).toLocaleString('vi-VN')}đ</span>
                  {p.note && <span className="truncate">{p.note}</span>}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/row:opacity-100">
                <button onClick={() => openEdit(p)} className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"><Pencil className="h-3 w-3" /></button>
                <button onClick={() => setDeleteId(p.id)} className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"><Trash2 className="h-3 w-3" /></button>
              </div>
            </div>
          ))}
        </div>
      ) : !formOpen ? (
        <p className="text-xs italic text-muted-foreground">Chưa có giá theo khách hàng</p>
      ) : null}

      {formOpen && (
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium">Khách hàng <span className="text-destructive">*</span></p>
              <CompanyCombobox companies={customerCompanies} value={draft.company_id} onChange={(v) => setDraft(d => ({ ...d, company_id: v }))} placeholder="Chọn khách hàng…" disabled={!!editingId} />
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium">Giá (VND) <span className="text-destructive">*</span></p>
              <InputNumber {...moneyProps} min={0} placeholder="0" value={draft.price !== '' ? Number(draft.price) : undefined} onChange={(val) => setDraft(d => ({ ...d, price: val != null ? String(val) : '' }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium">Ghi chú</p>
              <Input placeholder="VD: Giá hợp đồng Q1" value={draft.note} onChange={(e) => setDraft(d => ({ ...d, note: e.target.value }))} className="h-9 text-sm" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button size="sm" variant="outline" type="button" onClick={() => setFormOpen(false)}>Huỷ</Button>
              <Button size="sm" type="button" onClick={handleSave} disabled={isPending}>{isPending ? 'Đang lưu…' : editingId ? 'Cập nhật' : 'Thêm'}</Button>
            </div>
          </div>
        </div>
      )}

      {!formOpen && (
        <button type="button" onClick={openAdd} className="flex w-fit items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">
          <Plus className="h-3 w-3" />Thêm giá khách hàng
        </button>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Xoá giá khách hàng?</AlertDialogTitle><AlertDialogDescription>Không thể hoàn tác.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Xoá</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [isEditing, setIsEditing] = useState(false)
  const [skuOpen, setSkuOpen]     = useState(false)
  const [editingSku, setEditingSku] = useState<any | null>(null)

  const skuCols = useColumnVisibility('products-sku', SKU_COLUMNS)
  const [editForm] = AntForm.useForm()

  const skuForm = useForm<SkuForm>({
    resolver: zodResolver(skuSchema),
    defaultValues: {
      item_code: '', name: '', unit: '',
      cost_price: '', sale_price: '', vat_percent: '',
      model: '', part_number: '',
      warranty_months: '', reorder_point: '', weight_kg: '',
      is_active: true,
    },
  })

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: product, isLoading } = useQuery({
    queryKey: ['product-detail', id],
    queryFn: async () => (await api.get(`/products/${id}`)).data,
    enabled: !!id,
  })

  const { data: inventoryData } = useQuery({
    queryKey: ['inventory-by-product', id],
    queryFn: async () => (await api.get('/inventory/by-variant', { params: { product_id: id, limit: 100 } })).data,
    enabled: !!id,
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await api.get('/products/categories')).data,
  })
  const { data: brands } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => (await api.get('/products/brands')).data,
  })

  const { data: suppliersListData } = useQuery({
    queryKey: ['companies', 'supplier', 100],
    queryFn: async () => (await api.get('/companies', { params: { type: 'supplier', limit: 100 } })).data,
    staleTime: 60_000,
    enabled: !!editingSku,
  })
  const { data: customersListData } = useQuery({
    queryKey: ['companies', 'customer', 100],
    queryFn: async () => (await api.get('/companies', { params: { type: 'customer', limit: 100 } })).data,
    staleTime: 60_000,
    enabled: !!editingSku,
  })
  const supplierCompanies: any[] = suppliersListData?.data ?? []
  const customerCompanies: any[] = customersListData?.data ?? []

  // ── Mutations ─────────────────────────────────────────────────────────────

  const updateProduct = useApiMutation((values: any) => api.patch(`/products/${id}`, values), {
    successMessage: 'Cập nhật sản phẩm thành công',
    invalidateKey: ['product-detail', id],
    onSuccess: () => setIsEditing(false),
  })

  const skuMutation = useApiMutation(
    async (values: SkuForm) => {
      const body: any = { item_code: values.item_code, name: values.name }
      if (values.unit)                body.unit         = values.unit
      if (values.model?.trim())       body.model        = values.model.trim()
      if (values.part_number?.trim()) body.part_number  = values.part_number.trim()
      if (values.cost_price      !== '' && values.cost_price      != null) body.cost_price      = Number(values.cost_price)
      if (values.sale_price      !== '' && values.sale_price      != null) body.sale_price      = Number(values.sale_price)
      if (values.vat_percent     !== '' && values.vat_percent     != null) body.vat_percent     = Number(values.vat_percent)
      if (values.warranty_months !== '' && values.warranty_months != null) body.warranty_months = Number(values.warranty_months)
      if (values.reorder_point   !== '' && values.reorder_point   != null) body.reorder_point   = Number(values.reorder_point)
      if (values.weight_kg       !== '' && values.weight_kg       != null) body.weight_kg       = Number(values.weight_kg)
      if (editingSku && values.is_active != null) body.is_active = values.is_active
      if (editingSku) return (await api.patch(`/products/${id}/variants/${editingSku.id}`, body)).data
      return (await api.post(`/products/${id}/variants`, body)).data
    },
    {
      successMessage: editingSku ? 'Đã cập nhật SKU' : 'Đã tạo SKU',
      invalidateKey: [['product-detail', id], ['inventory-by-product', id]],
      onSuccess: () => closeSkuSheet(),
    },
  )

  // ── Edit form setup ───────────────────────────────────────────────────────

  useEffect(() => {
    if (product && isEditing) {
      editForm.setFieldsValue({
        category_id:  product.category_id,
        brand_id:     product.brand_id,
        model_number: product.model_number,
        code:         product.code,
        name:         product.name,
        name_en:      product.name_en,
        product_type: product.product_type,
        description:  product.description,
        is_active:    product.is_active ?? true,
      })
    }
  }, [product?.id, isEditing])

  async function saveProductEdit() {
    const values = await editForm.validateFields()
    updateProduct.mutate(values)
  }

  // ── SKU sheet helpers ─────────────────────────────────────────────────────

  function openCreateSku() {
    setEditingSku(null)
    skuForm.reset({
      item_code: product?.code ? `${product.code}-` : '',
      name: '', unit: '', cost_price: '', sale_price: '', vat_percent: '',
      model: '', part_number: '', warranty_months: '', reorder_point: '', weight_kg: '',
      is_active: true,
    })
    setSkuOpen(true)
  }

  function openEditSku(v: any) {
    setEditingSku(v)
    skuForm.reset({
      item_code:       v.item_code ?? v.sku ?? '',
      name:            v.name ?? '',
      unit:            v.unit ?? '',
      cost_price:      v.cost_price      != null ? Number(v.cost_price)      : '',
      sale_price:      v.sale_price      != null ? Number(v.sale_price)      : '',
      vat_percent:     v.vat_percent     != null ? Number(v.vat_percent)     : '',
      model:           v.model           ?? '',
      part_number:     v.part_number     ?? '',
      warranty_months: v.warranty_months != null ? Number(v.warranty_months) : '',
      reorder_point:   v.reorder_point   != null ? Number(v.reorder_point)   : '',
      weight_kg:       v.weight_kg       != null ? Number(v.weight_kg)       : '',
      is_active:       v.is_active ?? true,
    })
    setSkuOpen(true)
  }

  function closeSkuSheet() { setSkuOpen(false); skuForm.reset() }

  // ── Derived data ──────────────────────────────────────────────────────────

  const inventoryMap = new Map<string, any>()
  for (const row of inventoryData?.data ?? []) inventoryMap.set(row.variant_id, row)

  const variantsWithStock: any[] = (product?.variants ?? []).map((v: any) => ({
    ...v,
    ...(inventoryMap.get(v.id) ?? { qty_on_hand: 0, qty_reserved: 0, qty_available: 0, warehouse_breakdown: [] }),
  }))

  const categoryTree = buildCategoryTree(categories ?? [])

  // ── Loading / not found ───────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5">
        <div className="h-6 w-48 animate-pulse rounded bg-muted" />
        <div className="h-44 animate-pulse rounded-xl bg-muted" />
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    )
  }
  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
        <Package className="h-10 w-10 opacity-20" />
        <p className="text-sm">Không tìm thấy sản phẩm</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/products')}>Quay lại</Button>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-5">

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <button onClick={() => navigate('/products')} className="flex items-center gap-1 rounded px-1 py-0.5 hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Sản phẩm</span>
        </button>
        <ChevronRight className="h-3.5 w-3.5 opacity-40" />
        <span className="font-medium text-foreground truncate max-w-xs">{product.name}</span>
      </div>

      {/* Product info card */}
      <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
        {/* Card header */}
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="flex flex-col gap-1.5 min-w-0">
            <h2 className="text-base font-semibold text-foreground leading-snug truncate">{product.name}</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <CodeText>{product.code}</CodeText>
              {product.product_type && (
                <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium', TYPE_STYLES[product.product_type] ?? 'bg-muted text-muted-foreground')}>
                  {TYPE_LABEL[product.product_type] ?? product.product_type}
                </span>
              )}
              {product.is_active === false && (
                <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">Inactive</span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {isEditing ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                  <X className="mr-1.5 h-3.5 w-3.5" />Huỷ
                </Button>
                <Button size="sm" onClick={saveProductEdit} disabled={updateProduct.isPending}>
                  {updateProduct.isPending ? 'Đang lưu…' : 'Lưu'}
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" />Sửa
              </Button>
            )}
          </div>
        </div>

        {/* Card body */}
        <div className="px-5 py-5">
          {isEditing ? (
            <AntForm form={editForm} layout="vertical">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '22px 28px' }}>
                <Field label="Danh mục *">
                  <AntForm.Item name="category_id" noStyle rules={[{ required: true, message: 'Bắt buộc' }]}>
                    <TreeSelect treeData={categoryTree} showSearch treeNodeFilterProp="title" treeDefaultExpandAll style={{ width: '100%' }} allowClear />
                  </AntForm.Item>
                </Field>
                <Field label="Hãng">
                  <AntForm.Item name="brand_id" noStyle>
                    <AntSelect showSearch optionFilterProp="label" options={(brands ?? []).map((b: any) => ({ value: b.id, label: b.name }))} allowClear style={{ width: '100%' }} />
                  </AntForm.Item>
                </Field>
                <Field label="Loại sản phẩm *">
                  <AntForm.Item name="product_type" noStyle rules={[{ required: true, message: 'Bắt buộc' }]}>
                    <AntSelect options={PRODUCT_TYPES} style={{ width: '100%' }} />
                  </AntForm.Item>
                </Field>
                <Field label="Mã dòng sản phẩm">
                  <AntForm.Item name="model_number" noStyle>
                    <AntInput placeholder="VD: SG110" style={{ width: '100%' }} />
                  </AntForm.Item>
                </Field>
                <Field label="Mã sản phẩm *">
                  <AntForm.Item name="code" noStyle rules={[{ required: true, message: 'Bắt buộc' }]}>
                    <AntInput style={{ width: '100%' }} />
                  </AntForm.Item>
                </Field>
                <Field label="Trạng thái">
                  <div style={{ paddingTop: 4 }}>
                    <AntForm.Item name="is_active" noStyle valuePropName="checked">
                      <AntSwitch checkedChildren="Active" unCheckedChildren="Inactive" />
                    </AntForm.Item>
                  </div>
                </Field>
                <Field label="Tên *" full>
                  <AntForm.Item name="name" noStyle rules={[{ required: true, message: 'Bắt buộc' }]}>
                    <AntInput style={{ width: '100%' }} />
                  </AntForm.Item>
                </Field>
                <Field label="Tên (English)" full>
                  <AntForm.Item name="name_en" noStyle>
                    <AntInput style={{ width: '100%' }} />
                  </AntForm.Item>
                </Field>
                <Field label="Mô tả" full>
                  <AntForm.Item name="description" noStyle>
                    <AntInput.TextArea rows={3} style={{ width: '100%' }} />
                  </AntForm.Item>
                </Field>
              </div>
            </AntForm>
          ) : (
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <InfoRow label="Danh mục" value={product.category_name} />
              <InfoRow label="Hãng"     value={product.brand_name} />
              <InfoRow label="Loại SP"  value={TYPE_LABEL[product.product_type] ?? product.product_type} />
              <InfoRow label="Mã dòng SP" value={product.model_number} />
              {product.name_en && <InfoRow label="Tên (English)" value={product.name_en} />}
              {product.description && <InfoRow label="Mô tả" value={product.description} full />}
            </div>
          )}
        </div>
      </div>

      {/* SKU table */}
      <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Danh sách SKU</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{variantsWithStock.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <ColumnToggle tableId="products-sku" columns={SKU_COLUMNS} visible={skuCols.visible} onToggle={skuCols.toggle} />
            {product.product_type !== 'service' && (
              <Button size="sm" onClick={openCreateSku}><Plus className="mr-1.5 h-3.5 w-3.5" />Thêm SKU</Button>
            )}
          </div>
        </div>

        {variantsWithStock.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
            <p className="text-sm">Chưa có SKU nào</p>
            {product.product_type !== 'service' && (
              <Button size="sm" variant="outline" onClick={openCreateSku}><Plus className="mr-1.5 h-3.5 w-3.5" />Tạo SKU đầu tiên</Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="w-40 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mã hàng</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tên SKU</th>
                  {skuCols.isVisible('model')       && <th className="w-32 px-3 py-2.5 text-left   text-xs font-semibold uppercase tracking-wide text-muted-foreground">Model</th>}
                  {skuCols.isVisible('part_number') && <th className="w-40 px-3 py-2.5 text-left   text-xs font-semibold uppercase tracking-wide text-muted-foreground">Part Number</th>}
                  {skuCols.isVisible('unit')        && <th className="w-16 px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">ĐV</th>}
                  {skuCols.isVisible('cost_price')  && <th className="w-28 px-3 py-2.5 text-right  text-xs font-semibold uppercase tracking-wide text-muted-foreground">Giá vốn</th>}
                  {skuCols.isVisible('sale_price')  && <th className="w-28 px-3 py-2.5 text-right  text-xs font-semibold uppercase tracking-wide text-muted-foreground">Giá bán</th>}
                  {skuCols.isVisible('vat_percent') && <th className="w-16 px-3 py-2.5 text-right  text-xs font-semibold uppercase tracking-wide text-muted-foreground">VAT%</th>}
                  {skuCols.isVisible('weight_kg')   && <th className="w-20 px-3 py-2.5 text-right  text-xs font-semibold uppercase tracking-wide text-muted-foreground">KL (kg)</th>}
                  {skuCols.isVisible('qty')         && <th className="w-20 px-3 py-2.5 text-right  text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tồn kho</th>}
                  {skuCols.isVisible('avail')       && <th className="w-24 px-3 py-2.5 text-right  text-xs font-semibold uppercase tracking-wide text-muted-foreground">Khả dụng</th>}
                  {skuCols.isVisible('warehouse')   && <th className="px-4 py-2.5 text-left        text-xs font-semibold uppercase tracking-wide text-muted-foreground">Phân bổ kho</th>}
                  <th className="w-10 px-2 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {variantsWithStock.map((v: any) => {
                  const breakdown: any[] = v.warehouse_breakdown ?? []
                  const qtyOnHand = v.qty_on_hand ?? 0
                  const qtyAvail  = v.qty_available ?? 0
                  return (
                    <tr key={v.id} onClick={() => openEditSku(v)} className="group/row cursor-pointer transition-colors hover:bg-muted/30">
                      <td className="w-40 px-4 py-2.5">
                        <CodeText>{v.item_code || v.sku || '—'}</CodeText>
                      </td>
                      <td className="max-w-0 px-4 py-2.5"><span className="block truncate text-sm text-foreground" title={v.name}>{v.name ?? '—'}</span></td>
                      {skuCols.isVisible('model')       && <td className="w-32 px-3 py-2.5 font-mono text-sm text-foreground">{v.model ?? '—'}</td>}
                      {skuCols.isVisible('part_number') && <td className="w-40 px-3 py-2.5 font-mono text-sm text-foreground">{v.part_number ?? '—'}</td>}
                      {skuCols.isVisible('unit')        && <td className="px-3 py-2.5 text-center text-sm text-foreground">{v.unit ?? '—'}</td>}
                      {skuCols.isVisible('cost_price')  && <td className="px-3 py-2.5 text-right text-sm tabular-nums text-muted-foreground">{fmtMoney(v.cost_price)}</td>}
                      {skuCols.isVisible('sale_price')  && <td className="px-3 py-2.5 text-right text-sm tabular-nums text-muted-foreground">{fmtMoney(v.sale_price)}</td>}
                      {skuCols.isVisible('vat_percent') && <td className="px-3 py-2.5 text-right text-sm tabular-nums text-muted-foreground">{v.vat_percent != null ? `${Number(v.vat_percent)}%` : '—'}</td>}
                      {skuCols.isVisible('weight_kg')   && <td className="px-3 py-2.5 text-right text-sm tabular-nums text-muted-foreground">{v.weight_kg != null ? Number(v.weight_kg) : '—'}</td>}
                      {skuCols.isVisible('qty')         && (
                        <td className="px-3 py-2.5 text-right">
                          <span className={cn('tabular-nums text-sm font-medium', qtyOnHand > 0 ? 'text-foreground' : 'text-muted-foreground')}>{qtyOnHand.toLocaleString('vi-VN')}</span>
                        </td>
                      )}
                      {skuCols.isVisible('avail')       && (
                        <td className="px-3 py-2.5 text-right">
                          <span className={cn('tabular-nums text-sm font-semibold', qtyAvail > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground')}>{qtyAvail.toLocaleString('vi-VN')}</span>
                        </td>
                      )}
                      {skuCols.isVisible('warehouse')   && (
                        <td className="px-4 py-2.5">
                          {breakdown.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {breakdown.map((wh: any) => (
                                <span key={wh.name} className="inline-flex max-w-[10rem] items-center gap-1 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-xs" title={wh.name}>
                                  <span className="truncate text-muted-foreground">{wh.name}</span>
                                  <span className="shrink-0 font-medium text-foreground">{wh.qty}</span>
                                </span>
                              ))}
                            </div>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </td>
                      )}
                      <td className="px-2 py-2.5">
                        <div className="flex justify-end opacity-0 transition-opacity group-hover/row:opacity-100">
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SKU sheet backdrop */}
      {skuOpen && <div className="fixed inset-0 z-40 bg-black/30 transition-opacity duration-200" onClick={closeSkuSheet} />}

      {/* SKU sheet */}
      <div
        className={cn('fixed right-0 top-0 z-50 flex h-full w-[560px] flex-col bg-background shadow-xl transition-transform duration-200', skuOpen ? 'translate-x-0' : 'translate-x-full')}
        onKeyDown={(e) => { if (e.key === 'Escape') closeSkuSheet() }}
        tabIndex={-1}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold">{editingSku ? 'Sửa SKU' : 'Tạo SKU mới'}</h2>
            <p className="text-xs text-muted-foreground">{product.name}</p>
          </div>
          <button onClick={closeSkuSheet} className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <Form {...skuForm}>
          <form onSubmit={skuForm.handleSubmit((v) => skuMutation.mutate(v))} className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <div className="flex flex-col gap-4">

                <FormField control={skuForm.control} name="item_code" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mã hàng <span className="text-destructive">*</span></FormLabel>
                    <FormControl><Input placeholder={`VD: ${product.code}-16P`} className="font-mono" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={skuForm.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên SKU <span className="text-destructive">*</span></FormLabel>
                    <FormControl><Input placeholder="VD: Switch 16 Port" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={skuForm.control} name="unit" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Đơn vị</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Chọn đơn vị">{field.value || 'Chọn đơn vị'}</SelectValue></SelectTrigger></FormControl>
                      <SelectContent>{UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Giá */}
                <div className="rounded-lg bg-muted/40 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Giá</p>
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <FormField control={skuForm.control} name="cost_price" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Giá vốn (VND)</FormLabel>
                          <FormControl>
                            <InputNumber {...moneyProps} min={0} placeholder="0"
                              value={field.value === '' ? undefined : field.value as number}
                              onChange={(val) => field.onChange(val ?? '')} onBlur={field.onBlur} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={skuForm.control} name="sale_price" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Giá bán (VND)</FormLabel>
                          <FormControl>
                            <InputNumber {...moneyProps} min={0} placeholder="0"
                              value={field.value === '' ? undefined : field.value as number}
                              onChange={(val) => field.onChange(val ?? '')} onBlur={field.onBlur} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <div className="w-1/2 pr-1.5">
                      <FormField control={skuForm.control} name="vat_percent" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">% VAT</FormLabel>
                          <FormControl>
                            <Input type="number" min={0} max={100} step="0.01" placeholder="10"
                              {...field}
                              value={field.value === '' ? '' : String(field.value)}
                              onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>
                </div>

                {/* Thông số kỹ thuật */}
                <div className="rounded-lg bg-muted/40 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Thông số kỹ thuật</p>
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <FormField control={skuForm.control} name="model" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Model</FormLabel>
                          <FormControl><Input placeholder="VD: SG110-16" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={skuForm.control} name="part_number" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Part number</FormLabel>
                          <FormControl><Input placeholder="VD: CS-SG110..." className="font-mono" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField control={skuForm.control} name="warranty_months" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Bảo hành (tháng)</FormLabel>
                          <FormControl>
                            <Input type="number" min={0} step={1} placeholder="0"
                              {...field}
                              value={field.value === '' ? '' : String(field.value)}
                              onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={skuForm.control} name="reorder_point" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Điểm đặt hàng</FormLabel>
                          <FormControl>
                            <Input type="number" min={0} step={1} placeholder="0"
                              {...field}
                              value={field.value === '' ? '' : String(field.value)}
                              onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <div className="w-1/2 pr-1.5">
                      <FormField control={skuForm.control} name="weight_kg" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Trọng lượng (kg)</FormLabel>
                          <FormControl>
                            <Input type="number" min={0} step="0.001" placeholder="0.000"
                              {...field}
                              value={field.value === '' ? '' : String(field.value)}
                              onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>
                </div>

                {/* Edit-only sections */}
                {editingSku && (
                  <>
                    <FormField control={skuForm.control} name="is_active" render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                        <FormLabel className="cursor-pointer text-sm font-normal">Đang hoạt động</FormLabel>
                        <FormControl><Switch checked={field.value ?? true} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                    )} />

                    <div className="rounded-lg bg-muted/40 p-4">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nhà cung cấp</p>
                      <VariantSuppliersPanel productId={id!} variantId={editingSku.id} supplierCompanies={supplierCompanies} />
                    </div>

                    <div className="rounded-lg bg-muted/40 p-4">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Giá theo khách hàng</p>
                      <VariantCustomerPricesPanel productId={id!} variantId={editingSku.id} customerCompanies={customerCompanies} />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-5 py-4">
              <Button type="button" variant="outline" onClick={closeSkuSheet}>Huỷ</Button>
              <Button type="submit" disabled={skuMutation.isPending}>
                {skuMutation.isPending ? 'Đang lưu…' : editingSku ? 'Lưu thay đổi' : 'Tạo SKU'}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  )
}
