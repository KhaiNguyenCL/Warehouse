import { useState } from 'react'
import { Search, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { usePurchaseOrders } from '../hooks/usePurchaseOrders'
import { StatusBadge, statusFilterClassName } from '@/components/ui/StatusBadge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const STATUS_OPTIONS = [
  { value: 'draft',     label: 'Nháp' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'cancelled', label: 'Đã hủy' },
] as const

// Port class kv-* từ export/app.css (kv.css) — cùng công thức đã áp cho InventoryPage.
export default function PurchaseOrdersPage() {
  const hook = usePurchaseOrders()
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
    const header = ['Mã phiếu', 'NCC', 'Dự án', 'Bitrix Deal ID', 'Tổng tiền', 'Trạng thái', 'Ngày tạo']
    const lines = list.map((r) => [
      r.code, r.company_code ?? '', r.deal_title ?? '', r.bitrix_deal_id ?? '',
      r.total_amount ? Math.round(r.total_amount) : '', statusLabel(r.status),
      r.created_at ? new Date(r.created_at).toLocaleDateString('vi-VN') : '',
    ].join(','))
    const csv = [header.join(','), ...lines].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `phieu-mua-hang-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="theme-2a -m-6 flex flex-col gap-4 bg-background p-6">

      <div className="kv-head">
        <div>
          <h1 className="kv-title">Phiếu mua hàng</h1>
          <p className="kv-sub">Quản lý đơn đặt hàng từ nhà cung cấp</p>
        </div>
        <button type="button" className="kv-btn kv-btn--primary" onClick={() => hook.navigate('/purchase-orders/new')}>
          <Plus className="h-3.5 w-3.5" /> Tạo phiếu mua hàng
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
                placeholder="Tìm mã phiếu, NCC…"
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
        <table className="kv-table" style={{ minWidth: 960, tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: 34 }} />
            <col style={{ width: '4%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '25%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '11%' }} />
            <col style={{ width: '11%' }} />
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
              <th className="text-left">Mã phiếu</th>
              <th className="text-left">NCC</th>
              <th className="text-left">Dự án</th>
              <th className="text-left">Bitrix Deal ID</th>
              <th className="num">Tổng tiền</th>
              <th className="text-left">Ngày tạo</th>
              <th className="text-center">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {hook.isFetching && rows.length === 0 ? (
              <tr><td colSpan={9} className="kv-muted" style={{ padding: '32px 10px', textAlign: 'center' }}>Đang tải…</td></tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="kv-muted" style={{ padding: '32px 10px', textAlign: 'center' }}>
                  {hook.searchInput ? 'Không tìm thấy kết quả.' : 'Chưa có phiếu mua hàng nào.'}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={row.id} onClick={() => hook.navigate(`/purchase-orders/${row.id}`)} className="kv-row-link">
                  <td className="text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(row.id)}
                      onChange={() => toggleSelected(row.id)}
                    />
                  </td>
                  <td className="text-center kv-muted">{from + i}</td>
                  <td className="mono">{row.code}</td>
                  <td>
                    {row.company_name ? (
                      <Tooltip>
                        <TooltipTrigger asChild><span className="mono">{row.company_code ?? '—'}</span></TooltipTrigger>
                        <TooltipContent className="theme-2a">{row.company_name}</TooltipContent>
                      </Tooltip>
                    ) : <span className="mono">{row.company_code ?? '—'}</span>}
                  </td>
                  <td>
                    {row.deal_title ? (
                      <Tooltip>
                        <TooltipTrigger asChild><span className="block truncate">{row.deal_title}</span></TooltipTrigger>
                        <TooltipContent className="theme-2a">{row.deal_title}</TooltipContent>
                      </Tooltip>
                    ) : <span className="block truncate kv-muted">—</span>}
                  </td>
                  <td className="mono kv-muted">{row.bitrix_deal_id || '—'}</td>
                  <td className="num mono">{row.total_amount ? Math.round(row.total_amount).toLocaleString('en-US') : '—'}</td>
                  <td className="kv-muted">{row.created_at ? new Date(row.created_at).toLocaleDateString('vi-VN') : '—'}</td>
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
    </div>
  )
}
