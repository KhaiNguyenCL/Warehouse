import { Form, Input as AntInput, Select as AntSelect, Button as AntButton } from 'antd'
import { Plus, Search, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useStocktakes } from '../hooks/useStocktakes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { PageSizeSelector } from '@/components/ui/PageSizeSelector'
import StocktakeSkuPicker from '../components/StocktakeSkuPicker'
import { cn } from '@/lib/utils'
import { CodeText } from '@/components/ui/CodeText'
import { useResizableColumns } from '@/hooks/useResizableColumns'
import { ResizeHandle } from '@/components/ui/ResizeHandle'

const SCOPE_TYPES = [
  { value: 'all',          label: 'Toàn bộ kho' },
  { value: 'by_sku',      label: 'Theo SKU chỉ định' },
  { value: 'by_category', label: 'Theo Category' },
]

const SCOPE_LABEL: Record<string, string> = {
  all:          'Toàn bộ kho',
  by_sku:      'Theo SKU',
  by_category: 'Theo Category',
}

const STATUS_OPTIONS = [
  { value: 'in_progress', label: 'Đang kiểm kê' },
  { value: 'completed',   label: 'Hoàn thành' },
  { value: 'cancelled',   label: 'Đã hủy' },
] as const

export default function StocktakesPage() {
  const hook = useStocktakes()
  const { colWidths, tableRef, startResize } = useResizableColumns([4, 16, 16, 32, 14, 18])

  const rows: any[] = hook.data?.data ?? []
  const total: number = hook.data?.total ?? 0
  const from = total === 0 ? 0 : (hook.page - 1) * hook.limit + 1
  const to = Math.min(hook.page * hook.limit, total)

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
          <div className="flex items-center gap-2">
            <button
              onClick={() => hook.setStatus(undefined)}
              className={cn('rounded-md px-3 py-1.5 text-xs font-medium transition-colors', !hook.status ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}
            >Tất cả</button>
            {STATUS_OPTIONS.map((opt) => (
              <button key={opt.value}
                onClick={() => hook.setStatus(hook.status === opt.value ? undefined : opt.value)}
                className={cn('rounded-md px-3 py-1.5 text-xs font-medium transition-colors', hook.status === opt.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}
              >{opt.label}</button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tìm mã kiểm kê, kho…"
                value={hook.searchInput}
                onChange={(e) => hook.setSearchInput(e.target.value)}
                className="h-9 w-64 pl-9 text-sm shadow-none focus-visible:ring-1"
              />
            </div>
            <span className="text-sm text-muted-foreground">{total.toLocaleString('vi-VN')} kết quả</span>
          </div>
        </div>

        {/* Table */}
        <table ref={tableRef} className="w-full table-fixed">
          <colgroup>{colWidths.map((w, i) => <col key={i} style={{ width: `${w}%` }} />)}</colgroup>
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th style={{ width: `${colWidths[0]}%` }} className="relative px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-foreground/70 select-none">#<ResizeHandle onMouseDown={(e) => startResize(e, 0)} /></th>
              <th style={{ width: `${colWidths[1]}%` }} className="relative px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-foreground/70 select-none">Mã kiểm kê<ResizeHandle onMouseDown={(e) => startResize(e, 1)} /></th>
              <th style={{ width: `${colWidths[2]}%` }} className="relative px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-foreground/70 select-none">Kho<ResizeHandle onMouseDown={(e) => startResize(e, 2)} /></th>
              <th style={{ width: `${colWidths[3]}%` }} className="relative px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-foreground/70 select-none">Phạm vi<ResizeHandle onMouseDown={(e) => startResize(e, 3)} /></th>
              <th style={{ width: `${colWidths[4]}%` }} className="relative px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-foreground/70 select-none">Trạng thái<ResizeHandle onMouseDown={(e) => startResize(e, 4)} /></th>
              <th style={{ width: `${colWidths[5]}%` }} className="relative px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-foreground/70 select-none">Bắt đầu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {hook.isFetching && rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-xs text-muted-foreground">Đang tải…</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-xs text-muted-foreground">
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
                  <td className="px-4 py-2 text-center text-xs text-muted-foreground">{from + i}</td>
                  <td className="px-4 py-2"><CodeText>{row.code}</CodeText></td>
                  <td className="px-4 py-2 font-medium text-foreground">{row.warehouse_name ?? '—'}</td>
                  <td className="px-4 py-2 text-foreground">{SCOPE_LABEL[row.scope_type] ?? row.scope_type ?? '—'}</td>
                  <td className="px-4 py-2"><div className="flex justify-center"><StatusBadge status={row.status} /></div></td>
                  <td className="px-4 py-2 text-muted-foreground">
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
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">{from}–{to} / {total} phiếu</span>
              <PageSizeSelector value={hook.limit} onChange={hook.setLimit} />
            </div>
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
                {hook.page} / {Math.ceil(total / hook.limit)}
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

      {/* Create Sheet — backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/30 supports-backdrop-filter:backdrop-blur-sm transition-opacity duration-200',
          hook.open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={hook.close}
      />

      {/* Create Sheet — panel */}
      <div
        className={cn(
          'fixed right-0 top-0 z-50 flex h-full w-[480px] flex-col bg-background shadow-xl transition-transform duration-200',
          hook.open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">Tạo phiếu kiểm kê</h2>
          <button
            onClick={hook.close}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body + footer */}
        <Form
          form={hook.form}
          layout="vertical"
          initialValues={{ scope_type: 'all' }}
          onFinish={(v) => hook.createMutation.mutate(v)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 overflow-y-auto px-5 py-5">
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
          </div>

          {/* Footer */}
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-5 py-4">
            <Button type="button" variant="outline" onClick={hook.close}>
              Huỷ
            </Button>
            <Button
              type="button"
              disabled={hook.createMutation.isPending}
              onClick={() => hook.form.submit()}
            >
              Tạo mới
            </Button>
          </div>
        </Form>
      </div>
    </div>
  )
}
