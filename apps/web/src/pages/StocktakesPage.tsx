import { Form, Input as AntInput, Select as AntSelect, Button as AntButton } from 'antd'
import { Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { useStocktakes } from '../hooks/useStocktakes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EntityFormModal } from '../components/EntityFormModal'
import StocktakeSkuPicker from '../components/StocktakeSkuPicker'

function CodeBadge({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-border bg-muted/60 px-2 py-0.5 font-mono text-xs font-medium text-foreground">
      {children}
    </span>
  )
}

const SCOPE_TYPES = [
  { value: 'all',         label: 'Toàn bộ kho' },
  { value: 'by_sku',     label: 'Theo SKU chỉ định' },
  { value: 'by_category', label: 'Theo Category' },
]

export default function StocktakesPage() {
  const hook = useStocktakes()

  const rows: any[] = hook.data?.data ?? []
  const total: number = hook.data?.total ?? 0
  const pageSize = 20
  const from = total === 0 ? 0 : (hook.page - 1) * pageSize + 1
  const to = Math.min(hook.page * pageSize, total)

  return (
    <div className="flex flex-col gap-6">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kiểm kê kho</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Quản lý phiếu kiểm kê tồn kho</p>
        </div>
        <Button onClick={() => hook.openCreate()}>
          <Plus className="mr-2 h-4 w-4" />
          Tạo kiểm kê
        </Button>
      </div>

      {/* Table card */}
      <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">

        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm mã kiểm kê, kho…"
              value={hook.searchInput}
              onChange={(e) => hook.setSearchInput(e.target.value)}
              className="h-9 w-80 pl-9 text-sm shadow-none focus-visible:ring-1"
            />
          </div>
          <span className="text-sm text-muted-foreground">{total.toLocaleString('vi-VN')} kết quả</span>
        </div>

        {/* Table */}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="w-12 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">#</th>
              <th className="w-36 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mã kiểm kê</th>
              <th className="w-40 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Kho</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Phạm vi</th>
              <th className="w-32 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trạng thái</th>
              <th className="w-36 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bắt đầu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {hook.isFetching && rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">Đang tải…</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  {hook.searchInput ? 'Không tìm thấy kết quả.' : 'Chưa có phiếu kiểm kê nào.'}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr
                  key={row.id}
                  onClick={() => hook.navigate(`/stocktakes/${row.id}`)}
                  className="cursor-pointer transition-colors hover:bg-muted/40"
                >
                  <td className="px-4 py-3 text-center text-xs text-muted-foreground">{from + i}</td>
                  <td className="px-4 py-3"><CodeBadge>{row.code}</CodeBadge></td>
                  <td className="px-4 py-3 font-medium text-foreground">{row.warehouse_name ?? '—'}</td>
                  <td className="px-4 py-3 text-foreground">{row.scope_type ?? '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.started_at ? new Date(row.started_at).toLocaleString('vi-VN') : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {total > 0 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
            <span className="text-xs text-muted-foreground">{from}–{to} / {total} phiếu</span>
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
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create modal — AntD (complex scope pickers) */}
      <EntityFormModal
        title="Tạo phiếu kiểm kê"
        open={hook.open}
        onCancel={hook.close}
        onFinish={(v) => hook.createMutation.mutate(v)}
        confirmLoading={hook.createMutation.isPending}
        form={hook.form}
        initialValues={{ scope_type: 'all' }}
      >
        <Form.Item name="code" label="Mã kiểm kê" rules={[{ required: true }]}>
          <AntInput />
        </Form.Item>
        <Form.Item name="warehouse_id" label="Kho" rules={[{ required: true }]}>
          <AntSelect options={hook.warehouses?.map((w: any) => ({ value: w.id, label: `${w.name} (${w.code})` }))} />
        </Form.Item>
        <Form.Item name="scope_type" label="Phạm vi" rules={[{ required: true }]}>
          <AntSelect options={SCOPE_TYPES} onChange={() => hook.form.setFieldValue('scope_ids', undefined)} />
        </Form.Item>
        {hook.scopeType === 'by_sku' && (
          <Form.List name="scope_ids">
            {(fields, { add, remove }) => (
              <div className="form-row-full">
                {fields.map(({ key, name }) => (
                  <StocktakeSkuPicker key={key} form={hook.form} name={name} remove={() => remove(name)} />
                ))}
                <AntButton onClick={() => add()}>+ Thêm SKU</AntButton>
              </div>
            )}
          </Form.List>
        )}
        {hook.scopeType === 'by_category' && (
          <Form.Item name="scope_ids" label="Chọn Category" rules={[{ required: true }]} className="form-row-full">
            <AntSelect mode="multiple" options={hook.categories?.map((c: any) => ({ value: c.id, label: c.name }))} />
          </Form.Item>
        )}
        <Form.Item name="note" label="Ghi chú" className="form-row-full">
          <AntInput.TextArea rows={2} />
        </Form.Item>
      </EntityFormModal>
    </div>
  )
}
