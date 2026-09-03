import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, ChevronRight } from 'lucide-react'
import { useActions } from '../hooks/useActions'
import { cn } from '@/lib/utils'

type Signal = 'green' | 'yellow' | 'red' | 'loading'

const SIGNAL_STYLE: Record<Signal, { bg: string; color: string }> = {
  green:   { bg: 'var(--s-completed-bg)', color: 'var(--s-completed-color)' },
  yellow:  { bg: 'var(--s-pending-bg)',   color: 'var(--s-pending-color)' },
  red:     { bg: 'var(--s-cancelled-bg)', color: 'var(--s-cancelled-color)' },
  loading: { bg: 'var(--bg-subtle)',      color: 'var(--text-3)' },
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SignalChip({
  signal, label, detail, loading,
}: { signal: Signal; label: string; detail: string; loading?: boolean }) {
  const s = SIGNAL_STYLE[signal]
  return (
    <div
      className="flex items-center gap-2 rounded-full border border-border-md px-3.5 py-1.5 text-xs font-semibold shadow-sm"
      style={{ background: s.bg, color: s.color }}
    >
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.color, opacity: loading ? 0.5 : 1 }} />
      <span>{label}</span>
      <span className="text-[11px] font-normal opacity-70">{loading ? '…' : detail}</span>
    </div>
  )
}

function AlertCard({
  intent, message, count, to,
}: { intent: 'warning' | 'danger'; message: string; count: number; to?: string }) {
  const navigate = useNavigate()
  const color = intent === 'danger' ? 'var(--s-cancelled-color)' : 'var(--s-pending-color)'
  const bg    = intent === 'danger' ? 'var(--s-cancelled-bg)'    : 'var(--s-pending-bg)'
  return (
    <div
      onClick={() => to && navigate(to)}
      className={cn(
        'flex items-center gap-3 rounded-xl border border-border-md bg-background px-4 py-3 shadow-sm transition-shadow',
        to && 'cursor-pointer hover:shadow-md',
      )}
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-extrabold tabular-nums"
        style={{ background: bg, color }}
      >
        {count}
      </span>
      <span className="flex-1 text-sm font-medium text-foreground">{message}</span>
      {to && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ActionsPage() {
  const hook = useActions()

  const dash     = hook.dashboard
  const pipeline = hook.pipeline
  const lowItems: any[] = hook.lowStockItems ?? []

  const totalPending = (dash?.pending_receipts ?? 0) + (dash?.pending_deliveries ?? 0) + (dash?.pending_transfers ?? 0)

  // ── Health signals ────────────────────────────────────────────────────────
  const signals = useMemo(() => {
    const dL = hook.dashboardLoading
    const pL = hook.pipelineLoading
    return [
      {
        label: 'Phê duyệt',
        signal: dL ? 'loading' : totalPending === 0 ? 'green' : totalPending <= 3 ? 'yellow' : 'red',
        detail: dL ? '' : totalPending === 0 ? 'Không có phiếu chờ' : `${totalPending} phiếu chờ`,
        loading: dL,
      },
      {
        label: 'Tồn kho',
        signal: dL ? 'loading'
          : (dash?.out_of_stock_count ?? 0) > 0 ? 'red'
          : (dash?.low_stock_count ?? 0) > 0 ? 'yellow'
          : 'green',
        detail: dL ? ''
          : (dash?.out_of_stock_count ?? 0) > 0 ? `${dash.out_of_stock_count} SKU hết hàng`
          : (dash?.low_stock_count ?? 0) > 0 ? `${dash.low_stock_count} SKU sắp hết`
          : 'Ổn định',
        loading: dL,
      },
      {
        label: 'Pipeline',
        signal: pL || !pipeline ? 'loading'
          : pipeline.fulfillment_rate >= 70 ? 'green'
          : pipeline.fulfillment_rate >= 40 ? 'yellow'
          : 'red',
        detail: pipeline ? `${pipeline.fulfillment_rate}% fulfillment` : '',
        loading: pL,
      },
      {
        label: 'Báo giá hết hạn',
        signal: dL ? 'loading'
          : (dash?.quotations_expiring_soon ?? 0) === 0 ? 'green'
          : (dash?.quotations_expiring_soon ?? 0) <= 3 ? 'yellow'
          : 'red',
        detail: dL ? ''
          : (dash?.quotations_expiring_soon ?? 0) === 0 ? 'Không có'
          : `${dash.quotations_expiring_soon} hết hạn trong 7 ngày`,
        loading: dL,
      },
    ] as Array<{ label: string; signal: Signal; detail: string; loading: boolean }>
  }, [hook.dashboardLoading, hook.pipelineLoading, totalPending, dash, pipeline])

  // ── Alerts ────────────────────────────────────────────────────────────────
  const alerts = useMemo(() => {
    const items: Array<{ intent: 'warning' | 'danger'; message: string; count: number; to?: string }> = []
    if ((dash?.out_of_stock_count ?? 0) > 0)
      items.push({ intent: 'danger',  message: 'SKU hết hàng — cần nhập bổ sung ngay',  count: dash.out_of_stock_count, to: '/inventory' })
    if ((dash?.pending_receipts ?? 0) > 0)
      items.push({ intent: 'warning', message: 'Phiếu nhập kho đang chờ phê duyệt',      count: dash.pending_receipts,   to: '/receipts' })
    if ((dash?.pending_deliveries ?? 0) > 0)
      items.push({ intent: 'warning', message: 'Phiếu xuất kho đang chờ phê duyệt',      count: dash.pending_deliveries, to: '/deliveries' })
    if ((dash?.pending_transfers ?? 0) > 0)
      items.push({ intent: 'warning', message: 'Phiếu chuyển kho đang chờ phê duyệt',    count: dash.pending_transfers,  to: '/transfers' })
    if ((dash?.quotations_expiring_soon ?? 0) > 0)
      items.push({ intent: 'warning', message: 'Báo giá sắp hết hạn (trong 7 ngày tới)', count: dash.quotations_expiring_soon, to: '/quotations' })
    if ((dash?.low_stock_count ?? 0) > 0)
      items.push({ intent: 'warning', message: 'SKU dưới ngưỡng tồn kho tối thiểu',      count: dash.low_stock_count })
    return items
  }, [dash])

  return (
    <div className="flex flex-col gap-6 pb-8">

      {/* Page header */}
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground">Hành động</h1>
        <p className="mt-1 text-sm text-muted-foreground">Việc cần xử lý hôm nay · tự động cập nhật mỗi 60 giây</p>
      </div>

      {/* ── Health signals ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {signals.map((s) => (
          <SignalChip key={s.label} signal={s.signal} label={s.label} detail={s.detail} loading={s.loading} />
        ))}
      </div>

      {/* ── Alert list ──────────────────────────────────────────────────────── */}
      {!hook.dashboardLoading && (
        alerts.length === 0 ? (
          <div
            className="flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm"
            style={{ borderColor: 'var(--s-completed-color)', background: 'var(--s-completed-bg)', color: 'var(--s-completed-color)' }}
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="font-bold">Mọi thứ đang ổn</span>
            <span className="opacity-80">— Không có phiếu chờ duyệt, tồn kho đủ, báo giá hợp lệ.</span>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {alerts.map((a, i) => <AlertCard key={i} {...a} />)}
          </div>
        )
      )}

      {/* ── SKU cần bổ sung hàng ─────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-border-md bg-background shadow-sm">
        <div className="flex items-center gap-2 border-b border-border bg-muted/60 px-4 py-2.5">
          <span className="text-xs font-semibold text-muted-foreground">SKU cần bổ sung hàng</span>
          {lowItems.length > 0 && (
            <span
              className="ml-auto shrink-0 rounded-full px-2.5 py-0.5 text-xs font-extrabold"
              style={{ background: 'var(--s-cancelled-bg)', color: 'var(--s-cancelled-color)' }}
            >
              {lowItems.length}
            </span>
          )}
        </div>
        {hook.lowStockLoading ? (
          <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">Đang tải…</div>
        ) : lowItems.length === 0 ? (
          <div className="flex h-40 items-center justify-center gap-2 text-sm font-medium" style={{ color: 'var(--s-completed-color)' }}>
            <CheckCircle2 className="h-4 w-4" />
            Tồn kho đủ — không có SKU nào dưới ngưỡng
          </div>
        ) : (
          <div className="max-h-96 overflow-auto">
            <table className="w-full">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-border bg-muted/60">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Mã hàng</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Tên</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Khả dụng</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Ngưỡng</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">Tình trạng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lowItems.map((r: any) => (
                  <tr key={r.variant_id} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-mono text-xs font-semibold text-muted-foreground">{r.item_code}</td>
                    <td className="px-4 py-2.5 max-w-[220px]">
                      <span className="block truncate text-xs font-medium text-foreground">{r.variant_name}</span>
                    </td>
                    <td
                      className="px-4 py-2.5 text-right text-sm font-extrabold tabular-nums"
                      style={{ color: r.qty_available <= 0 ? 'var(--s-cancelled-color)' : 'var(--s-pending-color)' }}
                    >
                      {r.qty_available}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs font-semibold tabular-nums text-muted-foreground">{r.reorder_point ?? '—'}</td>
                    <td className="px-4 py-2.5 text-center">
                      {r.qty_available <= 0 ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                          style={{ background: 'var(--s-cancelled-bg)', color: 'var(--s-cancelled-color)' }}
                        >
                          Hết hàng
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                          style={{ background: 'var(--s-pending-bg)', color: 'var(--s-pending-color)' }}
                        >
                          Sắp hết
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
