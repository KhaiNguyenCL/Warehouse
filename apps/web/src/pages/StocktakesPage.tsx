import { useState } from 'react'
import { Form, Input as AntInput, Select as AntSelect, Button as AntButton } from 'antd'
import { Search, ChevronLeft, ChevronRight, X, Plus } from 'lucide-react'
import { useStocktakes } from '../hooks/useStocktakes'
import { Button } from '@/components/ui/button'
import { StatusBadge, statusFilterClassName } from '@/components/ui/StatusBadge'
import StocktakeSkuPicker from '../components/StocktakeSkuPicker'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent } from '@/components/ui/sheet'

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
  const rows: any[] = hook.data?.data ?? []
  const total: number = hook.data?.total ?? 0
  const from = total === 0 ? 0 : (hook.page - 1) * hook.limit + 1
  const to = Math.min(hook.page * hook.limit, total)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function exportSelectedCsv() {
    const list = rows.filter((r) => selected.has(r.id))
    const statusLabel = (s: string) => STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s
    const header = ['Mã kiểm kê', 'Kho', 'Phạm vi', 'Trạng thái', 'Bắt đầu']
    const lines = list.map((r) => [
      r.code, r.warehouse_name ?? '', SCOPE_LABEL[r.scope_type] ?? r.scope_type ?? '', statusLabel(r.status),
      r.started_at ? new Date(r.started_at).toLocaleString('vi-VN') : '',
    ].join(','))
    const csv = [header.join(','), ...lines].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kiem-ke-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="theme-2a -m-6 flex flex-col gap-4 bg-background p-6">

      <div className="kv-head">
        <div>
          <h1 className="kv-title">Kiểm kê kho</h1>
          <p className="kv-sub">Quản lý phiếu kiểm kê tồn kho</p>
        </div>
        <button type="button" className="kv-btn kv-btn--primary" onClick={() => hook.openCreate()}>
          <Plus className="h-3.5 w-3.5" /> Tạo kiểm kê
        </button>
      </div>

      <div className="kv-table-wrap">

        <div className="kv-toolbar" style={{ justifyContent: 'space-between' }}>
          <div className="flex items-center gap-1">
            <button type="button"
              onClick={() => hook.setStatus(undefined)}
              className={cn('rounded-sm px-2.5 py-1 text-xs font-medium transition-colors', !hook.status ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}
            >Tất cả</button>
            {STATUS_OPTIONS.map((opt) => (
              <button key={opt.value} type="button"
                onClick={() => hook.setStatus(hook.status === opt.value ? undefined : opt.value)}
                className={cn('rounded-sm px-2.5 py-1 text-xs font-medium transition-colors', hook.status === opt.value ? statusFilterClassName(opt.value) : 'text-muted-foreground hover:bg-muted hover:text-foreground')}
              >{opt.label}</button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="kv-search" style={{ width: 240 }}>
              <Search className="h-4 w-4" />
              <input
                className="kv-input"
                type="search"
                placeholder="Tìm mã kiểm kê, kho…"
                value={hook.searchInput}
                onChange={(e) => hook.setSearchInput(e.target.value)}
              />
            </div>
            <span className="kv-muted" style={{ fontSize: 13 }}>{total.toLocaleString('vi-VN')} kết quả</span>
          </div>
        </div>

        {selected.size > 0 && (
          <div className="kv-bulk">
            <span className="kv-strong">Đã chọn {selected.size} dòng</span>
            <span className="kv-bulk-sep" />
            <button type="button" onClick={exportSelectedCsv}>Xuất Excel</button>
            <div className="kv-spacer" />
            <button type="button" style={{ color: 'var(--text-2)' }} onClick={() => setSelected(new Set())}>Bỏ chọn</button>
          </div>
        )}

        <div className="overflow-x-auto">
        <table className="kv-table" style={{ minWidth: 720, tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: 34 }} />
            <col style={{ width: '6%' }} />
            <col style={{ width: '18%' }} />
            <col style={{ width: '20%' }} />
            <col style={{ width: '18%' }} />
            <col style={{ width: '18%' }} />
            <col style={{ width: '14%' }} />
          </colgroup>
          <thead>
            <tr>
              <th className="text-center">
                <input
                  type="checkbox"
                  checked={rows.length > 0 && selected.size === rows.length}
                  onChange={(e) => setSelected(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())}
                />
              </th>
              <th className="text-center">#</th>
              <th className="text-left">Mã kiểm kê</th>
              <th className="text-left">Kho</th>
              <th className="text-left">Phạm vi</th>
              <th className="text-left">Bắt đầu</th>
              <th className="text-center">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {hook.isFetching && rows.length === 0 ? (
              <tr><td colSpan={7} className="kv-muted" style={{ padding: '32px 10px', textAlign: 'center' }}>Đang tải…</td></tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="kv-muted" style={{ padding: '32px 10px', textAlign: 'center' }}>
                  {hook.searchInput ? 'Không tìm thấy kết quả.' : 'Chưa có phiếu kiểm kê nào.'}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={row.id} onClick={() => hook.navigate(`/stocktakes/${row.id}`)} className="kv-row-link">
                  <td className="text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(row.id)}
                      onChange={() => toggleSelected(row.id)}
                    />
                  </td>
                  <td className="text-center kv-muted">{from + i}</td>
                  <td className="mono">{row.code}</td>
                  <td className="kv-cell-title">{row.warehouse_name ?? '—'}</td>
                  <td>{SCOPE_LABEL[row.scope_type] ?? row.scope_type ?? '—'}</td>
                  <td className="kv-muted">{row.started_at ? new Date(row.started_at).toLocaleString('vi-VN') : '—'}</td>
                  <td className="text-center"><StatusBadge status={row.status} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>

        {total > 0 && (
          <div className="kv-pager">
            <div className="kv-actions">
              <span>{from}–{to} / {total} phiếu</span>
              <select
                className="kv-select kv-select--auto"
                aria-label="Số dòng mỗi trang"
                style={{ height: 26, fontSize: 12 }}
                value={String(hook.limit)}
                onChange={(e) => hook.setLimit(Number(e.target.value))}
              >
                {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n} dòng / trang</option>)}
              </select>
            </div>
            <div className="kv-pages">
              <button type="button" className="kv-page" aria-label="Trang trước" disabled={hook.page <= 1} onClick={() => hook.setPage(hook.page - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span style={{ minWidth: 48, textAlign: 'center' }}>{hook.page} / {Math.max(1, Math.ceil(total / hook.limit))}</span>
              <button type="button" className="kv-page" aria-label="Trang sau" disabled={to >= total} onClick={() => hook.setPage(hook.page + 1)}>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Sheet */}
      <Sheet open={hook.open} onOpenChange={(o) => !o && hook.close()}>
        <SheetContent side="right" className="theme-2a w-[480px] flex flex-col gap-0" showCloseButton={false}>
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
              <AntSelect options={hook.warehouses?.map((w: any) => ({ value: w.id, label: `${w.name} (${w.code})` }))}
                getPopupContainer={(t) => t.closest('[data-slot="sheet-content"]') as HTMLElement ?? document.body} />
            </Form.Item>
            <Form.Item name="scope_type" label="Phạm vi" rules={[{ required: true }]}>
              <AntSelect options={SCOPE_TYPES} onChange={() => hook.form.setFieldValue('scope_ids', undefined)}
                getPopupContainer={(t) => t.closest('[data-slot="sheet-content"]') as HTMLElement ?? document.body} />
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
                <AntSelect mode="multiple" options={hook.categories?.map((c: any) => ({ value: c.id, label: c.name }))}
                  getPopupContainer={(t) => t.closest('[data-slot="sheet-content"]') as HTMLElement ?? document.body} />
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
        </SheetContent>
      </Sheet>
    </div>
  )
}
