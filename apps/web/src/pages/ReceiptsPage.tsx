import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useReceipts } from '../hooks/useReceipts'
import { StatusBadge, statusFilterClassName } from '@/components/ui/StatusBadge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const STATUS_OPTIONS = [
  { value: 'draft',            label: 'Nháp' },
  { value: 'pending_approval', label: 'Chờ duyệt' },
  { value: 'approved',         label: 'Đã duyệt' },
  { value: 'completed',        label: 'Hoàn thành' },
  { value: 'cancelled',        label: 'Đã hủy' },
] as const

// Port class kv-* từ export/app.css (kv.css) — cùng công thức đã áp cho InventoryPage/
// ProductsPage, thay Tailwind approximation trước đó.
export default function ReceiptsPage() {
  const navigate = useNavigate()
  const hook = useReceipts()
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
    const header = ['Mã phiếu', 'Loại nhập', 'NCC', 'Phiếu nhận hàng', 'Kho', 'Trạng thái', 'Người nhập', 'Ngày tạo']
    const lines = list.map((r) => [
      r.code, r.import_type ?? '', r.company_code ?? '', r.shipment_code ?? '', r.warehouse_name ?? '',
      statusLabel(r.status), r.created_by_name ?? '', r.created_at ? new Date(r.created_at).toLocaleDateString('vi-VN') : '',
    ].join(','))
    const csv = [header.join(','), ...lines].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `phieu-nhap-kho-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="theme-2a -m-6 flex flex-col gap-4 bg-background p-6">

      <div className="kv-head">
        <div>
          <h1 className="kv-title">Phiếu nhập kho</h1>
          <p className="kv-sub">Quản lý phiếu nhập hàng từ nhà cung cấp</p>
        </div>
        <button type="button" className="kv-btn kv-btn--primary" onClick={() => navigate('/receipts/new')}>
          <Plus className="h-3.5 w-3.5" /> Tạo phiếu nhập
        </button>
      </div>

      <div className="kv-table-wrap">

        {/* Toolbar — pill lọc trạng thái bên trái, filter + search bên phải */}
        <div className="kv-toolbar" style={{ justifyContent: 'space-between' }}>
          <div className="flex items-center gap-1">
            <button
              type="button"
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
            <select
              className="kv-select kv-select--auto"
              aria-label="Loại nhập"
              value={hook.importType ?? '__all__'}
              onChange={(e) => hook.setImportType(e.target.value === '__all__' ? undefined : e.target.value)}
            >
              <option value="__all__">Tất cả loại</option>
              {(hook.importTypes ?? []).map((t: any) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
            <select
              className="kv-select kv-select--auto"
              aria-label="Kho"
              value={hook.warehouseIdFilter ?? '__all__'}
              onChange={(e) => hook.setWarehouseIdFilter(e.target.value === '__all__' ? undefined : e.target.value)}
            >
              <option value="__all__">Tất cả kho</option>
              {(hook.warehouses ?? []).map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
            <div className="kv-search" style={{ width: 220 }}>
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

        {/* Thanh hành động hàng loạt — hiện khi có dòng được chọn */}
        {selected.size > 0 && (
          <div className="kv-bulk">
            <span className="kv-strong">Đã chọn {selected.size} dòng</span>
            <span className="kv-bulk-sep" />
            <button type="button" onClick={exportSelectedCsv}>Xuất Excel</button>
            <div className="kv-spacer" />
            <button type="button" style={{ color: 'var(--text-2)' }} onClick={() => setSelected(new Set())}>Bỏ chọn</button>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
        <table className="kv-table" style={{ minWidth: 960, tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: 34 }} />
            <col style={{ width: '4%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '11%' }} />
            <col style={{ width: '17%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '10%' }} />
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
              <th className="text-left">Loại nhập</th>
              <th className="text-left">NCC</th>
              <th className="text-left">Phiếu nhận hàng</th>
              <th className="text-left">Kho</th>
              <th className="text-left">Người nhập</th>
              <th className="text-left">Ngày tạo</th>
              <th className="text-center">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {hook.isFetching && rows.length === 0 ? (
              <tr><td colSpan={10} className="kv-muted" style={{ padding: '32px 10px', textAlign: 'center' }}>Đang tải…</td></tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="kv-muted" style={{ padding: '32px 10px', textAlign: 'center' }}>
                  {hook.searchInput ? 'Không tìm thấy kết quả.' : 'Chưa có phiếu nhập nào.'}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={row.id} onClick={() => navigate(`/receipts/${row.id}`)} className="kv-row-link">
                  <td className="text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(row.id)}
                      onChange={() => toggleSelected(row.id)}
                    />
                  </td>
                  <td className="text-center kv-muted">{from + i}</td>
                  <td className="mono">{row.code}</td>
                  <td>{row.import_type ?? '—'}</td>
                  <td>
                    {row.company_name ? (
                      <Tooltip>
                        <TooltipTrigger asChild><span className="mono">{row.company_code ?? '—'}</span></TooltipTrigger>
                        <TooltipContent className="theme-2a">{row.company_name}</TooltipContent>
                      </Tooltip>
                    ) : <span className="mono">{row.company_code ?? '—'}</span>}
                  </td>
                  <td>{row.shipment_code ?? <span className="kv-muted">—</span>}</td>
                  <td className="truncate" title={row.warehouse_name}>{row.warehouse_name ?? '—'}</td>
                  <td>{row.created_by_name ?? <span className="kv-muted">—</span>}</td>
                  <td className="kv-muted">{row.created_at ? new Date(row.created_at).toLocaleDateString('vi-VN') : '—'}</td>
                  <td className="text-center"><StatusBadge status={row.status} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>

        {/* Pagination */}
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
