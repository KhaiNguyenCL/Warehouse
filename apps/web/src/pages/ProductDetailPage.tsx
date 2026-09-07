import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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
import { ColumnToggle, useColumnVisibility } from '@/components/ui/ColumnToggle'
import { cn } from '@/lib/utils'
import { CodeText } from '@/components/ui/CodeText'

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

function Field({ label, span = 2, children }: { label: string; span?: number; children: React.ReactNode }) {
  return (
    <div style={{ gridColumn: `span ${span}` }}>
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

  const skuCols = useColumnVisibility('products-sku', SKU_COLUMNS)
  const [editForm] = AntForm.useForm()

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
        <span className="font-medium text-foreground truncate max-w-xs" title={product.name}>{product.name}</span>
      </div>

      {/* Product info card */}
      <div className="overflow-hidden rounded-xl border border-border-md bg-background shadow-sm">
        {/* Card header */}
        <div className="flex items-start justify-between gap-4 border-b border-border bg-muted/60 px-5 py-4">
          <div className="flex flex-col gap-1.5 min-w-0">
            <h2 className="text-base font-semibold text-foreground leading-snug truncate" title={product.name}>{product.name}</h2>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '22px 28px' }}>
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
                  <AntInput placeholder="VD: SG110" style={{ width: '100%' }} disabled={!isEditing} />
                </AntForm.Item>
              </Field>
              <Field label="Mã sản phẩm *">
                <AntForm.Item name="code" noStyle rules={[{ required: true, message: 'Bắt buộc' }]}>
                  <AntInput style={{ width: '100%' }} disabled={!isEditing} />
                </AntForm.Item>
              </Field>
              <Field label="Trạng thái">
                <div style={{ paddingTop: 4 }}>
                  <AntForm.Item name="is_active" noStyle valuePropName="checked">
                    <AntSwitch checkedChildren="Active" unCheckedChildren="Inactive" disabled={!isEditing} />
                  </AntForm.Item>
                </div>
              </Field>
              <Field label="Tên *" span={3}>
                <AntForm.Item name="name" noStyle rules={[{ required: true, message: 'Bắt buộc' }]}>
                  <AntInput style={{ width: '100%' }} disabled={!isEditing} />
                </AntForm.Item>
              </Field>
              <Field label="Tên (English)" span={3}>
                <AntForm.Item name="name_en" noStyle>
                  <AntInput style={{ width: '100%' }} disabled={!isEditing} />
                </AntForm.Item>
              </Field>
              <Field label="Mô tả" span={6}>
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
              <Button size="sm" onClick={() => navigate(`/products/${id}/variants/create`)}><Plus className="mr-1.5 h-3.5 w-3.5" />Thêm SKU</Button>
            )}
          </div>
        </div>

        {variantsWithStock.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
            <p className="text-sm">Chưa có SKU nào</p>
            {product.product_type !== 'service' && (
              <Button size="sm" variant="outline" onClick={() => navigate(`/products/${id}/variants/create`)}><Plus className="mr-1.5 h-3.5 w-3.5" />Tạo SKU đầu tiên</Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/60">
                  <th className="w-32 px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Mã hàng</th>
                  <th className="min-w-[220px] px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Tên SKU</th>
                  {skuCols.isVisible('model')       && <th className="w-20 px-3 py-2.5 text-left   text-xs font-semibold text-muted-foreground">Model</th>}
                  {skuCols.isVisible('part_number') && <th className="w-36 px-3 py-2.5 text-left   text-xs font-semibold text-muted-foreground">Part Number</th>}
                  {skuCols.isVisible('unit')        && <th className="w-16 px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground">ĐV</th>}
                  {skuCols.isVisible('cost_price')  && <th className="w-24 px-3 py-2.5 text-right  text-xs font-semibold text-muted-foreground">Giá vốn</th>}
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
                      <td className="w-32 truncate px-4 py-2.5" title={v.item_code || v.sku || ''}>
                        <CodeText>{v.item_code || v.sku || '—'}</CodeText>
                      </td>
                      <td className="max-w-0 px-4 py-2.5"><span className="block truncate text-sm text-foreground" title={v.name}>{v.name ?? '—'}</span></td>
                      {skuCols.isVisible('model')       && <td className="w-20 truncate px-3 py-2.5 font-mono text-sm text-foreground" title={v.model ?? ''}>{v.model ?? '—'}</td>}
                      {skuCols.isVisible('part_number') && <td className="w-36 truncate px-3 py-2.5 font-mono text-sm text-foreground" title={v.part_number ?? ''}>{v.part_number ?? '—'}</td>}
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

    </div>
  )
}
