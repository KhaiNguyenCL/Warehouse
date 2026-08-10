import { Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { useQuotations } from '../hooks/useQuotations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { cn } from '@/lib/utils'

function CodeBadge({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-border bg-muted/60 px-2 py-0.5 font-mono text-xs font-medium text-foreground">
      {children}
    </span>
  )
}

const STATUS_OPTIONS = [
  { value: 'draft',     label: 'Nháp' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'expired',   label: 'Hết hạn' },
  { value: 'cancelled', label: 'Đã hủy' },
] as const

export default function QuotationsPage() {
  const hook = useQuotations()

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
          <h1 className="text-2xl font-semibold tracking-tight">Báo giá</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Quản lý báo giá và xuất hàng cho khách</p>
        </div>
        <Button onClick={() => hook.navigate('/quotations/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Tạo báo giá
        </Button>
      </div>

      {/* Table card */}
      <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">

        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            {/* Status filters */}
            <button
              onClick={() => hook.setStatus(undefined)}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                !hook.status
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              Tất cả
            </button>
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => hook.setStatus(hook.status === opt.value ? undefined : opt.value)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  hook.status === opt.value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm mã, dự án…"
              value={hook.searchInput}
              onChange={(e) => hook.setSearchInput(e.target.value)}
              className="h-9 w-72 pl-9 text-sm shadow-none focus-visible:ring-1"
            />
          </div>
        </div>

        {/* Table */}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="w-12 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">#</th>
              <th className="w-36 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mã báo giá</th>
              <th className="w-48 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Khách hàng</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dự án</th>
              <th className="w-28 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trạng thái</th>
              <th className="w-36 px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tổng tiền</th>
              <th className="w-28 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Hết hạn</th>
              <th className="w-28 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ngày tạo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {hook.isFetching && rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">Đang tải…</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  {hook.searchInput ? 'Không tìm thấy kết quả.' : 'Chưa có báo giá nào.'}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr
                  key={row.id}
                  onClick={() => hook.navigate(`/quotations/${row.id}`)}
                  className="cursor-pointer transition-colors hover:bg-muted/40"
                >
                  <td className="px-4 py-3 text-center text-xs text-muted-foreground">{from + i}</td>
                  <td className="px-4 py-3"><CodeBadge>{row.code}</CodeBadge></td>
                  <td className="px-4 py-3 font-medium text-foreground">{row.company_name ?? '—'}</td>
                  <td className="px-4 py-3 text-foreground">{row.project_name ?? '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-foreground">
                    {row.grand_total != null ? Number(row.grand_total).toLocaleString('en-US') : '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.expired_at ? new Date(row.expired_at).toLocaleDateString('vi-VN') : '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
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
            <span className="text-xs text-muted-foreground">{from}–{to} / {total} báo giá</span>
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
    </div>
  )
}
