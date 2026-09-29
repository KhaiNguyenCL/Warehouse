import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Plus, Search, Trash2, ChevronLeft, ChevronRight as ChevronRightIcon, X, Package,
  Upload as UploadIcon, FileSpreadsheet,
} from 'lucide-react'
import { useProducts } from '../hooks/useProducts'
import { useDebounce } from '../hooks/useDebounce'
import { api } from '../lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription,
} from '@/components/ui/form'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import { ColumnToggle, useColumnVisibility, type ColumnDef } from '@/components/ui/ColumnToggle'
import { Sheet, SheetContent } from '@/components/ui/sheet'

// ── Constants ──────────────────────────────────────────────────────────────

const PRODUCT_TYPES = [
  { value: 'storable',   label: 'Thiết bị' },
  { value: 'consumable', label: 'Vật tư' },
  { value: 'service',    label: 'Dịch vụ' },
  { value: 'bundle',     label: 'Gói sản phẩm' },
]
const UNITS = ['Cái', 'Chiếc', 'Bộ', 'Hộp', 'Cuộn', 'Mét', 'Cổng', 'License', 'Gói', 'Dây', 'Lần', 'Giờ', 'Ngày']
// Tag phân biệt 4 loại sản phẩm — port thẳng class .kv-tag--device/supply/service/bundle từ
// export/products.html (kv.css), không tự phối màu qua Tailwind arbitrary value nữa.
const TYPE_STYLES: Record<string, string> = {
  storable:   'kv-tag kv-tag--device',
  consumable: 'kv-tag kv-tag--supply',
  service:    'kv-tag kv-tag--service',
  bundle:     'kv-tag kv-tag--bundle',
}
const TYPE_LABEL: Record<string, string> = {
  storable: 'Thiết bị', consumable: 'Vật tư', service: 'Dịch vụ', bundle: 'Gói SP',
}

// ── Create product form schema ──────────────────────────────────────────────

const productSchema = z.object({
  category_id:  z.string().min(1, 'Chọn category'),
  brand_id:     z.string().optional(),
  model_number: z.string().optional(),
  code:         z.string().min(1, 'Nhập mã sản phẩm'),
  name:         z.string().min(1, 'Nhập tên'),
  name_en:      z.string().optional(),
  product_type: z.enum(['storable', 'consumable', 'service', 'bundle']),
  description:  z.string().optional(),
  sku:          z.string().optional(),
  variant_name: z.string().optional(),
  unit:         z.string().optional(),
  sale_price:   z.string().optional(),
}).superRefine((v, ctx) => {
  if (v.product_type === 'service') {
    if (!v.sku) ctx.addIssue({ code: 'custom', path: ['sku'], message: 'Nhập SKU' })
    if (!v.variant_name) ctx.addIssue({ code: 'custom', path: ['variant_name'], message: 'Nhập tên SKU' })
  }
})
type ProductForm = z.infer<typeof productSchema>

const DEFAULT_PRODUCT_VALUES: ProductForm = {
  category_id: '', brand_id: '', model_number: '', code: '', name: '', name_en: '',
  product_type: 'storable', description: '', sku: '', variant_name: '', unit: 'Lần', sale_price: '',
}

// ── Column definitions ─────────────────────────────────────────────────────

const PRODUCT_COLUMNS: ColumnDef[] = [
  { key: 'code',          label: 'Mã SP',        fixed: true },
  { key: 'name',          label: 'Tên sản phẩm', fixed: true },
  { key: 'product_type',  label: 'Loại',         default: true },
  { key: 'brand_name',    label: 'Hãng',         default: true },
  { key: 'category_name', label: 'Danh mục',     default: true },
  { key: 'sku_count',     label: 'SKU',          default: true },
]

const SKU_COLUMNS: ColumnDef[] = [
  { key: 'item_code',       label: 'Mã hàng',      fixed: true },
  { key: 'name',            label: 'Tên SKU',       fixed: true },
  { key: 'product_name',    label: 'Sản phẩm',      fixed: true },
  { key: 'unit',            label: 'ĐV',            default: false },
  { key: 'cost_price',      label: 'Giá vốn',       default: false },
  { key: 'sale_price',      label: 'Giá bán',       default: false },
  { key: 'vat_percent',     label: 'VAT',           default: false },
  { key: 'manufacturer_warranty_months', label: 'BH hãng (tháng)', default: false },
  { key: 'reorder_point',   label: 'Điểm đặt hàng', default: false },
  { key: 'weight_kg',       label: 'Trọng lượng',   default: false },
  { key: 'qty_on_hand',     label: 'Tồn kho',       fixed: true },
]

// ── SKU flat-list hook ─────────────────────────────────────────────────────

function useSkuList() {
  const [page, setPageRaw]       = useState(1)
  const [limit, setLimitRaw]     = useState(50)
  const [searchInput, setSearchRaw] = useState('')
  const [productType, setProductTypeRaw] = useState<string | undefined>()
  const [categoryId, setCategoryRaw]     = useState<string | undefined>()
  const [brandId, setBrandRaw]           = useState<string | undefined>()

  const search = useDebounce(searchInput)

  function setPage(p: number)          { setPageRaw(p) }
  function setLimit(v: number)         { setLimitRaw(v); setPageRaw(1) }
  function setSearchInput(v: string)   { setSearchRaw(v); setPageRaw(1) }
  function setProductType(v: string | undefined) { setProductTypeRaw(v); setPageRaw(1) }
  function setCategoryId(v: string | undefined)  { setCategoryRaw(v); setPageRaw(1) }
  function setBrandId(v: string | undefined)     { setBrandRaw(v); setPageRaw(1) }

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['products-variants-flat', page, limit, search, productType, categoryId, brandId],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const params: Record<string, any> = { page, limit }
      if (search.trim()) params.search = search.trim()
      if (productType) params.product_type = productType
      if (categoryId)  params.category_id  = categoryId
      if (brandId)     params.brand_id     = brandId
      return (await api.get('/products/variants/list', { params })).data
    },
  })
  return {
    data, isLoading, isFetching,
    page, setPage, limit, setLimit,
    searchInput, setSearchInput,
    productType, setProductType,
    categoryId, setCategoryId,
    brandId, setBrandId,
  }
}

// ── Main component ─────────────────────────────────────────────────────────

export default function ProductsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const hook = useProducts()

  const [activeTab, setActiveTab] = useState<'products' | 'skus'>('products')
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importDragOver, setImportDragOver] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)

  const form = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: DEFAULT_PRODUCT_VALUES,
  })
  const productType = form.watch('product_type')
  const categoryIdWatch = form.watch('category_id')
  const brandIdWatch = form.watch('brand_id')
  const modelNumberWatch = form.watch('model_number')
  const codeWatch = form.watch('code')
  const nameWatch = form.watch('name')

  // Gợi ý mã sản phẩm = category.short_code + brand.short_code + mã dòng sản phẩm,
  // tự cập nhật mỗi khi 1 trong 3 field nguồn đổi — giữ đúng hành vi cũ (suggestCode).
  useEffect(() => {
    const category = hook.categories?.find((c: any) => c.id === categoryIdWatch)
    const brand = hook.brands?.find((b: any) => b.id === brandIdWatch)
    if (category?.short_code && brand?.short_code) {
      const base = `${category.short_code}-${brand.short_code}`
      form.setValue('code', modelNumberWatch ? `${base}-${modelNumberWatch}` : base)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryIdWatch, brandIdWatch, modelNumberWatch])

  // Với loại "Dịch vụ" — SKU/Tên SKU tự điền theo Mã sản phẩm/Tên (1 dịch vụ = 1 SKU duy nhất).
  useEffect(() => {
    if (productType === 'service') form.setValue('sku', codeWatch)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeWatch, productType])
  useEffect(() => {
    if (productType === 'service') form.setValue('variant_name', nameWatch)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nameWatch, productType])

  function openCreate() {
    form.reset(DEFAULT_PRODUCT_VALUES)
    hook.openCreate()
  }

  function closeCreate() {
    form.reset(DEFAULT_PRODUCT_VALUES)
    hook.closeAndResetModel()
  }

  function onSubmitCreate(values: ProductForm) {
    const payload: any = { ...values }
    if (!payload.brand_id) delete payload.brand_id
    if (values.product_type !== 'service') {
      delete payload.sku
      delete payload.variant_name
      delete payload.unit
      delete payload.sale_price
    } else if (payload.sale_price) {
      payload.sale_price = Number(payload.sale_price)
    }
    hook.createMutation.mutate(payload, { onSuccess: closeCreate })
  }

  async function handleDownloadTemplate() {
    try {
      const res = await api.get('/products/import/template', { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = 'import_products_template.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Tải file mẫu thất bại')
    }
  }

  async function handleImportFile(file: File) {
    setImporting(true)
    setImportResult(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.post('/products/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setImportResult(res.data)
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['products-variants-flat'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.invalidateQueries({ queryKey: ['brands'] })
      if ((res.data.errors?.length ?? 0) === 0) toast.success('Import thành công')
      else toast.warning('Import hoàn tất, một số dòng bị lỗi')
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? err.response?.data?.message ?? 'Import thất bại')
    } finally {
      setImporting(false)
    }
  }

  function closeImportModal() {
    setImportOpen(false)
    setImportResult(null)
  }

  const skuHook = useSkuList()

  const productCols = useColumnVisibility('products-page-products', PRODUCT_COLUMNS)
  const skuCols     = useColumnVisibility('products-page-skus', SKU_COLUMNS)

  // ── Data ─────────────────────────────────────────────────────────────────
  const products: any[] = hook.data?.data ?? []
  const total: number   = hook.data?.total ?? 0
  const from = total === 0 ? 0 : (hook.page - 1) * hook.limit + 1
  const to   = Math.min(hook.page * hook.limit, total)

  const skus: any[]    = skuHook.data?.data ?? []
  const skuTotal       = skuHook.data?.total ?? 0
  const skuFrom        = skuTotal === 0 ? 0 : (skuHook.page - 1) * skuHook.limit + 1
  const skuTo          = Math.min(skuHook.page * skuHook.limit, skuTotal)

  // ── Render ────────────────────────────────────────────────────────────────

  const brandCount = (hook.brands ?? []).length

  return (
    <div className="theme-2a -m-6 flex flex-col gap-4 bg-background p-6">

      {/* Header — port nguyên .kv-head/.kv-title/.kv-btn từ export/products.html (kv.css),
          giống InventoryPage, thay cho Button shadcn. */}
      <div className="kv-head">
        <div>
          <h1 className="kv-title">Sản phẩm</h1>
          <p className="kv-sub">
            {total.toLocaleString('vi-VN')} dòng sản phẩm · {skuTotal.toLocaleString('vi-VN')} SKU con
            {brandCount > 0 ? ` · ${brandCount} hãng` : ''}
          </p>
        </div>
        <div className="kv-actions">
          <button type="button" className="kv-btn" onClick={() => setImportOpen(true)}>
            <UploadIcon className="h-[17px] w-[17px]" /> Import Excel
          </button>
          <button type="button" className="kv-btn kv-btn--primary" onClick={openCreate}>
            <Plus className="h-[17px] w-[17px]" /> Tạo sản phẩm
          </button>
        </div>
      </div>

      <div className="kv-table-wrap">

        {/* Tab nav — port .kv-tabs/.kv-tab nguyên bản */}
        <div className="kv-tabs">
          {[
            { key: 'products', label: 'Sản phẩm' },
            { key: 'skus',     label: 'SKU' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              className="kv-tab"
              aria-current={activeTab === tab.key ? 'page' : undefined}
              onClick={() => setActiveTab(tab.key as any)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab: Sản phẩm ──────────────────────────────────────────────── */}
        {activeTab === 'products' && (
          <>
            {/* Toolbar — port .kv-toolbar/.kv-search/.kv-select nguyên bản (select thường) */}
            <div className="kv-toolbar">
              <div className="kv-search">
                <Search className="h-4 w-4" />
                <input
                  className="kv-input"
                  type="search"
                  placeholder="Tìm mã, tên sản phẩm…"
                  value={hook.searchInput}
                  onChange={(e) => hook.setSearchInput(e.target.value)}
                />
              </div>
              <select
                className="kv-select kv-select--auto"
                aria-label="Danh mục"
                value={hook.categoryId ?? '__all__'}
                onChange={(e) => hook.setCategoryId(e.target.value === '__all__' ? undefined : e.target.value)}
              >
                <option value="__all__">Tất cả danh mục</option>
                {(hook.categories ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select
                className="kv-select kv-select--auto"
                aria-label="Hãng"
                value={hook.brandId ?? '__all__'}
                onChange={(e) => hook.setBrandId(e.target.value === '__all__' ? undefined : e.target.value)}
              >
                <option value="__all__">Tất cả hãng</option>
                {(hook.brands ?? []).map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <select
                className="kv-select kv-select--auto"
                aria-label="Loại sản phẩm"
                value={hook.productType ?? '__all__'}
                onChange={(e) => hook.setProductType(e.target.value === '__all__' ? undefined : e.target.value)}
              >
                <option value="__all__">Tất cả loại</option>
                {PRODUCT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <div className="kv-spacer" />
              <span className="kv-muted" style={{ fontSize: 14 }}>{total.toLocaleString('vi-VN')} sản phẩm</span>
              <ColumnToggle tableId="products-page-products" columns={PRODUCT_COLUMNS} visible={productCols.visible} onToggle={productCols.toggle} />
            </div>

            {/* Table — port .kv-table nguyên bản */}
            <div className="overflow-x-auto">
            <table className="kv-table" style={{ minWidth: 900, tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: 40 }} />
                <col style={{ width: 150 }} />
                <col />
                {productCols.isVisible('product_type') && <col style={{ width: 130 }} />}
                {productCols.isVisible('brand_name') && <col style={{ width: 120 }} />}
                {productCols.isVisible('category_name') && <col style={{ width: 170 }} />}
                {productCols.isVisible('sku_count') && <col style={{ width: 90 }} />}
                <col style={{ width: 44 }} />
              </colgroup>
              <thead>
                <tr>
                  <th className="text-center">#</th>
                  <th className="text-left">Mã SP</th>
                  <th className="text-left">Tên sản phẩm</th>
                  {productCols.isVisible('product_type') && <th className="text-center">Loại</th>}
                  {productCols.isVisible('brand_name') && <th className="text-center">Hãng</th>}
                  {productCols.isVisible('category_name') && <th className="text-center">Danh mục</th>}
                  {productCols.isVisible('sku_count') && <th className="num">SKU con</th>}
                  <th />
                </tr>
              </thead>
              <tbody>
                {hook.isFetching && products.length === 0 ? (
                  <tr><td colSpan={8} className="kv-muted" style={{ padding: '32px 10px', textAlign: 'center' }}>Đang tải…</td></tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="flex flex-col items-center justify-center gap-3 py-16">
                        <Package className="h-10 w-10 opacity-20" />
                        <p className="kv-muted" style={{ fontSize: 14 }}>{hook.searchInput ? 'Không tìm thấy kết quả.' : 'Chưa có sản phẩm nào.'}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  products.map((p, i) => (
                    <tr key={p.id} onClick={() => navigate(`/products/${p.id}`)} className="kv-row-link group/row">
                      <td className="text-center kv-muted">{from + i}</td>
                      <td className="mono truncate" title={p.code ?? ''}>{p.code}</td>
                      <td>
                        <div className="kv-cell-title">{p.name}</div>
                        {p.name_en && <div className="kv-cell-sub">{p.name_en}</div>}
                      </td>
                      {productCols.isVisible('product_type') && (
                        <td className="text-center">
                          {p.product_type ? (
                            <span className={TYPE_STYLES[p.product_type] ?? 'kv-tag kv-tag--supply'}>
                              {TYPE_LABEL[p.product_type] ?? p.product_type}
                            </span>
                          ) : <span className="kv-muted">—</span>}
                        </td>
                      )}
                      {productCols.isVisible('brand_name') && <td className="text-center">{p.brand_name ?? '—'}</td>}
                      {productCols.isVisible('category_name') && <td className="text-center">{p.category_name ?? '—'}</td>}
                      {productCols.isVisible('sku_count') && <td className="num">{p.children?.length ?? 0}</td>}
                      <td className="num kv-caret">
                        <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover/row:opacity-100">
                          <Button
                            variant="ghost" size="icon-sm"
                            onClick={(e) => { e.stopPropagation(); setDeleteTarget(p) }}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div>

            {/* Pagination — port .kv-pager/.kv-pages/.kv-page nguyên bản */}
            {total > 0 && (
              <div className="kv-pager">
                <span>Hiển thị {from}–{to} trong {total.toLocaleString('vi-VN')} sản phẩm</span>
                <div className="kv-actions">
                  <select
                    className="kv-select kv-select--auto"
                    aria-label="Số dòng mỗi trang"
                    style={{ height: 32, fontSize: 13 }}
                    value={String(hook.limit)}
                    onChange={(e) => hook.setLimit(Number(e.target.value))}
                  >
                    {[10, 20, 50, 100].map((n) => (
                      <option key={n} value={n}>{n} dòng / trang</option>
                    ))}
                  </select>
                  <div className="kv-pages">
                    <button type="button" className="kv-page" aria-label="Trang trước" disabled={hook.page <= 1} onClick={() => hook.setPage(hook.page - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    {(() => {
                      const totalPages = Math.max(1, Math.ceil(total / hook.limit))
                      const start = Math.max(1, Math.min(hook.page - 2, totalPages - 4))
                      const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i)
                      return pages.map((p) => (
                        <button key={p} type="button" className="kv-page" aria-current={p === hook.page ? 'page' : undefined} onClick={() => hook.setPage(p)}>
                          {p}
                        </button>
                      ))
                    })()}
                    <button type="button" className="kv-page" aria-label="Trang sau" disabled={to >= total} onClick={() => hook.setPage(hook.page + 1)}>
                      <ChevronRightIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Tab: SKU ───────────────────────────────────────────────────── */}
        {activeTab === 'skus' && (
          <>
            {/* Toolbar — port .kv-toolbar nguyên bản */}
            <div className="kv-toolbar">
              <div className="kv-search">
                <Search className="h-4 w-4" />
                <input
                  className="kv-input"
                  type="search"
                  placeholder="Tìm mã hàng, tên SKU…"
                  value={skuHook.searchInput}
                  onChange={(e) => skuHook.setSearchInput(e.target.value)}
                />
              </div>
              <select
                className="kv-select kv-select--auto"
                aria-label="Danh mục"
                value={skuHook.categoryId ?? '__all__'}
                onChange={(e) => skuHook.setCategoryId(e.target.value === '__all__' ? undefined : e.target.value)}
              >
                <option value="__all__">Tất cả danh mục</option>
                {(hook.categories ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select
                className="kv-select kv-select--auto"
                aria-label="Hãng"
                value={skuHook.brandId ?? '__all__'}
                onChange={(e) => skuHook.setBrandId(e.target.value === '__all__' ? undefined : e.target.value)}
              >
                <option value="__all__">Tất cả hãng</option>
                {(hook.brands ?? []).map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <select
                className="kv-select kv-select--auto"
                aria-label="Loại sản phẩm"
                value={skuHook.productType ?? '__all__'}
                onChange={(e) => skuHook.setProductType(e.target.value === '__all__' ? undefined : e.target.value)}
              >
                <option value="__all__">Tất cả loại</option>
                {PRODUCT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <div className="kv-spacer" />
              <span className="kv-muted" style={{ fontSize: 14 }}>{skuTotal.toLocaleString('vi-VN')} SKU</span>
              <ColumnToggle tableId="products-page-skus" columns={SKU_COLUMNS} visible={skuCols.visible} onToggle={skuCols.toggle} />
            </div>

            {/* SKU table — port .kv-table nguyên bản */}
            <div className="overflow-x-auto">
              <table className="kv-table" style={{ minWidth: 900, tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: 40 }} />
                  <col style={{ width: 150 }} />
                  <col style={{ width: 210 }} />
                  <col />
                  {skuCols.isVisible('unit') && <col style={{ width: 64 }} />}
                  {skuCols.isVisible('cost_price') && <col style={{ width: 110 }} />}
                  {skuCols.isVisible('sale_price') && <col style={{ width: 110 }} />}
                  {skuCols.isVisible('vat_percent') && <col style={{ width: 64 }} />}
                  {skuCols.isVisible('manufacturer_warranty_months') && <col style={{ width: 96 }} />}
                  {skuCols.isVisible('reorder_point') && <col style={{ width: 96 }} />}
                  {skuCols.isVisible('weight_kg') && <col style={{ width: 80 }} />}
                  <col style={{ width: 90 }} />
                </colgroup>
                <thead>
                  <tr>
                    <th className="text-center">#</th>
                    <th className="text-left">Mã hàng</th>
                    <th className="text-left">Tên SKU</th>
                    <th className="text-left">Sản phẩm</th>
                    {skuCols.isVisible('unit') && <th className="text-center">ĐV</th>}
                    {skuCols.isVisible('cost_price') && <th className="num">Giá vốn</th>}
                    {skuCols.isVisible('sale_price') && <th className="num">Giá bán</th>}
                    {skuCols.isVisible('vat_percent') && <th className="text-center">VAT%</th>}
                    {skuCols.isVisible('manufacturer_warranty_months') && <th className="text-center">BH hãng (th)</th>}
                    {skuCols.isVisible('reorder_point') && <th className="text-center">Điểm ĐH</th>}
                    {skuCols.isVisible('weight_kg') && <th className="text-center">KL (kg)</th>}
                    <th className="text-center">Tồn kho</th>
                  </tr>
                </thead>
                <tbody>
                  {skuHook.isFetching && skus.length === 0 ? (
                    <tr><td colSpan={12} className="kv-muted" style={{ padding: '32px 10px', textAlign: 'center' }}>Đang tải…</td></tr>
                  ) : skus.length === 0 ? (
                    <tr><td colSpan={12} className="kv-muted" style={{ padding: '32px 10px', textAlign: 'center' }}>
                      {skuHook.searchInput ? 'Không tìm thấy kết quả.' : 'Chưa có SKU nào.'}
                    </td></tr>
                  ) : (
                    skus.map((v: any, i) => (
                      <tr
                        key={v.id}
                        onClick={() => navigate(`/products/${v.product_id}/variants/${v.id}`)}
                        className="kv-row-link"
                      >
                        <td className="text-center kv-muted">{skuFrom + i}</td>
                        <td className="mono truncate" title={v.item_code || v.sku || ''}>{v.item_code || v.sku || '—'}</td>
                        <td style={{ maxWidth: 0 }}><span className="block truncate" title={v.name ?? ''}>{v.name ?? '—'}</span></td>
                        <td>{v.product_name ?? '—'}</td>
                        {skuCols.isVisible('unit') && <td className="text-center">{v.unit ?? '—'}</td>}
                        {skuCols.isVisible('cost_price') && <td className="num">{v.cost_price != null ? Number(v.cost_price).toLocaleString('en-US') : '—'}</td>}
                        {skuCols.isVisible('sale_price') && <td className="num">{v.sale_price != null ? Number(v.sale_price).toLocaleString('en-US') : '—'}</td>}
                        {skuCols.isVisible('vat_percent') && <td className="text-center">{v.vat_percent != null ? `${v.vat_percent}%` : '—'}</td>}
                        {skuCols.isVisible('manufacturer_warranty_months') && <td className="text-center">{v.manufacturer_warranty_months != null ? v.manufacturer_warranty_months : '—'}</td>}
                        {skuCols.isVisible('reorder_point') && <td className="text-center">{v.reorder_point != null ? v.reorder_point : '—'}</td>}
                        {skuCols.isVisible('weight_kg') && <td className="text-center">{v.weight_kg != null ? v.weight_kg : '—'}</td>}
                        <td className="text-center">
                          <span className={cn('kv-strong', (v.qty_on_hand ?? 0) <= 0 && 'kv-muted')}>
                            {(v.qty_on_hand ?? 0).toLocaleString('vi-VN')}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* SKU Pagination — port .kv-pager nguyên bản */}
            {skuTotal > 0 && (
              <div className="kv-pager">
                <span>Hiển thị {skuFrom}–{skuTo} trong {skuTotal.toLocaleString('vi-VN')} SKU</span>
                <div className="kv-actions">
                  <select
                    className="kv-select kv-select--auto"
                    aria-label="Số dòng mỗi trang"
                    style={{ height: 32, fontSize: 13 }}
                    value={String(skuHook.limit)}
                    onChange={(e) => skuHook.setLimit(Number(e.target.value))}
                  >
                    {[10, 20, 50, 100].map((n) => (
                      <option key={n} value={n}>{n} dòng / trang</option>
                    ))}
                  </select>
                  <div className="kv-pages">
                  <button type="button" className="kv-page" aria-label="Trang trước" disabled={skuHook.page <= 1} onClick={() => skuHook.setPage(skuHook.page - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {(() => {
                    const totalPages = Math.max(1, Math.ceil(skuTotal / skuHook.limit))
                    const start = Math.max(1, Math.min(skuHook.page - 2, totalPages - 4))
                    const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i)
                    return pages.map((p) => (
                      <button
                        key={p}
                        type="button"
                        className="kv-page"
                        aria-current={p === skuHook.page ? 'page' : undefined}
                        onClick={() => skuHook.setPage(p)}
                      >
                        {p}
                      </button>
                    ))
                  })()}
                  <button type="button" className="kv-page" aria-label="Trang sau" disabled={skuTo >= skuTotal} onClick={() => skuHook.setPage(skuHook.page + 1)}>
                    <ChevronRightIcon className="h-4 w-4" />
                  </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete product dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="theme-2a">
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá sản phẩm?</AlertDialogTitle>
            <AlertDialogDescription>
              Sản phẩm <strong className="text-foreground">{deleteTarget?.name}</strong> sẽ bị xoá.
              Không thể xóa nếu còn tồn kho.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              variant="danger"
              onClick={() => { hook.deleteMutation.mutate(deleteTarget.id); setDeleteTarget(null) }}
            >
              Xoá
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create product Sheet */}
      <Sheet open={hook.open} onOpenChange={(o) => !o && closeCreate()}>
        <SheetContent side="right" className="theme-2a w-[480px] flex flex-col gap-0" showCloseButton={false}>
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">Tạo sản phẩm mới</h2>
          <button onClick={closeCreate} className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmitCreate)} className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <div className="flex flex-col gap-4">

                <FormField control={form.control} name="category_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category <span className="text-destructive">*</span></FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Chọn category" /></SelectTrigger>
                      </FormControl>
                      <SelectContent className="theme-2a">
                        {(hook.categories ?? []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {!hook.categories?.length && (
                      <FormDescription>Chưa có category nào — vào trang Danh mục SP để tạo trước.</FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="brand_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hãng</FormLabel>
                    <Select value={field.value || '__none__'} onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Chọn hãng" /></SelectTrigger>
                      </FormControl>
                      <SelectContent className="theme-2a">
                        <SelectItem value="__none__">Không chọn</SelectItem>
                        {(hook.brands ?? []).map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {!hook.brands?.length && <FormDescription>Chưa có hãng nào.</FormDescription>}
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="model_number" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mã dòng sản phẩm</FormLabel>
                    <FormControl><Input placeholder="VD: SG110" {...field} /></FormControl>
                    <FormDescription>Phân biệt các dòng SP khác nhau cùng Category+Hãng</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="code" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mã sản phẩm (tự gợi ý, có thể sửa) <span className="text-destructive">*</span></FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên <span className="text-destructive">*</span></FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="name_en" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên (English)</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="product_type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Loại <span className="text-destructive">*</span></FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent className="theme-2a">
                        {PRODUCT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mô tả</FormLabel>
                    <FormControl><Textarea rows={2} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {productType === 'service' && (
                  <>
                    <div className="border-t border-border pt-4 text-xs font-bold uppercase tracking-wide text-foreground">
                      Thông tin SKU dịch vụ
                    </div>
                    <FormField control={form.control} name="sku" render={({ field }) => (
                      <FormItem>
                        <FormLabel>SKU <span className="text-destructive">*</span></FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormDescription>Tự điền từ Mã sản phẩm</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="variant_name" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tên SKU <span className="text-destructive">*</span></FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormDescription>Tự điền từ Tên</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="unit" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Đơn vị</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                          </FormControl>
                          <SelectContent className="theme-2a">
                            {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="sale_price" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Giá dịch vụ</FormLabel>
                        <FormControl><Input type="number" min={0} {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-5 py-4">
              <Button type="button" variant="outline" onClick={closeCreate}>Huỷ</Button>
              <Button type="submit" disabled={hook.createMutation.isPending}>Tạo mới</Button>
            </div>
          </form>
        </Form>
        </SheetContent>
      </Sheet>

      {/* Import Excel dialog */}
      <Dialog open={importOpen} onOpenChange={(o) => !o && closeImportModal()}>
        <DialogContent className="theme-2a sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Sản phẩm / SKU từ Excel</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/30 px-3 py-2.5">
              <span className="text-sm text-muted-foreground">Chưa có file mẫu? Tải về để điền đúng định dạng.</span>
              <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="shrink-0">
                Tải file mẫu
              </Button>
            </div>

            <label
              onDragOver={(e) => { e.preventDefault(); setImportDragOver(true) }}
              onDragLeave={() => setImportDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setImportDragOver(false)
                const file = e.dataTransfer.files?.[0]
                if (file) handleImportFile(file)
              }}
              className={cn(
                'flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors',
                importDragOver ? 'border-primary bg-[var(--accent-bg)]' : 'border-border-md hover:bg-muted/40',
              )}
            >
              <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {importing ? 'Đang import…' : 'Kéo thả file Excel vào đây, hoặc bấm để chọn file'}
              </p>
              <input
                type="file"
                accept=".xlsx,.xls"
                disabled={importing}
                className="hidden"
                onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImportFile(file); e.target.value = '' }}
              />
            </label>

            {importResult && (
              <div className="flex flex-col gap-2 rounded-md border border-border px-3 py-2.5 text-sm">
                <div>Sản phẩm tạo mới: <strong>{importResult.created_products?.length ?? 0}</strong></div>
                <div>SKU tạo mới: <strong>{importResult.created_variants?.length ?? 0}</strong></div>
                {importResult.skipped?.length > 0 && (
                  <div className="text-[var(--s-pending-color)]">Bỏ qua (mã hàng đã tồn tại): <strong>{importResult.skipped.length}</strong></div>
                )}
                {importResult.errors?.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <span className="font-medium text-[var(--s-cancelled-color)]">Lỗi ({importResult.errors.length} dòng):</span>
                    <div className="max-h-48 overflow-y-auto rounded border border-[var(--s-cancelled-bg)] bg-[var(--s-cancelled-bg)] px-2.5 py-2">
                      {importResult.errors.map((e: any, i: number) => (
                        <div key={i} className="text-sm text-[var(--s-cancelled-color)]">
                          {e.sheet ? `[${e.sheet}] ` : ''}Dòng {e.row}: {e.reason}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
