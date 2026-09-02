import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Form as AntForm, Input as AntInput, Select as AntSelect,
  TreeSelect, Switch as AntSwitch, InputNumber,
} from 'antd'
import {
  ArrowLeft, Plus, Pencil, X, ChevronRight,
  Layers, Package,
} from 'lucide-react'
import { api } from '../lib/api'
import { useApiMutation } from '../hooks/useApiMutation'
import { moneyProps } from '../lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ColumnToggle, useColumnVisibility } from '@/components/ui/ColumnToggle'
import { cn } from '@/lib/utils'
import { CodeText } from '@/components/ui/CodeText'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { ImageUpload } from '../components/ImageUpload'

// ─── Constants ────────────────────────────────────────────────────────────────

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
  image_url:       z.string().optional(),
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
  marginBottom: 4,
}

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div style={full ? { gridColumn: '1 / -1' } : {}}>
      <div style={labelStyle}>{label}</div>
      {children}
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

  const skuCols = useColumnVisibility('products-sku', SKU_COLUMNS)
  const [editForm] = AntForm.useForm()

  const skuForm = useForm<SkuForm>({
    resolver: zodResolver(skuSchema),
    defaultValues: {
      item_code: '', name: '', unit: '',
      cost_price: '', sale_price: '', vat_percent: '',
      model: '', part_number: '',
      warranty_months: '', reorder_point: '', weight_kg: '',
      is_active: true, image_url: '',
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
      if (values.image_url       !== '' && values.image_url       != null) body.image_url       = values.image_url
      return (await api.post(`/products/${id}/variants`, body)).data
    },
    {
      successMessage: 'Đã tạo SKU',
      invalidateKey: [['product-detail', id], ['inventory-by-product', id]],
      onSuccess: () => closeSkuSheet(),
    },
  )

  // ── Edit form setup ───────────────────────────────────────────────────────

  // Form luôn hiển thị input (kể cả ở chế độ xem, disabled) nên phải đồng bộ
  // giá trị mỗi khi product thay đổi — không chỉ lúc bấm Sửa.
  useEffect(() => {
    if (product) {
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
  }, [product, editForm])

  function cancelProductEdit() {
    if (product) {
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
    setIsEditing(false)
  }

  async function saveProductEdit() {
    const values = await editForm.validateFields()
    updateProduct.mutate(values)
  }

  // ── SKU sheet helpers ─────────────────────────────────────────────────────

  function openCreateSku() {
    skuForm.reset({
      item_code: product?.code ? `${product.code}-` : '',
      name: '', unit: '', cost_price: '', sale_price: '', vat_percent: '',
      model: '', part_number: '', warranty_months: '', reorder_point: '', weight_kg: '',
      is_active: true, image_url: '',
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
      <div className="overflow-hidden rounded-xl border border-border-md bg-background shadow-sm">
        {/* Card header */}
        <div className="flex items-start justify-between gap-4 border-b border-border bg-muted/60 px-5 py-4">
          <div className="flex flex-col gap-1.5 min-w-0">
            <h2 className="text-base font-semibold text-foreground leading-snug truncate">{product.name}</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <CodeText>{product.code}</CodeText>
              {product.product_type && (
                <span className={cn('text-sm font-medium', TYPE_STYLES[product.product_type] ?? 'text-muted-foreground')}>
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
                <Button variant="ghost" size="sm" onClick={cancelProductEdit}>
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
          <AntForm form={editForm} layout="vertical">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '22px 28px' }}>
              <Field label="Danh mục *">
                <AntForm.Item name="category_id" noStyle rules={[{ required: true, message: 'Bắt buộc' }]}>
                  <TreeSelect treeData={categoryTree} showSearch treeNodeFilterProp="title" treeDefaultExpandAll style={{ width: '100%' }} allowClear disabled={!isEditing} />
                </AntForm.Item>
              </Field>
              <Field label="Hãng">
                <AntForm.Item name="brand_id" noStyle>
                  <AntSelect showSearch optionFilterProp="label" options={(brands ?? []).map((b: any) => ({ value: b.id, label: b.name }))} allowClear style={{ width: '100%' }} disabled={!isEditing} />
                </AntForm.Item>
              </Field>
              <Field label="Loại sản phẩm *">
                <AntForm.Item name="product_type" noStyle rules={[{ required: true, message: 'Bắt buộc' }]}>
                  <AntSelect options={PRODUCT_TYPES} style={{ width: '100%' }} disabled={!isEditing} />
                </AntForm.Item>
              </Field>
              <Field label="Mã dòng sản phẩm">
                <AntForm.Item name="model_number" noStyle>
                  <AntInput placeholder="VD: SG110" style={{ width: 200 }} disabled={!isEditing} />
                </AntForm.Item>
              </Field>
              <Field label="Mã sản phẩm *">
                <AntForm.Item name="code" noStyle rules={[{ required: true, message: 'Bắt buộc' }]}>
                  <AntInput style={{ width: 200 }} disabled={!isEditing} />
                </AntForm.Item>
              </Field>
              <Field label="Trạng thái">
                <div style={{ paddingTop: 4 }}>
                  <AntForm.Item name="is_active" noStyle valuePropName="checked">
                    <AntSwitch checkedChildren="Active" unCheckedChildren="Inactive" disabled={!isEditing} />
                  </AntForm.Item>
                </div>
              </Field>
              <Field label="Tên *" full>
                <AntForm.Item name="name" noStyle rules={[{ required: true, message: 'Bắt buộc' }]}>
                  <AntInput style={{ width: '100%' }} disabled={!isEditing} />
                </AntForm.Item>
              </Field>
              <Field label="Tên (English)" full>
                <AntForm.Item name="name_en" noStyle>
                  <AntInput style={{ width: '100%' }} disabled={!isEditing} />
                </AntForm.Item>
              </Field>
              <Field label="Mô tả" full>
                <AntForm.Item name="description" noStyle>
                  <AntInput.TextArea rows={3} style={{ width: '100%' }} disabled={!isEditing} />
                </AntForm.Item>
              </Field>
            </div>
          </AntForm>
        </div>
      </div>

      {/* SKU table */}
      <div className="overflow-hidden rounded-xl border border-border-md bg-background shadow-sm">
        <div className="flex items-center justify-between border-b border-border bg-muted/60 px-4 py-2.5">
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
                <tr className="border-b border-border bg-muted/60">
                  <th className="w-40 px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Mã hàng</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Tên SKU</th>
                  {skuCols.isVisible('model')       && <th className="w-32 px-3 py-2.5 text-left   text-xs font-semibold text-muted-foreground">Model</th>}
                  {skuCols.isVisible('part_number') && <th className="w-40 px-3 py-2.5 text-left   text-xs font-semibold text-muted-foreground">Part Number</th>}
                  {skuCols.isVisible('unit')        && <th className="w-16 px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground">ĐV</th>}
                  {skuCols.isVisible('cost_price')  && <th className="w-28 px-3 py-2.5 text-right  text-xs font-semibold text-muted-foreground">Giá vốn</th>}
                  {skuCols.isVisible('sale_price')  && <th className="w-28 px-3 py-2.5 text-right  text-xs font-semibold text-muted-foreground">Giá bán</th>}
                  {skuCols.isVisible('vat_percent') && <th className="w-16 px-3 py-2.5 text-right  text-xs font-semibold text-muted-foreground">VAT%</th>}
                  {skuCols.isVisible('weight_kg')   && <th className="w-20 px-3 py-2.5 text-right  text-xs font-semibold text-muted-foreground">KL (kg)</th>}
                  {skuCols.isVisible('qty')         && <th className="w-20 px-3 py-2.5 text-right  text-xs font-semibold text-muted-foreground">Tồn kho</th>}
                  {skuCols.isVisible('avail')       && <th className="w-24 px-3 py-2.5 text-right  text-xs font-semibold text-muted-foreground">Khả dụng</th>}
                  {skuCols.isVisible('warehouse')   && <th className="px-4 py-2.5 text-left        text-xs font-semibold text-muted-foreground">Phân bổ kho</th>}
                  <th className="w-10 px-2 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {variantsWithStock.map((v: any) => {
                  const breakdown: any[] = v.warehouse_breakdown ?? []
                  const qtyOnHand = v.qty_on_hand ?? 0
                  const qtyAvail  = v.qty_available ?? 0
                  return (
                    <tr key={v.id} onClick={() => navigate(`/products/${id}/variants/${v.id}`)} className="group/row cursor-pointer transition-colors hover:bg-muted/30">
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
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
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

      {/* SKU sheet */}
      <Sheet open={skuOpen} onOpenChange={(o) => !o && closeSkuSheet()}>
        <SheetContent side="right" className="w-[840px] sm:max-w-[840px] flex flex-col gap-0" showCloseButton={false}>
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold">Tạo SKU mới</h2>
            <p className="text-xs text-muted-foreground">{product.name}</p>
          </div>
          <button onClick={closeSkuSheet} className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <Form {...skuForm}>
          <form onSubmit={skuForm.handleSubmit((v) => skuMutation.mutate(v))} className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <div className="flex gap-6">
              <div className="w-[200px] shrink-0 flex flex-col gap-2">
                <FormField control={skuForm.control} name="image_url" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Hình ảnh</FormLabel>
                    <FormControl>
                      <div className="product-image-upload aspect-square w-full">
                        <ImageUpload value={field.value || undefined} onChange={(url) => field.onChange(url ?? '')} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-4">

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
                  <p className="mb-3 text-xs font-semibold text-muted-foreground">Giá</p>
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
                  <p className="mb-3 text-xs font-semibold text-muted-foreground">Thông số kỹ thuật</p>
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
              </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-5 py-4">
              <Button type="button" variant="outline" onClick={closeSkuSheet}>Huỷ</Button>
              <Button type="submit" disabled={skuMutation.isPending}>
                {skuMutation.isPending ? 'Đang lưu…' : 'Tạo SKU'}
              </Button>
            </div>
          </form>
        </Form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
