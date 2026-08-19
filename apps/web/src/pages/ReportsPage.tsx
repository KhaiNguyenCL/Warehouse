import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import dayjs from 'dayjs'
import { AlertCircle, CheckCircle2, ChevronRight } from 'lucide-react'
import { useReports } from '../hooks/useReports'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtMoney(v: number | undefined) {
  if (!v) return '0 ₫'
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)} tỷ`
  if (v >= 1_000_000)     return `${(v / 1_000_000).toFixed(0)} tr`
  return `${Number(v).toLocaleString('vi-VN')} ₫`
}
function fmtMoneyFull(v: number | undefined) {
  return `${Number(v ?? 0).toLocaleString('vi-VN')} ₫`
}
function fmtDate(d: string, groupBy: 'day' | 'month') {
  return dayjs(d).format(groupBy === 'month' ? 'MM/YYYY' : 'DD/MM')
}

type Signal = 'green' | 'yellow' | 'red' | 'loading'

const CAT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316']
const CHART_COLORS = { receipts: '#3b82f6', deliveries: '#10b981', revenue: '#8b5cf6' }

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-bold uppercase tracking-widest text-foreground/50">
      {children}
    </h2>
  )
}

// Signal chips: green = light, yellow/red = filled for urgency
function SignalChip({
  signal, label, detail, loading,
}: { signal: Signal; label: string; detail: string; loading?: boolean }) {
  const cls: Record<Signal, string> = {
    green:   'border-emerald-200 bg-emerald-50 text-emerald-800',
    yellow:  'border-amber-500 bg-amber-500 text-white',
    red:     'border-red-600 bg-red-600 text-white',
    loading: 'border-border bg-muted text-muted-foreground',
  }
  const dotCls: Record<Signal, string> = {
    green:   'bg-emerald-500',
    yellow:  'bg-white/80 animate-pulse',
    red:     'bg-white/80 animate-pulse',
    loading: 'bg-muted-foreground/40 animate-pulse',
  }
  const detailCls: Record<Signal, string> = {
    green: 'text-emerald-700/70', yellow: 'text-white/80', red: 'text-white/80', loading: 'text-muted-foreground',
  }
  return (
    <div className={cn('flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium shadow-sm', cls[signal])}>
      <span className={cn('h-2 w-2 shrink-0 rounded-full', dotCls[signal])} />
      <span>{label}</span>
      <span className={cn('text-[11px]', detailCls[signal])}>{loading ? '…' : detail}</span>
    </div>
  )
}

// Alert rows: thick left border, strong background
function AlertRow({
  intent, message, count, to,
}: { intent: 'warning' | 'danger'; message: string; count: number; to?: string }) {
  const navigate = useNavigate()
  return (
    <div className={cn(
      'flex items-center gap-3 border-b border-border py-3 pl-4 pr-4 last:border-0 transition-colors',
      'border-l-4',
      intent === 'danger'
        ? 'border-l-red-500 bg-red-50 hover:bg-red-100/70'
        : 'border-l-amber-400 bg-amber-50 hover:bg-amber-100/60',
    )}>
      <span className={cn(
        'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-extrabold tabular-nums',
        intent === 'danger' ? 'bg-red-500 text-white' : 'bg-amber-400 text-white',
      )}>{count}</span>
      <span className={cn(
        'flex-1 text-sm font-medium',
        intent === 'danger' ? 'text-red-900' : 'text-amber-900',
      )}>{message}</span>
      {to && (
        <button
          onClick={() => navigate(to)}
          className={cn(
            'shrink-0 flex items-center gap-0.5 text-xs font-semibold',
            intent === 'danger' ? 'text-red-600 hover:text-red-800' : 'text-amber-700 hover:text-amber-900',
          )}
        >
          Xem <ChevronRight className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

// StatRow: strong value hierarchy
function StatRow({
  label, value, sub, large, valueColor,
}: {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  large?: boolean
  valueColor?: string
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-2.5 last:border-0">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="shrink-0 text-right">
        <div className={cn(
          'tabular-nums',
          large
            ? cn('text-2xl font-extrabold tracking-tight', valueColor ?? 'text-foreground')
            : cn('text-sm font-bold', valueColor ?? 'text-foreground'),
        )}>{value}</div>
        {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
      </div>
    </div>
  )
}

function ProgressBar({ pct, color = 'bg-primary' }: { pct: number; color?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  )
}

function DateRangeBar({
  from, to, groupBy, onFrom, onTo, onGroupBy,
}: {
  from: string; to: string; groupBy: 'day' | 'month'
  onFrom: (v: string) => void; onTo: (v: string) => void; onGroupBy: (v: 'day' | 'month') => void
}) {
  return (
    <div className="flex items-center gap-2">
      <input type="date" value={from} max={to} onChange={(e) => onFrom(e.target.value)}
        className="h-7 rounded-lg border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
      />
      <span className="text-xs text-muted-foreground">—</span>
      <input type="date" value={to} min={from} onChange={(e) => onTo(e.target.value)}
        className="h-7 rounded-lg border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
      />
      <Select value={groupBy} onValueChange={(v) => onGroupBy(v as 'day' | 'month')}>
        <SelectTrigger className="h-7 w-28 text-xs shadow-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="day">Theo ngày</SelectItem>
          <SelectItem value="month">Theo tháng</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

function ChartTooltip({ active, payload, label, groupBy }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border bg-background px-3 py-2 shadow-lg text-xs">
      <p className="mb-1.5 font-semibold text-foreground">{fmtDate(String(label), groupBy)}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="flex items-center gap-1.5" style={{ color: p.color }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="font-bold">{fmtMoneyFull(p.value)}</span>
        </p>
      ))}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const navigate = useNavigate()
  const hook = useReports()

  const dash     = hook.dashboard
  const pipeline = hook.pipeline
  const invSum   = hook.invSummary
  const lowItems: any[] = hook.lowStockItems ?? []
  const catData:  any[] = hook.invByCategory ?? []
  const flowData: any[] = (hook.stockFlow ?? []).map((d: any) => ({ ...d, period: String(d.period) }))
  const revData:  any[] = (hook.revSeries  ?? []).map((d: any) => ({ ...d, period: String(d.period) }))

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

  // ── Donut data ────────────────────────────────────────────────────────────
  const donutData = useMemo(() => {
    if (!catData.length) return []
    const sorted = [...catData].sort((a: any, b: any) => Number(b.total_value) - Number(a.total_value))
    const rows = sorted.length <= 6 ? sorted : sorted.slice(0, 5)
    const result = rows.map((r: any) => ({ name: r.category_name ?? 'Chưa phân loại', value: Number(r.total_value) }))
    if (sorted.length > 6) {
      const rest = sorted.slice(5).reduce((s: number, r: any) => s + Number(r.total_value), 0)
      result.push({ name: 'Khác', value: rest })
    }
    return result
  }, [catData])

  const donutTotal = donutData.reduce((s, d) => s + d.value, 0)

  // ── Pipeline derived ──────────────────────────────────────────────────────
  const pipelineTotal = pipeline?.total_value ?? 0
  const deliveredPct  = pipelineTotal > 0 ? (pipeline!.delivered_value / pipelineTotal) * 100 : 0
  const backlogPct    = pipelineTotal > 0 ? (pipeline!.backlog_value   / pipelineTotal) * 100 : 0
  const reservedPct   = invSum && invSum.total_qty_on_hand > 0
    ? Math.round((invSum.total_qty_reserved / invSum.total_qty_on_hand) * 100) : 0

  return (
    <div className="flex flex-col gap-5 pb-8">

      {/* Page header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tổng quan hoạt động kinh doanh · tự động cập nhật mỗi 60 giây</p>
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
          <div className="flex items-center gap-2.5 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span className="font-bold">Mọi thứ đang ổn</span>
            <span className="text-emerald-700/70">— Không có phiếu chờ duyệt, tồn kho đủ, báo giá hợp lệ.</span>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
            <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-2.5">
              <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
              <SectionTitle>Cần xử lý ngay</SectionTitle>
              <span className="ml-auto shrink-0 rounded-full bg-red-500 px-2.5 py-0.5 text-xs font-extrabold text-white">
                {alerts.length}
              </span>
            </div>
            {alerts.map((a, i) => <AlertRow key={i} {...a} />)}
          </div>
        )
      )}

      {/* ── Pipeline + Inventory ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">

        {/* Pipeline — 3/5 */}
        <div className="lg:col-span-3 overflow-hidden rounded-xl border border-border bg-background shadow-sm">
          <div className="flex items-center justify-between border-b border-border bg-muted/20 px-4 py-2.5">
            <SectionTitle>Pipeline bán hàng</SectionTitle>
            <button
              onClick={() => navigate('/quotations')}
              className="flex items-center gap-0.5 text-xs font-semibold text-primary hover:text-primary/80"
            >
              Xem báo giá <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <div className="px-4 py-1">
            <StatRow
              label="Báo giá đang confirmed"
              value={pipeline?.confirmed_count ?? '—'}
              sub="đang chờ xuất hàng"
            />
            <StatRow
              label="Tổng giá trị"
              value={fmtMoney(pipeline?.total_value)}
              sub={fmtMoneyFull(pipeline?.total_value)}
              large
              valueColor="text-blue-600"
            />
            <StatRow
              label="Backlog chưa xuất"
              value={fmtMoney(pipeline?.backlog_value)}
              sub={fmtMoneyFull(pipeline?.backlog_value)}
              large
              valueColor={pipeline?.backlog_value > 0 ? 'text-amber-600' : 'text-foreground'}
            />
            <StatRow
              label="Đã xuất tháng này"
              value={fmtMoney(pipeline?.this_month_delivered)}
              sub={fmtMoneyFull(pipeline?.this_month_delivered)}
              large
              valueColor="text-emerald-600"
            />
          </div>

          {pipeline && pipelineTotal > 0 && (
            <div className="px-4 pb-4 pt-2">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Phân bổ pipeline</span>
                <span className={cn(
                  'text-sm font-extrabold tabular-nums',
                  pipeline.fulfillment_rate >= 70 ? 'text-emerald-600' :
                  pipeline.fulfillment_rate >= 40 ? 'text-amber-600' : 'text-red-600',
                )}>{pipeline.fulfillment_rate}% hoàn thành</span>
              </div>
              <div className="flex h-6 w-full overflow-hidden rounded-lg gap-px shadow-inner">
                <div
                  className="flex h-full items-center justify-center bg-emerald-500 transition-all"
                  style={{ width: `${deliveredPct}%` }}
                  title={`Đã xuất: ${fmtMoneyFull(pipeline.delivered_value)}`}
                >
                  {deliveredPct > 14 && <span className="text-[10px] font-bold text-white">Đã xuất</span>}
                </div>
                <div
                  className="flex h-full items-center justify-center bg-amber-400 transition-all"
                  style={{ width: `${backlogPct}%` }}
                  title={`Backlog: ${fmtMoneyFull(pipeline.backlog_value)}`}
                >
                  {backlogPct > 14 && <span className="text-[10px] font-bold text-white">Backlog</span>}
                </div>
                <div className="h-full flex-1 rounded-r-lg bg-muted" />
              </div>
              <div className="mt-2 flex gap-4 text-xs font-medium text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Đã xuất: {fmtMoneyFull(pipeline.delivered_value)}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />Backlog: {fmtMoneyFull(pipeline.backlog_value)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Inventory — 2/5 */}
        <div className="lg:col-span-2 overflow-hidden rounded-xl border border-border bg-background shadow-sm">
          <div className="flex items-center justify-between border-b border-border bg-muted/20 px-4 py-2.5">
            <SectionTitle>Tình hình kho</SectionTitle>
            <Select
              value={hook.warehouseId ?? '__all__'}
              onValueChange={(v) => hook.setWarehouseId(v === '__all__' ? undefined : v)}
            >
              <SelectTrigger className="h-6 w-32 border-0 p-0 text-xs shadow-none focus:ring-0 gap-1">
                <SelectValue placeholder="Tất cả kho" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Tất cả kho</SelectItem>
                {(hook.warehouses ?? []).map((w: any) => (
                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="px-4 py-1">
            <StatRow
              label="Giá trị hàng tồn"
              value={fmtMoney(invSum?.total_value)}
              sub={fmtMoneyFull(invSum?.total_value)}
              large
              valueColor="text-violet-600"
            />
            <StatRow
              label="Số SKU đang tồn"
              value={`${invSum?.total_skus ?? '—'} loại`}
            />
            <StatRow
              label="Tổng số lượng"
              value={Number(invSum?.total_qty_on_hand ?? 0).toLocaleString('vi-VN')}
              sub={`Khả dụng: ${Number((invSum?.total_qty_on_hand ?? 0) - (invSum?.total_qty_reserved ?? 0)).toLocaleString('vi-VN')}`}
            />
          </div>
          {invSum && (
            <div className="px-4 pb-4 pt-2">
              <div className="mb-1.5 flex justify-between text-xs font-medium text-muted-foreground">
                <span>Đang reserved</span>
                <span className="font-bold text-amber-600 tabular-nums">
                  {Number(invSum.total_qty_reserved).toLocaleString('vi-VN')} ({reservedPct}%)
                </span>
              </div>
              <ProgressBar pct={reservedPct} color="bg-amber-400" />
            </div>
          )}
        </div>
      </div>

      {/* ── Category donut + Low stock ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        {/* Category donut */}
        <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
          <div className="border-b border-border bg-muted/20 px-4 py-2.5">
            <SectionTitle>Phân bổ vốn theo danh mục</SectionTitle>
          </div>
          {donutData.length === 0 ? (
            <div className="flex h-52 items-center justify-center text-xs text-muted-foreground">Không có dữ liệu</div>
          ) : (
            <div className="flex items-center gap-4 p-4">
              <div className="relative shrink-0">
                <PieChart width={152} height={152}>
                  <Pie
                    data={donutData}
                    cx={71} cy={71}
                    innerRadius={46} outerRadius={68}
                    dataKey="value"
                    paddingAngle={2}
                    strokeWidth={0}
                    startAngle={90}
                    endAngle={-270}
                  >
                    {donutData.map((_, i) => (
                      <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-sm font-extrabold tabular-nums leading-tight text-foreground">{fmtMoney(donutTotal)}</span>
                  <span className="text-[10px] text-muted-foreground">tổng vốn</span>
                </div>
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                {donutData.map((d, i) => {
                  const pct = donutTotal > 0 ? Math.round((d.value / donutTotal) * 100) : 0
                  return (
                    <div key={d.name} className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: CAT_COLORS[i % CAT_COLORS.length] }} />
                      <span className="flex-1 truncate text-xs font-medium text-foreground">{d.name}</span>
                      <span className="w-8 shrink-0 text-right text-xs font-bold tabular-nums" style={{ color: CAT_COLORS[i % CAT_COLORS.length] }}>{pct}%</span>
                      <span className="w-20 shrink-0 text-right text-xs font-semibold tabular-nums text-foreground">{fmtMoney(d.value)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Low stock */}
        <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
          <div className="flex items-center gap-2 border-b border-border bg-muted/20 px-4 py-2.5">
            <SectionTitle>SKU cần bổ sung hàng</SectionTitle>
            {lowItems.length > 0 && (
              <span className="ml-auto shrink-0 rounded-full bg-red-500 px-2.5 py-0.5 text-xs font-extrabold text-white">
                {lowItems.length}
              </span>
            )}
          </div>
          {lowItems.length === 0 ? (
            <div className="flex h-52 items-center justify-center gap-2 text-sm font-medium text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              Tồn kho đủ — không có SKU nào dưới ngưỡng
            </div>
          ) : (
            <div className="max-h-60 overflow-auto">
              <table className="w-full">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-border bg-muted/60">
                    <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Mã hàng</th>
                    <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Tên</th>
                    <th className="px-3 py-2 text-right text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Khả dụng</th>
                    <th className="px-3 py-2 text-right text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Ngưỡng</th>
                    <th className="px-3 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Tình trạng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {lowItems.map((r: any) => (
                    <tr key={r.variant_id} className="hover:bg-muted/30">
                      <td className="px-3 py-2 font-mono text-xs font-semibold text-muted-foreground">{r.item_code}</td>
                      <td className="px-3 py-2 max-w-[130px]">
                        <span className="block truncate text-xs font-medium text-foreground">{r.variant_name}</span>
                      </td>
                      <td className={cn(
                        'px-3 py-2 text-right text-sm font-extrabold tabular-nums',
                        r.qty_available <= 0 ? 'text-red-600' : 'text-amber-600',
                      )}>{r.qty_available}</td>
                      <td className="px-3 py-2 text-right text-xs font-semibold tabular-nums text-muted-foreground">{r.reorder_point ?? '—'}</td>
                      <td className="px-3 py-2 text-center">
                        {r.qty_available <= 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-2.5 py-0.5 text-[11px] font-bold text-white">
                            Hết hàng
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-0.5 text-[11px] font-bold text-white">
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

      {/* ── Stock flow chart ──────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
        <div className="flex items-center justify-between border-b border-border bg-muted/20 px-4 py-2.5">
          <SectionTitle>Dòng chảy nhập / xuất (theo giá trị)</SectionTitle>
          <DateRangeBar
            from={hook.flowFrom} to={hook.flowTo} groupBy={hook.flowGroupBy}
            onFrom={hook.setFlowFrom} onTo={hook.setFlowTo} onGroupBy={hook.setFlowGroupBy}
          />
        </div>
        <div className="p-4">
          {hook.stockFlowLoading ? (
            <div className="flex h-52 items-center justify-center text-xs text-muted-foreground">Đang tải…</div>
          ) : flowData.length === 0 ? (
            <div className="flex h-52 items-center justify-center text-xs text-muted-foreground">
              Không có dữ liệu trong khoảng thời gian này
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={flowData} margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={CHART_COLORS.receipts}   stopOpacity={0.2} />
                    <stop offset="95%" stopColor={CHART_COLORS.receipts}   stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gD" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={CHART_COLORS.deliveries} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={CHART_COLORS.deliveries} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="period" tickFormatter={(v) => fmtDate(v, hook.flowGroupBy)} tick={{ fontSize: 11, fontWeight: 500 }} />
                <YAxis tickFormatter={(v) => fmtMoney(v)} tick={{ fontSize: 11, fontWeight: 500 }} width={64} />
                <Tooltip content={(p) => <ChartTooltip {...p} groupBy={hook.flowGroupBy} />} />
                <Area type="monotone" dataKey="receipts"   name="Nhập kho" stroke={CHART_COLORS.receipts}   fill="url(#gR)" strokeWidth={2.5} dot={false} />
                <Area type="monotone" dataKey="deliveries" name="Xuất kho" stroke={CHART_COLORS.deliveries} fill="url(#gD)" strokeWidth={2.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Revenue section ───────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
        <div className="flex items-center justify-between border-b border-border bg-muted/20 px-4 py-2.5">
          <SectionTitle>Doanh thu (phiếu xuất hoàn thành)</SectionTitle>
          <DateRangeBar
            from={hook.revFrom} to={hook.revTo} groupBy={hook.revGroupBy}
            onFrom={hook.setRevFrom} onTo={hook.setRevTo} onGroupBy={hook.setRevGroupBy}
          />
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
          {[
            {
              label: 'Tổng doanh thu',
              value: fmtMoney(hook.revSummary?.total_revenue),
              sub: fmtMoneyFull(hook.revSummary?.total_revenue),
              color: 'text-violet-600',
            },
            {
              label: 'Số phiếu xuất',
              value: hook.revSummary?.total_orders ?? '—',
              sub: 'đã completed',
              color: 'text-foreground',
            },
            {
              label: 'Tổng SL xuất',
              value: Number(hook.revSummary?.total_qty ?? 0).toLocaleString('vi-VN'),
              sub: 'đơn vị sản phẩm',
              color: 'text-foreground',
            },
          ].map((item) => (
            <div key={item.label} className="px-4 py-4">
              <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
              <p className={cn('mt-1 text-2xl font-extrabold tabular-nums tracking-tight', item.color)}>
                {item.value}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{item.sub}</p>
            </div>
          ))}
        </div>

        {/* Chart + top products */}
        <div className="grid grid-cols-1 divide-x divide-border lg:grid-cols-2">
          <div className="p-4">
            <p className="mb-3 text-xs font-semibold text-muted-foreground">
              Doanh thu {hook.revGroupBy === 'month' ? 'theo tháng' : 'theo ngày'}
            </p>
            {hook.revSeriesLoading ? (
              <div className="flex h-48 items-center justify-center text-xs text-muted-foreground">Đang tải…</div>
            ) : revData.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-xs text-muted-foreground">Không có dữ liệu</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={revData} margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="period" tickFormatter={(v) => fmtDate(v, hook.revGroupBy)} tick={{ fontSize: 11, fontWeight: 500 }} />
                  <YAxis tickFormatter={(v) => fmtMoney(v)} tick={{ fontSize: 11, fontWeight: 500 }} width={56} />
                  <Tooltip content={(p) => <ChartTooltip {...p} groupBy={hook.revGroupBy} />} />
                  <Bar dataKey="revenue" name="Doanh thu" fill={CHART_COLORS.revenue} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <span className="text-xs font-bold text-foreground">Top sản phẩm bán chạy</span>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                Top
                <input
                  type="number" min={1} max={50}
                  value={hook.topLimit}
                  onChange={(e) => hook.setTopLimit(Number(e.target.value) || 10)}
                  className="h-6 w-10 rounded border border-border bg-background px-1 text-center text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
            {hook.topProductsLoading ? (
              <div className="flex h-48 items-center justify-center text-xs text-muted-foreground">Đang tải…</div>
            ) : (hook.topProducts ?? []).length === 0 ? (
              <div className="flex h-48 items-center justify-center text-xs text-muted-foreground">Không có dữ liệu</div>
            ) : (
              <div className="max-h-60 overflow-auto">
                <table className="w-full">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-border bg-muted/60">
                      <th className="w-6 px-3 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-muted-foreground">#</th>
                      <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Sản phẩm</th>
                      <th className="w-14 px-3 py-2 text-right text-[11px] font-bold uppercase tracking-wide text-muted-foreground">SL</th>
                      <th className="w-28 px-3 py-2 text-right text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Doanh thu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(hook.topProducts ?? []).map((r: any, i: number) => (
                      <tr key={r.variant_id} className="hover:bg-muted/30">
                        <td className="px-3 py-2 text-center text-xs font-bold text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-2">
                          <p className="max-w-[160px] truncate text-xs font-medium text-foreground">{r.variant_name}</p>
                          <p className="font-mono text-[11px] text-muted-foreground">{r.item_code}</p>
                        </td>
                        <td className="px-3 py-2 text-right text-xs font-semibold tabular-nums text-muted-foreground">
                          {Number(r.total_qty).toLocaleString('vi-VN')}
                        </td>
                        <td className="px-3 py-2 text-right text-sm font-extrabold tabular-nums text-violet-600">
                          {fmtMoneyFull(r.total_revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
