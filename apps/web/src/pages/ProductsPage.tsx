import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { Form as AntForm, Input as AntInput, Select as AntSelect, Divider, InputNumber } from 'antd'
import {
  Plus, Search, Trash2, ChevronLeft, ChevronRight as ChevronRightIcon, X, Package,
} from 'lucide-react'
import { useProducts } from '../hooks/useProducts'
import { useDebounce } from '../hooks/useDebounce'
import { api } from '../lib/api'
import { moneyProps } from '../lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { PageSizeSelector } from '@/components/ui/PageSizeSelector'
import { cn } from '@/lib/utils'
import { CodeText } from '@/components/ui/CodeText'
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
const TYPE_STYLES: Record<string, string> = {
  storable:   'text-blue-700',
  consumable: 'text-amber-700',
  service:    'text-purple-700',
  bundle:     'text-teal-700',
}
const TYPE_LABEL: Record<string, string> = {
  storable: 'Thiết bị', consumable: 'Vật tư', service: 'Dịch vụ', bundle: 'Gói SP',
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
  { key: 'warranty_months', label: 'BH (tháng)',    default: false },
  { key: 'reorder_point',   label: 'Điểm đặt hàng', default: false },
  { key: 'weight_kg',       label: 'Trọng lượng',   default: false },
  { key: 'qty_on_hand',     label: 'Tồn kho',       fixed: true },
]

// ── SKU flat-list hook ─────────────────────────────────────────────────────

function useSkuList(categories: any[], brands: any[]) {
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
  const hook = useProducts()
  const productType = AntForm.useWatch('product_type', hook.form)

  const [activeTab, setActiveTab] = useState<'products' | 'skus'>('products')
  const [deleteTarget, setDeleteTarget] = useState<any>(null)

  const skuHook = useSkuList(hook.categories ?? [], hook.brands ?? [])

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
  return (
    <div className="flex flex-col gap-5">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sản phẩm</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Quản lý danh mục sản phẩm và SKU</p>
        </div>
        <Button onClick={() => hook.openCreate()}>
          <Plus className="mr-2 h-4 w-4" />
          Tạo sản phẩm
        </Button>
      </div>

      {/* Tabs */}
      <div className="overflow-hidden rounded-xl border border-border-md bg-background shadow-sm">

        {/* Tab nav */}
        <div className="flex items-center gap-0 border-b border-border px-4 pt-3">
          {[
            { key: 'products', label: 'Sản phẩm' },
            { key: 'skus',     label: 'SKU' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={cn(
                'relative -mb-px pb-3 px-4 text-sm font-medium transition-colors',
                activeTab === tab.key
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab: Sản phẩm ──────────────────────────────────────────────── */}
        {activeTab === 'products' && (
          <>
            {/* Toolbar */}
            <div className="flex flex-col gap-2 border-b border-border px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Tìm mã, tên sản phẩm…"
                      value={hook.searchInput}
                      onChange={(e) => hook.setSearchInput(e.target.value)}
                      className="h-9 w-56 pl-9 text-sm shadow-none focus-visible:ring-1"
                    />
                  </div>
                  <Select value={hook.categoryId ?? '__all__'} onValueChange={(v) => hook.setCategoryId(v === '__all__' ? undefined : v)}>
                    <SelectTrigger className="h-9 w-40 text-sm shadow-none"><SelectValue placeholder="Danh mục" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Tất cả danh mục</SelectItem>
                      {(hook.categories ?? []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={hook.brandId ?? '__all__'} onValueChange={(v) => hook.setBrandId(v === '__all__' ? undefined : v)}>
                    <SelectTrigger className="h-9 w-32 text-sm shadow-none"><SelectValue placeholder="Hãng" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Tất cả hãng</SelectItem>
                      {(hook.brands ?? []).map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={hook.productType ?? '__all__'} onValueChange={(v) => hook.setProductType(v === '__all__' ? undefined : v)}>
                    <SelectTrigger className="h-9 w-36 text-sm shadow-none"><SelectValue placeholder="Loại" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Tất cả loại</SelectItem>
                      {PRODUCT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{total.toLocaleString('vi-VN')} sản phẩm</span>
                  <ColumnToggle tableId="products-page-products" columns={PRODUCT_COLUMNS} visible={productCols.visible} onToggle={productCols.toggle} />
                </div>
              </div>
            </div>

            {/* Table */}
            <table className="w-full">
              <colgroup>
                <col className="w-10" />
                <col className="w-36" />
                <col />
                {productCols.isVisible('product_type') && <col className="w-24" />}
                {productCols.isVisible('brand_name') && <col className="w-32" />}
                {productCols.isVisible('category_name') && <col className="w-48" />}
                {productCols.isVisible('sku_count') && <col className="w-14" />}
                <col className="w-8" />
              </colgroup>
              <thead>
                <tr className="border-b border-border bg-muted/60">
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">#</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Mã SP</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Tên sản phẩm</th>
                  {productCols.isVisible('product_type') && (
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">Loại</th>
                  )}
                  {productCols.isVisible('brand_name') && (
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">Hãng</th>
                  )}
                  {productCols.isVisible('category_name') && (
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">Danh mục</th>
                  )}
                  {productCols.isVisible('sku_count') && (
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">SKU</th>
                  )}
                  <th className="w-8 px-2 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {hook.isFetching && products.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-xs text-muted-foreground">Đang tải…</td></tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
                        <Package className="h-10 w-10 opacity-20" />
                        <p className="text-sm">{hook.searchInput ? 'Không tìm thấy kết quả.' : 'Chưa có sản phẩm nào.'}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  products.map((p, i) => (
                    <tr
                      key={p.id}
                      onClick={() => navigate(`/products/${p.id}`)}
                      className="group/row cursor-pointer transition-colors hover:bg-muted/30"
                    >
                      <td className="px-4 py-2.5 text-center text-xs text-muted-foreground">{from + i}</td>
                      <td className="w-56 px-4 py-2.5"><CodeText>{p.code}</CodeText></td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{p.name}</span>
                          {p.name_en && <span className="text-xs text-muted-foreground">{p.name_en}</span>}
                        </div>
                      </td>
                      {productCols.isVisible('product_type') && (
                        <td className="px-4 py-2.5 text-center">
                          {p.product_type ? (
                            <span className={cn('text-sm font-medium', TYPE_STYLES[p.product_type] ?? 'text-muted-foreground')}>
                              {TYPE_LABEL[p.product_type] ?? p.product_type}
                            </span>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </td>
                      )}
                      {productCols.isVisible('brand_name') && <td className="px-4 py-2.5 text-center text-sm text-foreground">{p.brand_name ?? '—'}</td>}
                      {productCols.isVisible('category_name') && <td className="px-4 py-2.5 text-center text-sm text-foreground">{p.category_name ?? '—'}</td>}
                      {productCols.isVisible('sku_count') && <td className="px-4 py-2.5 text-center text-sm text-foreground">{p.children?.length ?? 0}</td>}
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover/row:opacity-100">
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteTarget(p) }}
                            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
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

            {/* Pagination */}
            {total > 0 && (
              <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{from}–{to} / {total} sản phẩm</span>
                  <PageSizeSelector value={hook.limit} onChange={hook.setLimit} />
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" disabled={hook.page <= 1} onClick={() => hook.setPage(hook.page - 1)} className="h-7 w-7 p-0">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="min-w-[3rem] text-center text-xs text-muted-foreground">{hook.page} / {Math.ceil(total / hook.limit)}</span>
                  <Button variant="ghost" size="sm" disabled={to >= total} onClick={() => hook.setPage(hook.page + 1)} className="h-7 w-7 p-0">
                    <ChevronRightIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Tab: SKU ───────────────────────────────────────────────────── */}
        {activeTab === 'skus' && (
          <>
            {/* Toolbar */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Tìm mã hàng, tên SKU…"
                    value={skuHook.searchInput}
                    onChange={(e) => skuHook.setSearchInput(e.target.value)}
                    className="h-9 w-56 pl-9 text-sm shadow-none focus-visible:ring-1"
                  />
                </div>
                <Select value={skuHook.categoryId ?? '__all__'} onValueChange={(v) => skuHook.setCategoryId(v === '__all__' ? undefined : v)}>
                  <SelectTrigger className="h-9 w-40 text-sm shadow-none"><SelectValue placeholder="Danh mục" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Tất cả danh mục</SelectItem>
                    {(hook.categories ?? []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={skuHook.brandId ?? '__all__'} onValueChange={(v) => skuHook.setBrandId(v === '__all__' ? undefined : v)}>
                  <SelectTrigger className="h-9 w-32 text-sm shadow-none"><SelectValue placeholder="Hãng" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Tất cả hãng</SelectItem>
                    {(hook.brands ?? []).map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={skuHook.productType ?? '__all__'} onValueChange={(v) => skuHook.setProductType(v === '__all__' ? undefined : v)}>
                  <SelectTrigger className="h-9 w-36 text-sm shadow-none"><SelectValue placeholder="Loại" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Tất cả loại</SelectItem>
                    {PRODUCT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{skuTotal.toLocaleString('vi-VN')} SKU</span>
                <ColumnToggle tableId="products-page-skus" columns={SKU_COLUMNS} visible={skuCols.visible} onToggle={skuCols.toggle} />
              </div>
            </div>

            {/* SKU table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <colgroup>
                  <col className="w-10" />
                  <col className="w-36" />
                  <col className="w-52" />
                  <col />
                  {skuCols.isVisible('unit') && <col className="w-16" />}
                  {skuCols.isVisible('cost_price') && <col className="w-28" />}
                  {skuCols.isVisible('sale_price') && <col className="w-28" />}
                  {skuCols.isVisible('vat_percent') && <col className="w-16" />}
                  {skuCols.isVisible('warranty_months') && <col className="w-24" />}
                  {skuCols.isVisible('reorder_point') && <col className="w-24" />}
                  {skuCols.isVisible('weight_kg') && <col className="w-20" />}
                  <col className="w-20" />
                </colgroup>
                <thead>
                  <tr className="border-b border-border bg-muted/60">
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">#</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Mã hàng</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Tên SKU</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Sản phẩm</th>
                    {skuCols.isVisible('unit') && <th className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground">ĐV</th>}
                    {skuCols.isVisible('cost_price') && <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">Giá vốn</th>}
                    {skuCols.isVisible('sale_price') && <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">Giá bán</th>}
                    {skuCols.isVisible('vat_percent') && <th className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground">VAT%</th>}
                    {skuCols.isVisible('warranty_months') && <th className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground">BH (tháng)</th>}
                    {skuCols.isVisible('reorder_point') && <th className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground">Điểm ĐH</th>}
                    {skuCols.isVisible('weight_kg') && <th className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground">KL (kg)</th>}
                    <th className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground">Tồn kho</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {skuHook.isFetching && skus.length === 0 ? (
                    <tr><td colSpan={12} className="px-4 py-12 text-center text-xs text-muted-foreground">Đang tải…</td></tr>
                  ) : skus.length === 0 ? (
                    <tr><td colSpan={12} className="px-4 py-12 text-center text-xs text-muted-foreground">
                      {skuHook.searchInput ? 'Không tìm thấy kết quả.' : 'Chưa có SKU nào.'}
                    </td></tr>
                  ) : (
                    skus.map((v: any, i) => (
                      <tr
                        key={v.id}
                        onClick={() => navigate(`/products/${v.product_id}/variants/${v.id}`)}
                        className="cursor-pointer transition-colors hover:bg-muted/30"
                      >
                        <td className="px-4 py-2.5 text-center text-xs text-muted-foreground">{skuFrom + i}</td>
                        <td className="px-4 py-2.5">
                          <CodeText>{v.item_code || v.sku || '—'}</CodeText>
                        </td>
                        <td className="max-w-0 px-4 py-2.5"><span className="block truncate text-sm">{v.name ?? '—'}</span></td>
                        <td className="px-4 py-2.5 text-sm text-foreground">{v.product_name ?? '—'}</td>
                        {skuCols.isVisible('unit') && <td className="px-3 py-2.5 text-center text-sm text-foreground">{v.unit ?? '—'}</td>}
                        {skuCols.isVisible('cost_price') && <td className="px-3 py-2.5 text-center text-sm tabular-nums text-foreground">{v.cost_price != null ? Number(v.cost_price).toLocaleString('en-US') : '—'}</td>}
                        {skuCols.isVisible('sale_price') && <td className="px-3 py-2.5 text-center text-sm tabular-nums text-foreground">{v.sale_price != null ? Number(v.sale_price).toLocaleString('en-US') : '—'}</td>}
                        {skuCols.isVisible('vat_percent') && <td className="px-3 py-2.5 text-center text-sm tabular-nums text-foreground">{v.vat_percent != null ? `${v.vat_percent}%` : '—'}</td>}
                        {skuCols.isVisible('warranty_months') && <td className="px-3 py-2.5 text-center text-sm tabular-nums text-foreground">{v.warranty_months != null ? v.warranty_months : '—'}</td>}
                        {skuCols.isVisible('reorder_point') && <td className="px-3 py-2.5 text-center text-sm tabular-nums text-foreground">{v.reorder_point != null ? v.reorder_point : '—'}</td>}
                        {skuCols.isVisible('weight_kg') && <td className="px-3 py-2.5 text-center text-sm tabular-nums text-foreground">{v.weight_kg != null ? v.weight_kg : '—'}</td>}
                        <td className="px-3 py-2.5 text-center">
                          <span className={cn('tabular-nums text-sm font-medium', (v.qty_on_hand ?? 0) > 0 ? 'text-foreground' : 'text-muted-foreground')}>
                            {(v.qty_on_hand ?? 0).toLocaleString('vi-VN')}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* SKU Pagination */}
            {skuTotal > 0 && (
              <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{skuFrom}–{skuTo} / {skuTotal} SKU</span>
                  <PageSizeSelector value={skuHook.limit} onChange={skuHook.setLimit} />
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" disabled={skuHook.page <= 1} onClick={() => skuHook.setPage(skuHook.page - 1)} className="h-7 w-7 p-0">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="min-w-[3rem] text-center text-xs text-muted-foreground">{skuHook.page} / {Math.ceil(skuTotal / skuHook.limit)}</span>
                  <Button variant="ghost" size="sm" disabled={skuTo >= skuTotal} onClick={() => skuHook.setPage(skuHook.page + 1)} className="h-7 w-7 p-0">
                    <ChevronRightIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete product dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
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
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              onClick={() => { hook.deleteMutation.mutate(deleteTarget.id); setDeleteTarget(null) }}
            >
              Xoá
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create product Sheet */}
      <Sheet open={hook.open} onOpenChange={(o) => !o && hook.closeAndResetModel()}>
        <SheetContent side="right" className="w-[480px] flex flex-col gap-0" showCloseButton={false}>
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold">Tạo sản phẩm mới</h2>
          <button onClick={hook.closeAndResetModel} className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <AntForm form={hook.form} layout="vertical" onFinish={(v) => hook.createMutation.mutate(v)} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-5 py-5">
            <AntForm.Item name="category_id" label="Category" rules={[{ required: true }]}
              extra={!hook.categories?.length ? 'Chưa có category nào — vào trang Category để tạo trước.' : undefined}>
              <AntSelect showSearch optionFilterProp="label"
                options={hook.categories?.map((c: any) => ({ value: c.id, label: c.name }))}
                onChange={() => hook.suggestCode()} />
            </AntForm.Item>
            <AntForm.Item name="brand_id" label="Hãng"
              extra={!hook.brands?.length ? 'Chưa có hãng nào.' : undefined}>
              <AntSelect showSearch optionFilterProp="label"
                options={hook.brands?.map((b: any) => ({ value: b.id, label: b.name }))}
                onChange={() => hook.suggestCode()} allowClear />
            </AntForm.Item>
            <AntForm.Item name="model_number" label="Mã dòng sản phẩm"
              extra="Phân biệt các dòng SP khác nhau cùng Category+Hãng">
              <AntInput placeholder="VD: SG110" onChange={(e) => { hook.setModelCode(e.target.value); hook.suggestCode(e.target.value) }} />
            </AntForm.Item>
            <AntForm.Item name="code" label="Mã sản phẩm (tự gợi ý, có thể sửa)" rules={[{ required: true }]}>
              <AntInput onChange={(e) => { if (hook.form.getFieldValue('product_type') === 'service') hook.form.setFieldValue('sku', e.target.value) }} />
            </AntForm.Item>
            <AntForm.Item name="name" label="Tên" rules={[{ required: true }]}>
              <AntInput onChange={(e) => { if (hook.form.getFieldValue('product_type') === 'service') hook.form.setFieldValue('variant_name', e.target.value) }} />
            </AntForm.Item>
            <AntForm.Item name="name_en" label="Tên (English)"><AntInput /></AntForm.Item>
            <AntForm.Item name="product_type" label="Loại" rules={[{ required: true }]}>
              <AntSelect options={PRODUCT_TYPES} />
            </AntForm.Item>
            <AntForm.Item name="description" label="Mô tả"><AntInput.TextArea /></AntForm.Item>
            {productType === 'service' && (
              <>
                <Divider orientation="left" style={{ fontSize: 13, color: 'var(--text-2)' }}>Thông tin SKU dịch vụ</Divider>
                <AntForm.Item name="sku" label="SKU" rules={[{ required: true }]} extra="Tự điền từ Mã sản phẩm"><AntInput /></AntForm.Item>
                <AntForm.Item name="variant_name" label="Tên SKU" rules={[{ required: true }]} extra="Tự điền từ Tên"><AntInput /></AntForm.Item>
                <AntForm.Item name="unit" label="Đơn vị" initialValue="Lần">
                  <AntSelect options={UNITS.map((u) => ({ value: u, label: u }))} showSearch allowClear />
                </AntForm.Item>
                <AntForm.Item name="sale_price" label="Giá dịch vụ">
                  <InputNumber {...moneyProps} min={0} />
                </AntForm.Item>
              </>
            )}
          </div>
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-5 py-4">
            <Button type="button" variant="outline" onClick={hook.closeAndResetModel}>Huỷ</Button>
            <Button type="button" disabled={hook.createMutation.isPending} onClick={() => hook.form.submit()}>Tạo mới</Button>
          </div>
        </AntForm>
        </SheetContent>
      </Sheet>
    </div>
  )
}
