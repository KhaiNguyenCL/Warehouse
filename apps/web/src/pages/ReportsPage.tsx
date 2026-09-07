import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import dayjs from 'dayjs'
import {
  ChevronRight, TrendingUp, Wallet, Clock3, Target, RotateCw,
  Warehouse, PieChartIcon, History, ArrowLeftRight, Banknote,
} from 'lucide-react'
import { useReports } from '../hooks/useReports'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
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

// 1 bảng màu duy nhất cho mọi chart trong trang — donut (7 hạng mục) dùng từ đầu mảng,
// area/bar chart dùng 3 màu đầu đặt tên riêng để dễ đọc code hơn là index số.
const CHART_PALETTE = ['#2563eb', '#059669', '#d97706', '#7c3aed', '#dc2626', '#0891b2', '#ea580c']
const FLOW_COLORS = { receipts: CHART_PALETTE[0], deliveries: CHART_PALETTE[1] }
const REVENUE_COLOR = CHART_PALETTE[3]

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionTitle({ children, icon: Icon }: { children: React.ReactNode; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <h2 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </h2>
  )
}

// Card section — vỏ bọc chuẩn cho mọi block trong trang, có hover lift nhẹ để không bị phẳng.
function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      'overflow-hidden rounded-xl border border-border-md bg-background shadow-sm transition-shadow duration-200 hover:shadow-md',
      className,
    )}>
      {children}
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
    <div className="flex flex-wrap items-center gap-2">
      <input type="date" value={from} max={to} onChange={(e) => onFrom(e.target.value)}
        className="h-7 rounded-lg border border-border bg-background px-2 text-xs transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
      />
      <span className="text-xs text-muted-foreground">—</span>
      <input type="date" value={to} min={from} onChange={(e) => onTo(e.target.value)}
        className="h-7 rounded-lg border border-border bg-background px-2 text-xs transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
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

// Sparkline nhỏ trong KPI tile — tính điểm bằng JS thuần (không cần recharts cho 1 đường nhỏ).
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null
  const w = 88, h = 28, padY = 3
  const max = Math.max(...data), min = Math.min(0, ...data)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = padY + (h - padY * 2) - ((v - min) / range) * (h - padY * 2)
    return [x, y] as const
  })
  const line = 'M' + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L')
  const area = `${line} L${w},${h} L0,${h} Z`
  const [lastX, lastY] = pts[pts.length - 1]
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="mt-2 block">
      <path d={area} fill={color} opacity={0.14} />
      <path d={line} fill="none" stroke={color} strokeWidth={1.6} />
      <circle cx={lastX} cy={lastY} r={2.3} fill={color} />
    </svg>
  )
}

// direction: 'up-good' = tăng là tích cực (doanh thu, tỷ lệ hoàn thành, vòng quay), 'up-bad' =
// tăng là tiêu cực (backlog), 'neutral' = không có hướng tốt/xấu rõ ràng (giá trị tồn kho).
function KpiTile({
  label, value, unit, delta, direction, sparklineData, sparklineColor, caption, noDeltaText, icon: Icon,
}: {
  label: string
  value: React.ReactNode
  unit?: string
  delta: number | null
  direction: 'up-good' | 'up-bad' | 'neutral'
  sparklineData?: number[]
  sparklineColor: string
  caption?: string
  noDeltaText?: string
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
}) {
  const isGood = delta == null ? null : direction === 'up-good' ? delta > 0 : direction === 'up-bad' ? delta < 0 : null
  const deltaCls = isGood == null ? 'bg-muted text-muted-foreground' : 'text-white'
  const deltaStyle = isGood == null ? undefined : { background: isGood ? 'var(--s-completed-color)' : 'var(--s-cancelled-color)' }
  return (
    <div className="group relative min-w-0 overflow-hidden rounded-xl border border-border-md bg-background px-5 py-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <span className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100" style={{ background: sparklineColor }} />
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" style={{ color: sparklineColor }} />
        <p className="truncate text-xs font-medium text-muted-foreground" title={label}>{label}</p>
      </div>
      <p className="mt-1.5 text-xl font-extrabold tabular-nums tracking-tight text-foreground">
        {value}{unit && <span className="ml-1 text-xs font-medium text-muted-foreground">{unit}</span>}
      </p>
      {delta != null ? (
        <span className={cn('mt-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold', deltaCls)} style={deltaStyle}>
          {delta > 0 ? '▲' : delta < 0 ? '▼' : '–'} {Math.abs(delta)}{caption ?? '%'}
        </span>
      ) : (
        <span className="mt-1.5 block text-[11px] text-muted-foreground">{noDeltaText ?? 'Đang tích luỹ dữ liệu…'}</span>
      )}
      {sparklineData && <Sparkline data={sparklineData} color={sparklineColor} />}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const navigate = useNavigate()
  const hook = useReports()

  // Hover (không phải click) mở popover danh sách báo giá đang backlog — đóng có độ trễ nhỏ
  // để di chuột từ thanh bar sang popover không bị đóng giữa chừng.
  const [backlogOpen, setBacklogOpen] = useState(false)
  const backlogCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  function openBacklogPopover() {
    if (backlogCloseTimer.current) clearTimeout(backlogCloseTimer.current)
    setBacklogOpen(true)
  }
  function scheduleCloseBacklogPopover() {
    backlogCloseTimer.current = setTimeout(() => setBacklogOpen(false), 150)
  }

  const pipeline = hook.pipeline
  const invSum   = hook.invSummary
  const catData:  any[] = hook.invByCategory ?? []
  const whData:   any[] = hook.invByWarehouse ?? []
  const slowData: any[] = hook.slowMovingStock ?? []
  const flowData: any[] = (hook.stockFlow ?? []).map((d: any) => ({ ...d, period: String(d.period) }))
  const revData:  any[] = (hook.revSeries  ?? []).map((d: any) => ({ ...d, period: String(d.period) }))

  // ── KPI band data ─────────────────────────────────────────────────────────
  const trend = hook.kpiTrend
  const trendPoints: any[] = trend?.points ?? []
  const lastPoint = trendPoints[trendPoints.length - 1]
  const revenueSum = trendPoints.reduce((s, p) => s + p.revenue, 0)

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
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground">Báo cáo</h1>
        <p className="mt-1 text-sm text-muted-foreground">Phân tích số liệu kinh doanh</p>
      </div>

      {/* ── KPI band ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiTile
          label="Doanh thu 14 ngày"
          value={fmtMoney(revenueSum)}
          delta={trend?.deltas?.revenue_pct ?? null}
          direction="up-good"
          sparklineData={trendPoints.map((p) => p.revenue)}
          sparklineColor="#2563eb"
          icon={TrendingUp}
        />
        <KpiTile
          label="Giá trị tồn kho"
          value={fmtMoney(lastPoint?.inventory_value ?? invSum?.total_value)}
          delta={trend?.deltas?.inventory_value_pct ?? null}
          direction="neutral"
          sparklineData={trendPoints.map((p) => p.inventory_value)}
          sparklineColor="#7c3aed"
          icon={Wallet}
        />
        <KpiTile
          label="Backlog chưa xuất"
          value={fmtMoney(lastPoint?.backlog_value ?? pipeline?.backlog_value)}
          delta={trend?.deltas?.backlog_value_pct ?? null}
          direction="up-bad"
          sparklineData={trendPoints.map((p) => p.backlog_value)}
          sparklineColor="#d97706"
          icon={Clock3}
        />
        <KpiTile
          label="Tỷ lệ hoàn thành"
          value={lastPoint?.fulfillment_rate ?? pipeline?.fulfillment_rate ?? '—'}
          unit="%"
          delta={trend?.deltas?.fulfillment_rate_pt ?? null}
          direction="up-good"
          caption=" điểm"
          sparklineData={trendPoints.map((p) => p.fulfillment_rate)}
          sparklineColor="#059669"
          icon={Target}
        />
        <KpiTile
          label="Vòng quay tồn kho"
          value={trend?.turnover != null ? trend.turnover.toLocaleString('vi-VN') : '—'}
          unit={trend?.turnover != null ? 'lần/14 ngày' : undefined}
          delta={null}
          direction="neutral"
          sparklineColor="#0891b2"
          noDeltaText="Doanh thu 14 ngày ÷ tồn kho TB"
          icon={RotateCw}
        />
      </div>

      {/* ── Pipeline + Inventory ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">

        {/* Pipeline — 3/5 */}
        <Card className="lg:col-span-3">
          <div className="flex items-center justify-between border-b border-border bg-muted/60 px-4 py-2.5">
            <SectionTitle icon={TrendingUp}>Pipeline bán hàng</SectionTitle>
            <button
              onClick={() => navigate('/quotations')}
              className="group flex items-center gap-0.5 text-xs font-semibold text-primary transition-colors hover:text-primary/80"
            >
              Xem báo giá <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2.5 p-3">
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 transition-colors hover:bg-muted/50">
              <p className="text-[11px] font-medium text-muted-foreground">Báo giá confirmed</p>
              <p className="mt-0.5 text-base font-bold tabular-nums text-foreground">{pipeline?.confirmed_count ?? '—'}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 transition-colors hover:bg-muted/50">
              <p className="text-[11px] font-medium text-muted-foreground">Tổng pipeline</p>
              <p className="mt-0.5 text-base font-bold tabular-nums text-blue-600">{fmtMoney(pipeline?.total_value)}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 transition-colors hover:bg-muted/50">
              <p className="text-[11px] font-medium text-muted-foreground">Đã xuất tháng này</p>
              <p className={cn('mt-0.5 text-base font-bold tabular-nums', pipeline?.this_month_delivered ? 'text-emerald-600' : 'text-red-600')}>
                {fmtMoney(pipeline?.this_month_delivered)}
              </p>
            </div>
          </div>

          {pipeline && pipeline.this_month_delivered === 0 && pipeline.backlog_value > 0 && (
            <div className="mx-4 mb-1 flex items-start gap-2 rounded-lg px-3 py-2 text-xs" style={{ background: 'var(--s-pending-bg)', color: 'var(--s-pending-color)' }}>
              <span className="shrink-0">⚠</span>
              <span><b>Chưa xuất phiếu nào</b> tháng này dù backlog đang có {fmtMoneyFull(pipeline.backlog_value)}.</span>
            </div>
          )}

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
                <Popover open={backlogOpen} onOpenChange={setBacklogOpen}>
                  <PopoverTrigger asChild>
                    <div
                      className="flex h-full items-center justify-center bg-amber-400 transition-all cursor-pointer"
                      style={{ width: `${backlogPct}%` }}
                      onMouseEnter={openBacklogPopover}
                      onMouseLeave={scheduleCloseBacklogPopover}
                    >
                      {backlogPct > 14 && <span className="text-[10px] font-bold text-white">Backlog</span>}
                    </div>
                  </PopoverTrigger>
                  <PopoverContent
                    align="center"
                    className="w-80 p-0"
                    onMouseEnter={openBacklogPopover}
                    onMouseLeave={scheduleCloseBacklogPopover}
                  >
                    <div className="border-b border-border px-3 py-2">
                      <p className="text-xs font-semibold text-foreground">Báo giá đang có backlog</p>
                      <p className="text-[11px] text-muted-foreground">Bấm vào 1 dòng để mở báo giá đó</p>
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {hook.backlogQuotationsLoading ? (
                        <div className="px-3 py-6 text-center text-xs text-muted-foreground">Đang tải…</div>
                      ) : !hook.backlogQuotations?.length ? (
                        <div className="px-3 py-6 text-center text-xs text-muted-foreground">Không có báo giá nào đang backlog</div>
                      ) : (
                        <div className="divide-y divide-border">
                          {hook.backlogQuotations.map((q: any) => (
                            <button
                              key={q.quotation_id}
                              onClick={() => { setBacklogOpen(false); navigate(`/quotations/${q.quotation_id}`) }}
                              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/50"
                            >
                              <span className="min-w-0">
                                <span className="block font-mono text-xs font-semibold text-foreground">{q.quotation_code}</span>
                                {q.customer_name && (
                                  <span className="block truncate text-[11px] text-muted-foreground" title={q.customer_name}>{q.customer_name}</span>
                                )}
                              </span>
                              <span className="shrink-0 text-xs font-bold tabular-nums text-amber-600">{fmtMoneyFull(q.backlog_value)}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
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
        </Card>

        {/* Tồn kho theo kho — 2/5 */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border bg-muted/60 px-4 py-2.5">
            <SectionTitle icon={Warehouse}>Tồn kho theo kho</SectionTitle>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-2 text-left text-[11px] font-semibold text-muted-foreground">Kho</th>
                <th className="px-4 py-2 text-right text-[11px] font-semibold text-muted-foreground">Giá trị</th>
                <th className="px-4 py-2 text-right text-[11px] font-semibold text-muted-foreground">SKU</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {whData.length === 0 ? (
                <tr><td colSpan={3} className="px-4 py-6 text-center text-xs text-muted-foreground">Không có dữ liệu</td></tr>
              ) : whData.map((w: any) => (
                <tr key={w.warehouse_id} className="transition-colors hover:bg-muted/30">
                  <td className="px-4 py-2.5 text-sm font-medium text-foreground">{w.warehouse_name}</td>
                  <td className="px-4 py-2.5 text-right text-sm font-semibold tabular-nums text-violet-600">
                    {Number(w.total_value) > 0 ? fmtMoney(Number(w.total_value)) : <span className="italic text-muted-foreground">trống</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right text-xs tabular-nums text-muted-foreground">{w.total_skus}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {invSum && (
            <div className="px-4 pb-4 pt-3">
              <div className="mb-1.5 flex justify-between text-xs font-medium text-muted-foreground">
                <span>Đang giữ chỗ (reserved)</span>
                <span className="font-bold text-amber-600 tabular-nums">
                  {Number(invSum.total_qty_reserved).toLocaleString('vi-VN')} / {Number(invSum.total_qty_on_hand).toLocaleString('vi-VN')} ({reservedPct}%)
                </span>
              </div>
              <ProgressBar pct={reservedPct} color="bg-amber-400" />
            </div>
          )}
        </Card>
      </div>

      {/* ── Category donut + Tồn kho chậm luân chuyển ───────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between border-b border-border bg-muted/60 px-4 py-2.5">
            <SectionTitle icon={PieChartIcon}>Phân bổ vốn theo danh mục</SectionTitle>
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
          {donutData.length === 0 ? (
            <div className="flex h-52 items-center justify-center text-xs text-muted-foreground">Không có dữ liệu</div>
          ) : (
            <div className="flex flex-col items-center gap-4 p-5 sm:flex-row sm:gap-6">
              <div className="relative shrink-0 transition-transform duration-300 hover:scale-[1.03]">
                <PieChart width={168} height={168}>
                  <Pie
                    data={donutData}
                    cx={79} cy={79}
                    innerRadius={50} outerRadius={76}
                    dataKey="value"
                    paddingAngle={2}
                    strokeWidth={0}
                    startAngle={90}
                    endAngle={-270}
                  >
                    {donutData.map((_, i) => (
                      <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                    ))}
                  </Pie>
                </PieChart>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-base font-extrabold tabular-nums leading-tight text-foreground">{fmtMoney(donutTotal)}</span>
                  <span className="text-[10px] text-muted-foreground">tổng vốn</span>
                </div>
              </div>
              <div className="grid w-full min-w-0 flex-1 grid-cols-1 gap-x-6 gap-y-1">
                {donutData.map((d, i) => {
                  const pct = donutTotal > 0 ? Math.round((d.value / donutTotal) * 100) : 0
                  return (
                    <div key={d.name} className="flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-muted/40">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: CHART_PALETTE[i % CHART_PALETTE.length] }} />
                      <span className="flex-1 truncate text-xs font-medium text-foreground" title={d.name}>{d.name}</span>
                      <span className="w-8 shrink-0 text-right text-xs font-bold tabular-nums" style={{ color: CHART_PALETTE[i % CHART_PALETTE.length] }}>{pct}%</span>
                      <span className="w-20 shrink-0 text-right text-xs font-semibold tabular-nums text-foreground">{fmtMoney(d.value)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center gap-2 border-b border-border bg-muted/60 px-4 py-2.5">
            <SectionTitle icon={History}>Tồn kho chậm luân chuyển</SectionTitle>
            {slowData.length > 0 && (
              <span
                className="ml-auto shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold"
                style={{ background: 'var(--s-cancelled-bg)', color: 'var(--s-cancelled-color)' }}
              >
                {slowData.length}
              </span>
            )}
          </div>
          {hook.slowMovingStockLoading ? (
            <div className="flex h-52 items-center justify-center text-xs text-muted-foreground">Đang tải…</div>
          ) : slowData.length === 0 ? (
            <div className="flex h-52 items-center justify-center gap-2 text-sm font-medium text-emerald-600">
              Không có SKU nào &gt; 60 ngày không phát sinh giao dịch
            </div>
          ) : (
            <div className="max-h-52 overflow-auto p-2">
              {slowData.map((r: any) => (
                <div key={r.variant_id} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-muted/30">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-foreground" title={r.variant_name}>{r.variant_name}</p>
                    <p className="font-mono text-[10.5px] text-muted-foreground">{r.item_code}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-semibold tabular-nums" style={{ color: 'var(--s-pending-color)' }}>
                      {r.days_since_movement >= 999999 ? 'Chưa từng xuất' : `${r.days_since_movement} ngày`}
                    </p>
                    <p className="text-[10.5px] tabular-nums text-muted-foreground">{fmtMoney(Number(r.value))}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── Stock flow chart ──────────────────────────────────────────────── */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/60 px-4 py-2.5">
          <SectionTitle icon={ArrowLeftRight}>Dòng chảy nhập / xuất (theo giá trị)</SectionTitle>
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
                    <stop offset="5%"  stopColor={FLOW_COLORS.receipts}   stopOpacity={0.2} />
                    <stop offset="95%" stopColor={FLOW_COLORS.receipts}   stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gD" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={FLOW_COLORS.deliveries} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={FLOW_COLORS.deliveries} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="period" tickFormatter={(v) => fmtDate(v, hook.flowGroupBy)} tick={{ fontSize: 11, fontWeight: 500 }} />
                <YAxis tickFormatter={(v) => fmtMoney(v)} tick={{ fontSize: 11, fontWeight: 500 }} width={64} />
                <Tooltip content={(p) => <ChartTooltip {...p} groupBy={hook.flowGroupBy} />} />
                <Area type="monotone" dataKey="receipts"   name="Nhập kho" stroke={FLOW_COLORS.receipts}   fill="url(#gR)" strokeWidth={2.5} dot={false} />
                <Area type="monotone" dataKey="deliveries" name="Xuất kho" stroke={FLOW_COLORS.deliveries} fill="url(#gD)" strokeWidth={2.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* ── Revenue section ───────────────────────────────────────────────── */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/60 px-4 py-2.5">
          <SectionTitle icon={Banknote}>Doanh thu (phiếu xuất hoàn thành)</SectionTitle>
          <DateRangeBar
            from={hook.revFrom} to={hook.revTo} groupBy={hook.revGroupBy}
            onFrom={hook.setRevFrom} onTo={hook.setRevTo} onGroupBy={hook.setRevGroupBy}
          />
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-1 gap-2.5 border-b border-border p-3 sm:grid-cols-3">
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
            <div key={item.label} className="rounded-lg border border-border bg-muted/30 px-4 py-3.5 transition-colors hover:bg-muted/50">
              <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
              <p className={cn('mt-1 text-2xl font-extrabold tabular-nums tracking-tight', item.color)}>
                {item.value}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{item.sub}</p>
            </div>
          ))}
        </div>

        {/* Chart + top products */}
        <div className="grid grid-cols-1 divide-y divide-border lg:grid-cols-2 lg:divide-x lg:divide-y-0">
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
                  <Bar dataKey="revenue" name="Doanh thu" fill={REVENUE_COLOR} radius={[4, 4, 0, 0]} />
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
                      <th className="w-6 px-3 py-2 text-center text-xs font-semibold text-muted-foreground">#</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Sản phẩm</th>
                      <th className="w-14 px-3 py-2 text-right text-xs font-semibold text-muted-foreground">SL</th>
                      <th className="w-28 px-3 py-2 text-right text-xs font-semibold text-muted-foreground">Doanh thu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(hook.topProducts ?? []).map((r: any, i: number) => (
                      <tr key={r.variant_id} className="transition-colors hover:bg-muted/30">
                        <td className="px-3 py-2 text-center text-xs font-bold text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-2">
                          <p className="max-w-[160px] truncate text-xs font-medium text-foreground" title={r.variant_name}>{r.variant_name}</p>
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
      </Card>
    </div>
  )
}
