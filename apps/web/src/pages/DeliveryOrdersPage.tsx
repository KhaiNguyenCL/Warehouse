import { useNavigate } from 'react-router-dom'
import { Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { useDeliveryOrders } from '../hooks/useDeliveryOrders'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { PageSizeSelector } from '@/components/ui/PageSizeSelector'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { CodeText } from '@/components/ui/CodeText'
import { useResizableColumns } from '@/hooks/useResizableColumns'
import { ResizeHandle } from '@/components/ui/ResizeHandle'

const STATUS_OPTIONS = [
  { value: 'draft',            label: 'Nháp' },
  { value: 'pending_approval', label: 'Chờ duyệt' },
  { value: 'approved',         label: 'Đã duyệt' },
  { value: 'completed',        label: 'Hoàn thành' },
  { value: 'cancelled',        label: 'Đã hủy' },
] as const


export default function DeliveryOrdersPage() {
  const navigate = useNavigate()
  const hook = useDeliveryOrders()
  const { colWidths, tableRef, startResize } = useResizableColumns([4, 14, 12, 32, 14, 12, 12])

  const rows: any[] = hook.data?.data ?? []
  const total: number = hook.data?.total ?? 0
  const from = total === 0 ? 0 : (hook.page - 1) * hook.limit + 1
  const to = Math.min(hook.page * hook.limit, total)

  return (
    <div className="flex flex-col gap-6">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Phiếu xuất kho</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Quản lý phiếu xuất hàng cho khách</p>
        </div>
        <Button onClick={() => navigate('/deliveries/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Tạo phiếu xuất
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
          <div className="flex items-center gap-2">
            {/* Export type filter */}
            <Select
              value={hook.exportTypeFilter ?? '__all__'}
              onValueChange={(v) => hook.setExportTypeFilter(v === '__all__' ? undefined : v)}
            >
              <SelectTrigger className="h-9 w-36 text-sm shadow-none">
                <SelectValue placeholder="Loại xuất" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Tất cả loại</SelectItem>
                {(hook.exportTypes ?? []).map((t: any) => (
                  <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Warehouse filter */}
            <Select
              value={hook.warehouseIdFilter ?? '__all__'}
              onValueChange={(v) => hook.setWarehouseIdFilter(v === '__all__' ? undefined : v)}
            >
              <SelectTrigger className="h-9 w-40 text-sm shadow-none">
                <SelectValue placeholder="Kho" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Tất cả kho</SelectItem>
                {(hook.warehouses ?? []).map((w: any) => (
                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tìm mã phiếu, khách hàng…"
                value={hook.searchInput}
                onChange={(e) => hook.setSearchInput(e.target.value)}
                className="h-9 w-56 pl-9 text-sm shadow-none focus-visible:ring-1"
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
              <th style={{ width: `${colWidths[1]}%` }} className="relative px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-foreground/70 select-none">Mã phiếu<ResizeHandle onMouseDown={(e) => startResize(e, 1)} /></th>
              <th style={{ width: `${colWidths[2]}%` }} className="relative px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-foreground/70 select-none">Loại xuất<ResizeHandle onMouseDown={(e) => startResize(e, 2)} /></th>
              <th style={{ width: `${colWidths[3]}%` }} className="relative px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-foreground/70 select-none">Khách hàng / NCC<ResizeHandle onMouseDown={(e) => startResize(e, 3)} /></th>
              <th style={{ width: `${colWidths[4]}%` }} className="relative px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-foreground/70 select-none">Kho<ResizeHandle onMouseDown={(e) => startResize(e, 4)} /></th>
              <th style={{ width: `${colWidths[5]}%` }} className="relative px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-foreground/70 select-none">Trạng thái<ResizeHandle onMouseDown={(e) => startResize(e, 5)} /></th>
              <th style={{ width: `${colWidths[6]}%` }} className="relative px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-foreground/70 select-none">Ngày tạo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {hook.isFetching && rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-xs text-muted-foreground">Đang tải…</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-xs text-muted-foreground">
                  {hook.searchInput ? 'Không tìm thấy kết quả.' : 'Chưa có phiếu xuất nào.'}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr
                  key={row.id}
                  onClick={() => navigate(`/deliveries/${row.id}`)}
                  className="cursor-pointer transition-colors hover:bg-muted/40"
                >
                  <td className="px-4 py-2 text-center text-xs text-muted-foreground">{from + i}</td>
                  <td className="px-4 py-2"><CodeText>{row.code}</CodeText></td>
                  <td className="px-4 py-2 text-foreground">{row.export_type ?? '—'}</td>
                  <td className="px-4 py-2 font-medium text-foreground">{row.company_name ?? '—'}</td>
                  <td className="px-4 py-2 text-foreground">{row.warehouse_name ?? '—'}</td>
                  <td className="px-4 py-2"><div className="flex justify-center"><StatusBadge status={row.status} /></div></td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {row.created_at ? new Date(row.created_at).toLocaleDateString('vi-VN') : '—'}
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
    </div>
  )
}
