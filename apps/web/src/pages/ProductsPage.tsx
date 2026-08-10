import { useState } from 'react'
import { Form, Input as AntInput, Select as AntSelect, Button as AntButton, Divider, InputNumber } from 'antd'
import { ChevronRight, ChevronDown, Plus, Search, Pencil, List, Trash2, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react'
import { useProducts } from '../hooks/useProducts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EntityFormModal } from '../components/EntityFormModal'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'

const PRODUCT_TYPES = [
  { value: 'storable',   label: 'Lưu kho (có serial)' },
  { value: 'consumable', label: 'Vật tư tiêu hao' },
  { value: 'service',    label: 'Dịch vụ' },
  { value: 'bundle',     label: 'Gói sản phẩm' },
]

const UNITS = ['Cái', 'Chiếc', 'Bộ', 'Hộp', 'Cuộn', 'Mét', 'Cổng', 'License', 'Gói', 'Dây', 'Lần', 'Giờ', 'Ngày']

const TYPE_STYLES: Record<string, string> = {
  storable:   'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  consumable: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  service:    'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
  bundle:     'bg-teal-50 text-teal-700 ring-1 ring-teal-200',
}
const TYPE_LABEL: Record<string, string> = {
  storable: 'Lưu kho', consumable: 'Vật tư', service: 'Dịch vụ', bundle: 'Gói SP',
}

export default function ProductsPage() {
  const hook = useProducts()
  const productType = Form.useWatch('product_type', hook.form)

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [deleteTarget, setDeleteTarget] = useState<any>(null)

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  const products: any[] = hook.data?.data ?? []
  const total: number = hook.data?.total ?? 0
  const pageSize = 20
  const from = total === 0 ? 0 : (hook.page - 1) * pageSize + 1
  const to = Math.min(hook.page * pageSize, total)

  // Flatten products + visible variants into render rows
  const rows: Array<{ type: 'product' | 'variant'; data: any; parentId?: string }> = []
  for (const product of products) {
    rows.push({ type: 'product', data: product })
    const variants: any[] = product.children ?? product.variants ?? []
    if (expandedIds.has(product.id) && variants.length > 0) {
      for (const v of variants) {
        rows.push({ type: 'variant', data: v, parentId: product.id })
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sản phẩm</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Quản lý danh mục sản phẩm và SKU</p>
        </div>
        <Button onClick={() => hook.openCreate()}>
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
              placeholder="Tìm mã, tên sản phẩm…"
              value={hook.searchInput}
              onChange={(e) => hook.setSearchInput(e.target.value)}
              className="h-9 w-80 pl-9 text-sm shadow-none focus-visible:ring-1"
            />
          </div>
          <span className="text-sm text-muted-foreground">{total.toLocaleString('vi-VN')} sản phẩm</span>
        </div>

        {/* Table */}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="w-48 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mã</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tên</th>
              <th className="w-28 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Loại / ĐV</th>
              <th className="w-32 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Category</th>
              <th className="w-28 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Hãng</th>
              <th className="w-24 px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {hook.isFetching && rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">Đang tải…</td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  {hook.searchInput ? 'Không tìm thấy kết quả.' : 'Chưa có sản phẩm nào.'}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                if (row.type === 'variant') {
                  const v = row.data
                  return (
                    <tr key={`v-${v.id}`} className="bg-muted/20">
                      <td className="px-4 py-2 pl-10">
                        <span className="inline-flex items-center rounded-md border border-border bg-muted/60 px-2 py-0.5 font-mono text-xs font-medium text-muted-foreground">
                          {v.item_code ?? v.sku}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground text-xs">{v.name}</td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">{v.unit ?? '—'}</td>
                      <td className="px-4 py-2" />
                      <td className="px-4 py-2" />
                      <td className="px-4 py-2" />
                    </tr>
                  )
                }

                const p = row.data
                const variants: any[] = p.children ?? p.variants ?? []
                const isExpanded = expandedIds.has(p.id)
                return (
                  <tr
                    key={p.id}
                    className="group/row cursor-pointer transition-colors hover:bg-muted/40"
                    onClick={() => hook.navigate(`/products/${p.id}`)}
                  >
                    {/* Expand + Code */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {variants.length > 0 ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleExpand(p.id) }}
                            className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          >
                            {isExpanded
                              ? <ChevronDown className="h-3.5 w-3.5" />
                              : <ChevronRight className="h-3.5 w-3.5" />
                            }
                          </button>
                        ) : (
                          <span className="w-5" />
                        )}
                        <span className="inline-flex items-center rounded-md border border-border bg-muted/60 px-2 py-0.5 font-mono text-xs font-medium text-foreground">
                          {p.code}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">{p.name}</td>
                    <td className="px-4 py-3">
                      {p.product_type && (
                        <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium', TYPE_STYLES[p.product_type] ?? 'bg-muted text-muted-foreground')}>
                          {TYPE_LABEL[p.product_type] ?? p.product_type}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.category_name ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.brand_name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover/row:opacity-100">
                        <button
                          onClick={(e) => { e.stopPropagation(); hook.navigate(`/products/${p.id}?edit=1`) }}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                          title="Sửa"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); hook.navigate(`/products/${p.id}`) }}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                          title="Xem SKU"
                        >
                          <List className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(p) }}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
                          title="Xoá"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {total > 0 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
            <span className="text-xs text-muted-foreground">{from}–{to} / {total} sản phẩm</span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost" size="sm"
                disabled={hook.page <= 1}
                onClick={() => hook.setPage(hook.page - 1)}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[3rem] text-center text-xs text-muted-foreground">
                {hook.page} / {Math.ceil(total / pageSize)}
              </span>
              <Button
                variant="ghost" size="sm"
                disabled={to >= total}
                onClick={() => hook.setPage(hook.page + 1)}
                className="h-7 w-7 p-0"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
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

      {/* Create modal — AntD (complex logic with code suggestion) */}
      <EntityFormModal
        title="Tạo sản phẩm mới"
        open={hook.open}
        onCancel={hook.closeAndResetModel}
        onFinish={(v) => hook.createMutation.mutate(v)}
        confirmLoading={hook.createMutation.isPending}
        form={hook.form}
      >
        <Form.Item
          name="category_id" label="Category" rules={[{ required: true }]}
          extra={!hook.categories?.length ? 'Chưa có category nào — vào trang Category để tạo trước.' : undefined}
        >
          <AntSelect showSearch optionFilterProp="label"
            options={hook.categories?.map((c: any) => ({ value: c.id, label: c.name }))}
            onChange={() => hook.suggestCode()}
          />
        </Form.Item>
        <Form.Item name="brand_id" label="Hãng"
          extra={!hook.brands?.length ? 'Chưa có hãng nào — vào trang Hãng để tạo trước.' : undefined}
        >
          <AntSelect showSearch optionFilterProp="label"
            options={hook.brands?.map((b: any) => ({ value: b.id, label: b.name }))}
            onChange={() => hook.suggestCode()}
            allowClear
          />
        </Form.Item>
        <Form.Item name="model_number" label="Mã dòng sản phẩm"
          extra="Phân biệt các dòng SP khác nhau cùng Category+Hãng (VD: Cisco có nhiều dòng switch SG110, SG350...)"
        >
          <AntInput placeholder="VD: SG110" onChange={(e) => { hook.setModelCode(e.target.value); hook.suggestCode(e.target.value) }} />
        </Form.Item>
        <Form.Item name="code" label="Mã sản phẩm (tự gợi ý, có thể sửa)" rules={[{ required: true }]}>
          <AntInput onChange={(e) => {
            if (hook.form.getFieldValue('product_type') === 'service')
              hook.form.setFieldValue('sku', e.target.value)
          }} />
        </Form.Item>
        <Form.Item name="name" label="Tên" rules={[{ required: true }]}>
          <AntInput onChange={(e) => {
            if (hook.form.getFieldValue('product_type') === 'service')
              hook.form.setFieldValue('variant_name', e.target.value)
          }} />
        </Form.Item>
        <Form.Item name="name_en" label="Tên (English)"><AntInput /></Form.Item>
        <Form.Item name="product_type" label="Loại" rules={[{ required: true }]}>
          <AntSelect options={PRODUCT_TYPES} />
        </Form.Item>
        <Form.Item name="description" label="Mô tả"><AntInput.TextArea /></Form.Item>

        {productType === 'service' && (
          <>
            <Divider orientation="left" style={{ fontSize: 13, color: '#888' }}>Thông tin SKU dịch vụ</Divider>
            <Form.Item name="sku" label="SKU" rules={[{ required: true, message: 'Nhập SKU cho dịch vụ' }]}
              extra="Tự điền từ Mã sản phẩm, có thể sửa">
              <AntInput />
            </Form.Item>
            <Form.Item name="variant_name" label="Tên SKU" rules={[{ required: true, message: 'Nhập tên SKU' }]}
              extra="Tự điền từ Tên, có thể sửa">
              <AntInput />
            </Form.Item>
            <Form.Item name="unit" label="Đơn vị" initialValue="Lần">
              <AntSelect options={UNITS.map((u) => ({ value: u, label: u }))} showSearch allowClear />
            </Form.Item>
            <Form.Item name="sale_price" label="Giá dịch vụ">
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </>
        )}
      </EntityFormModal>
    </div>
  )
}
