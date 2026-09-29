import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '../lib/api'
import { useApiMutation } from '../hooks/useApiMutation'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

// ─── Constants ────────────────────────────────────────────────────────────────

const PRODUCT_TYPES = [
  { value: 'storable',   label: 'Thiết bị' },
  { value: 'consumable', label: 'Vật tư' },
  { value: 'service',    label: 'Dịch vụ' },
  { value: 'bundle',     label: 'Gói sản phẩm' },
]
const UNITS = ['Cái', 'Chiếc', 'Bộ', 'Hộp', 'Cuộn', 'Mét', 'Cổng', 'License', 'Gói', 'Dây', 'Lần', 'Giờ', 'Ngày']

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Danh mục có phân cấp (parent_id) — mockup (product-detail.html) dùng <select> phẳng, không
// phải TreeSelect — làm phẳng cây thành list có độ sâu, thụt lề bằng dấu "—" để vẫn thấy phân
// cấp trong 1 <select> thường.
function flattenCategories(flat: any[]): { id: string; name: string; depth: number }[] {
  const byParent: Record<string, any[]> = {}
  flat.forEach((c) => {
    const key = c.parent_id ?? '__root__'
    ;(byParent[key] ??= []).push(c)
  })
  const result: { id: string; name: string; depth: number }[] = []
  function walk(parentKey: string, depth: number) {
    for (const c of byParent[parentKey] ?? []) {
      result.push({ id: c.id, name: c.name, depth })
      walk(c.id, depth + 1)
    }
  }
  walk('__root__', 0)
  return result
}

function fmtMoney(v: number | string | null | undefined) {
  return v == null || v === '' ? '—' : Number(v).toLocaleString('en-US')
}

type QuickAddForm = {
  item_code: string; name: string; model: string; part_number: string
  unit: string; cost_price: string; sale_price: string
}

function emptyQuickAdd(prefix: string): QuickAddForm {
  return { item_code: prefix, name: '', model: '', part_number: '', unit: 'Cái', cost_price: '', sale_price: '' }
}

type ProductFormData = {
  name: string; code: string; name_en: string; model_number: string
  category_id: string; brand_id: string; product_type: string
  description: string; is_active: boolean
}
function emptyProductForm(): ProductFormData {
  return { name: '', code: '', name_en: '', model_number: '', category_id: '', brand_id: '', product_type: 'storable', description: '', is_active: true }
}

// ─── Main page ────────────────────────────────────────────────────────────────
// Port trực tiếp class kv-* từ export/product-detail.html (kv.css) — thay AntForm/TreeSelect/
// AntSwitch bằng <input>/<select> thường (kv-form-grid/kv-group-label/kv-field), đúng cấu trúc
// HTML thật của mockup thay vì giữ AntD rồi chỉ đổi màu/font.

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [isEditing, setIsEditing] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [formData, setFormData] = useState<ProductFormData>(emptyProductForm())

  const [quickAdd, setQuickAdd] = useState<QuickAddForm>(emptyQuickAdd(''))

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

  const deleteProduct = useApiMutation(() => api.delete(`/products/${id}`), {
    successMessage: 'Đã xoá sản phẩm',
    onSuccess: () => navigate('/products'),
  })

  const createVariant = useApiMutation(
    (values: any) => api.post(`/products/${id}/variants`, values),
    {
      successMessage: 'Đã thêm SKU',
      invalidateKey: ['product-detail', id],
      onSuccess: () => {
        setQuickAdd(emptyQuickAdd(product?.code ? `${product.code}-` : ''))
      },
    },
  )

  // ── Form sync ──────────────────────────────────────────────────────────────

  function syncFormFromProduct(p: any) {
    setFormData({
      name: p.name ?? '', code: p.code ?? '', name_en: p.name_en ?? '', model_number: p.model_number ?? '',
      category_id: p.category_id ?? '', brand_id: p.brand_id ?? '', product_type: p.product_type ?? 'storable',
      description: p.description ?? '', is_active: p.is_active ?? true,
    })
  }

  useEffect(() => {
    if (!product) return
    if (!isEditing) syncFormFromProduct(product)
    // Mã hàng SKU mới luôn gợi ý bắt đầu bằng mã sản phẩm — chỉ set khi form đang trống
    // (tránh ghi đè lúc user đang gõ dở sau khi product refetch nền).
    setQuickAdd((prev) => (prev.item_code === '' ? emptyQuickAdd(`${product.code}-`) : prev))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product])

  function cancelEdit() {
    if (product) syncFormFromProduct(product)
    setIsEditing(false)
  }

  function saveEdit() {
    if (!formData.name.trim() || !formData.code.trim() || !formData.category_id || !formData.product_type) {
      toast.error('Nhập đủ Tên, Mã sản phẩm, Danh mục và Loại sản phẩm')
      return
    }
    updateProduct.mutate(formData)
  }

  function submitQuickAdd() {
    if (!quickAdd.item_code.trim() || !quickAdd.name.trim()) {
      toast.error('Nhập đủ Mã hàng và Tên SKU')
      return
    }
    const payload: any = {
      item_code: quickAdd.item_code.trim(),
      name: quickAdd.name.trim(),
      unit: quickAdd.unit || undefined,
    }
    if (quickAdd.model.trim()) payload.model = quickAdd.model.trim()
    if (quickAdd.part_number.trim()) payload.part_number = quickAdd.part_number.trim()
    if (quickAdd.cost_price) payload.cost_price = Number(quickAdd.cost_price)
    if (quickAdd.sale_price) payload.sale_price = Number(quickAdd.sale_price)
    createVariant.mutate(payload)
  }

  // ── Derived data ──────────────────────────────────────────────────────────

  const inventoryMap = new Map<string, any>()
  for (const row of inventoryData?.data ?? []) inventoryMap.set(row.variant_id, row)

  const variantsWithStock: any[] = (product?.variants ?? []).map((v: any) => ({
    ...v,
    ...(inventoryMap.get(v.id) ?? { qty_on_hand: 0, qty_reserved: 0, qty_available: 0 }),
  }))

  const flatCategories = flattenCategories(categories ?? [])

  // ── Loading / not found ───────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="theme-2a -m-6 flex flex-col gap-5 bg-background p-6">
        <div className="h-6 w-48 animate-pulse rounded bg-muted" />
        <div className="h-44 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded bg-muted" />
      </div>
    )
  }
  if (!product) {
    return (
      <div className="theme-2a -m-6 flex flex-col items-center justify-center gap-3 bg-background p-6 py-24 text-muted-foreground">
        <p className="text-base">Không tìm thấy sản phẩm</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/products')}>Quay lại</Button>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="theme-2a -m-6 bg-background" style={{ padding: '16px 24px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header — port .kv-head.kv-head--divided/.kv-crumb/.kv-title--sm nguyên bản */}
      <div className="kv-head kv-head--divided">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button type="button" className="kv-btn kv-btn--ghost" onClick={() => navigate(-1)} style={{ padding: 0, width: 30, flexShrink: 0 }} aria-label="Quay lại">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="kv-crumb">
              <button onClick={() => navigate('/products')} style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer' }}>
                Sản phẩm
              </button>
              {' / '}{product.name}
            </div>
            <h1 className="kv-title kv-title--sm">{product.name}</h1>
          </div>
        </div>
        <div className="kv-actions">
          {isEditing ? (
            <>
              <button type="button" className="kv-btn" onClick={cancelEdit}>Huỷ</button>
              <button type="button" className="kv-btn kv-btn--primary" onClick={saveEdit} disabled={updateProduct.isPending}>
                {updateProduct.isPending ? 'Đang lưu…' : 'Lưu'}
              </button>
            </>
          ) : (
            <>
              <button type="button" className="kv-btn kv-btn--danger" onClick={() => setDeleteOpen(true)}>Xoá</button>
              <button type="button" className="kv-btn kv-btn--primary" onClick={() => setIsEditing(true)}>Sửa</button>
            </>
          )}
        </div>
      </div>

      {/* Form thông tin sản phẩm — port .kv-form-grid/.kv-group-label/.kv-field nguyên bản */}
      <div className="kv-form-grid">
        <div className="kv-group-label">Nhận diện</div>
        <div className="kv-group-body kv-stack">
          <div className="kv-field">
            <label>Tên sản phẩm <span className="kv-req">*</span></label>
            <input className="kv-input" value={formData.name} disabled={!isEditing} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
          </div>
          <div className="kv-2col">
            <div className="kv-field">
              <label>Mã sản phẩm <span className="kv-req">*</span></label>
              <input className="kv-input mono" value={formData.code} disabled={!isEditing} onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
              <div className="kv-hint">Mã dùng chung cho mọi SKU con của dòng sản phẩm này.</div>
            </div>
            <div className="kv-field">
              <label>Mã dòng sản phẩm</label>
              <input className="kv-input" placeholder="VD: SG110" value={formData.model_number} disabled={!isEditing} onChange={(e) => setFormData({ ...formData, model_number: e.target.value })} />
            </div>
          </div>
          <div className="kv-field">
            <label>Tên (English)</label>
            <input className="kv-input" value={formData.name_en} disabled={!isEditing} onChange={(e) => setFormData({ ...formData, name_en: e.target.value })} />
          </div>
          <div className="kv-field">
            <label>Mô tả</label>
            <textarea className="kv-input" rows={2} style={{ resize: 'vertical', minHeight: 36 }} value={formData.description} disabled={!isEditing} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
          </div>
        </div>

        <div className="kv-group-label">Phân loại</div>
        <div className="kv-group-body kv-stack">
          <div className="kv-field">
            <label>Danh mục <span className="kv-req">*</span></label>
            <select className="kv-select" value={formData.category_id} disabled={!isEditing} onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}>
              <option value="">— Chọn danh mục —</option>
              {flatCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.depth > 0 ? `${'—'.repeat(c.depth)} ` : ''}{c.name}</option>
              ))}
            </select>
          </div>
          <div className="kv-field">
            <label>Hãng</label>
            <select className="kv-select" value={formData.brand_id} disabled={!isEditing} onChange={(e) => setFormData({ ...formData, brand_id: e.target.value })}>
              <option value="">Không chọn</option>
              {(brands ?? []).map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="kv-field">
            <label>Loại sản phẩm <span className="kv-req">*</span></label>
            <select className="kv-select" value={formData.product_type} disabled={!isEditing} onChange={(e) => setFormData({ ...formData, product_type: e.target.value })}>
              {PRODUCT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <div className="kv-hint">Loại quyết định SKU con có theo tồn kho hay không.</div>
          </div>
          {/* Trạng thái active/inactive — không có trong mockup gốc (chỉ có 3 field Danh mục/
              Hãng/Loại) nhưng là field thật của app, thêm theo đúng convention kv-field. */}
          <div className="kv-field">
            <label>Trạng thái</label>
            <select className="kv-select" value={formData.is_active ? '1' : '0'} disabled={!isEditing} onChange={(e) => setFormData({ ...formData, is_active: e.target.value === '1' })}>
              <option value="1">Active</option>
              <option value="0">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Section head SKU con — port .kv-section-head/.kv-eyebrow/.kv-section-title nguyên bản */}
      <div className="kv-section-head">
        <div>
          <div className="kv-eyebrow">SKU con</div>
          <h2 className="kv-section-title">{variantsWithStock.length} biến thể có thể nhập / xuất riêng</h2>
        </div>
      </div>

      {/* Bảng SKU — port .kv-table nguyên bản, có dòng "thêm nhanh" (.kv-newrow) ngay dưới cùng */}
      <div className="overflow-x-auto">
        <table className="kv-table" style={{ tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th style={{ width: 160 }}>Mã hàng</th>
              <th style={{ width: 220 }}>Tên SKU</th>
              <th style={{ width: 130 }}>Model</th>
              <th style={{ width: 160 }}>Part Number</th>
              <th style={{ width: 80 }}>Đơn vị</th>
              <th className="num" style={{ width: 130 }}>Giá vốn</th>
              <th className="num" style={{ width: 130 }}>Giá bán</th>
              <th className="num" style={{ width: 90 }}>Tồn kho</th>
              <th className="num" style={{ width: 90 }}>Khả dụng</th>
              <th style={{ width: 40 }} />
            </tr>
          </thead>
          <tbody>
            {variantsWithStock.length === 0 && (
              <tr>
                <td colSpan={10} className="kv-muted" style={{ padding: '24px 10px', textAlign: 'center' }}>Chưa có SKU nào</td>
              </tr>
            )}
            {variantsWithStock.map((v: any) => {
              const qtyOnHand = v.qty_on_hand ?? 0
              const qtyAvail = v.qty_available ?? 0
              const reorderPoint = v.reorder_point ?? 0
              const isLow = reorderPoint > 0 && qtyOnHand <= reorderPoint
              return (
                <tr key={v.id} className="kv-row-link" onClick={() => navigate(`/products/${id}/variants/${v.id}`)}>
                  <td className="mono truncate" title={v.item_code || v.sku || ''}>{v.item_code || v.sku || '—'}</td>
                  <td className="kv-cell-title truncate" title={v.name ?? ''}>{v.name ?? '—'}</td>
                  <td className="mono truncate" title={v.model ?? ''}>{v.model ?? '—'}</td>
                  <td className="mono truncate" title={v.part_number ?? ''}>{v.part_number ?? '—'}</td>
                  <td>{v.unit ?? '—'}</td>
                  <td className="num">{fmtMoney(v.cost_price)}</td>
                  <td className="num">{fmtMoney(v.sale_price)}</td>
                  <td className="num">
                    {isLow ? (
                      <span className={`kv-tag ${qtyOnHand === 0 ? 'kv-tag--out' : 'kv-tag--low'}`}>{qtyOnHand}</span>
                    ) : qtyOnHand}
                  </td>
                  <td className="num">{qtyAvail}</td>
                  <td className="num kv-caret">›</td>
                </tr>
              )
            })}

            <tr className="kv-newrow">
              <td><input className="kv-input mono" value={quickAdd.item_code} onChange={(e) => setQuickAdd({ ...quickAdd, item_code: e.target.value })} aria-label="Mã hàng" /></td>
              <td><input className="kv-input" placeholder="Tên SKU mới" value={quickAdd.name} onChange={(e) => setQuickAdd({ ...quickAdd, name: e.target.value })} aria-label="Tên SKU" /></td>
              <td><input className="kv-input mono" placeholder="Model" value={quickAdd.model} onChange={(e) => setQuickAdd({ ...quickAdd, model: e.target.value })} aria-label="Model" /></td>
              <td><input className="kv-input mono" placeholder="Part number" value={quickAdd.part_number} onChange={(e) => setQuickAdd({ ...quickAdd, part_number: e.target.value })} aria-label="Part number" /></td>
              <td>
                <select className="kv-select" value={quickAdd.unit} onChange={(e) => setQuickAdd({ ...quickAdd, unit: e.target.value })} aria-label="Đơn vị">
                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </td>
              <td><input className="kv-input kv-input--num" placeholder="0" value={quickAdd.cost_price} onChange={(e) => setQuickAdd({ ...quickAdd, cost_price: e.target.value.replace(/[^0-9]/g, '') })} aria-label="Giá vốn" /></td>
              <td><input className="kv-input kv-input--num" placeholder="0" value={quickAdd.sale_price} onChange={(e) => setQuickAdd({ ...quickAdd, sale_price: e.target.value.replace(/[^0-9]/g, '') })} aria-label="Giá bán" /></td>
              <td colSpan={3} style={{ textAlign: 'right' }}>
                <div className="kv-actions" style={{ justifyContent: 'flex-end' }}>
                  <button type="button" className="kv-btn kv-btn--ghost kv-btn--sm" onClick={() => setQuickAdd(emptyQuickAdd(product?.code ? `${product.code}-` : ''))}>Huỷ</button>
                  <button type="button" className="kv-btn kv-btn--primary kv-btn--sm" onClick={submitQuickAdd} disabled={createVariant.isPending}>
                    {createVariant.isPending ? 'Đang lưu…' : 'Lưu SKU'}
                  </button>
                </div>
              </td>
            </tr>
            <tr className="kv-newrow">
              <td colSpan={10} style={{ background: 'transparent', borderBottom: 'none', paddingTop: 15 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 30, fontSize: 13, color: 'var(--text-2)' }}>
                  <span>Cân nặng, bảo hành hãng, điểm đặt hàng lại và mô tả có ở trang tạo SKU đầy đủ:</span>
                  <a href={`/products/${id}/variants/create`} onClick={(e) => { e.preventDefault(); navigate(`/products/${id}/variants/create`) }}>Mở form đầy đủ</a>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="theme-2a">
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá sản phẩm "{product.name}"?</AlertDialogTitle>
            <AlertDialogDescription>Không thể xoá nếu còn SKU con có tồn kho.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction variant="danger" disabled={deleteProduct.isPending} onClick={() => deleteProduct.mutate(undefined)}>
              Xoá
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
