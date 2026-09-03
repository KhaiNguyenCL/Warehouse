import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import dayjs from 'dayjs'
import { ChevronRight } from 'lucide-react'
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

// 1 bảng màu duy nhất cho mọi chart trong trang — donut (7 hạng mục) dùng từ đầu mảng,
// area/bar chart dùng 3 màu đầu đặt tên riêng để dễ đọc code hơn là index số.
const CHART_PALETTE = ['#2563eb', '#059669', '#d97706', '#7c3aed', '#dc2626', '#0891b2', '#ea580c']
const FLOW_COLORS = { receipts: CHART_PALETTE[0], deliveries: CHART_PALETTE[1] }
const REVENUE_COLOR = CHART_PALETTE[3]

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold text-muted-foreground">
      {children}
    </h2>
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

  const pipeline = hook.pipeline
  const invSum   = hook.invSummary
  const catData:  any[] = hook.invByCategory ?? []
  const flowData: any[] = (hook.stockFlow ?? []).map((d: any) => ({ ...d, period: String(d.period) }))
  const revData:  any[] = (hook.revSeries  ?? []).map((d: any) => ({ ...d, period: String(d.period) }))

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

      {/* ── Pipeline + Inventory ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">

        {/* Pipeline — 3/5 */}
        <div className="lg:col-span-3 overflow-hidden rounded-xl border border-border-md bg-background shadow-sm">
          <div className="flex items-center justify-between border-b border-border bg-muted/60 px-4 py-2.5">
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
        <div className="lg:col-span-2 overflow-hidden rounded-xl border border-border-md bg-background shadow-sm">
          <div className="flex items-center justify-between border-b border-border bg-muted/60 px-4 py-2.5">
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

      {/* ── Category donut ────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-border-md bg-background shadow-sm">
        <div className="border-b border-border bg-muted/60 px-4 py-2.5">
          <SectionTitle>Phân bổ vốn theo danh mục</SectionTitle>
        </div>
        {donutData.length === 0 ? (
          <div className="flex h-52 items-center justify-center text-xs text-muted-foreground">Không có dữ liệu</div>
        ) : (
          <div className="flex items-center gap-6 p-5">
            <div className="relative shrink-0">
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
            <div className="grid min-w-0 flex-1 grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
              {donutData.map((d, i) => {
                const pct = donutTotal > 0 ? Math.round((d.value / donutTotal) * 100) : 0
                return (
                  <div key={d.name} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: CHART_PALETTE[i % CHART_PALETTE.length] }} />
                    <span className="flex-1 truncate text-xs font-medium text-foreground">{d.name}</span>
                    <span className="w-8 shrink-0 text-right text-xs font-bold tabular-nums" style={{ color: CHART_PALETTE[i % CHART_PALETTE.length] }}>{pct}%</span>
                    <span className="w-20 shrink-0 text-right text-xs font-semibold tabular-nums text-foreground">{fmtMoney(d.value)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Stock flow chart ──────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-border-md bg-background shadow-sm">
        <div className="flex items-center justify-between border-b border-border bg-muted/60 px-4 py-2.5">
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
      </div>

      {/* ── Revenue section ───────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-border-md bg-background shadow-sm">
        <div className="flex items-center justify-between border-b border-border bg-muted/60 px-4 py-2.5">
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
