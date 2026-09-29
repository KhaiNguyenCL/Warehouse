import { useState } from 'react'
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Search, ChevronLeft, ChevronRight, ScanLine, PackageCheck, PackageOpen, Plus, Download } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { renderToStaticMarkup } from 'react-dom/server'
import { api } from '../lib/api'
import { useInventory } from '../hooks/useInventory'
import { fmt, fmtReceipt } from '../lib/snFormat'
import { SnDetailSheet } from '../components/SnDetailSheet'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { usePageHeader } from '@/layout/PageHeaderSlot'

function fmtVnd(n: number) {
  return Number(n).toLocaleString('vi-VN')
}

const NEAR_EXPIRY_DAYS = 60

// Trạng thái tồn suy ra từ qty_on_hand/reorder_point/nearest_lot — không có bảng trạng thái
// riêng, tính ngay ở client. Ưu tiên: Hết hàng > Sắp hết (tồn thấp) > Cận hạn (lô sắp hết
// hạn) > Đủ tồn — khớp đúng thứ tự quan sát được trong mockup (1 dòng chỉ hiện 1 pill).
// v2 (export/inventory.html + HANDOFF.md mục 9, 23/9): "trạng thái tồn" là ngữ cảnh RIÊNG của
// Inventory (mức tồn kho, không phải trạng thái quy trình draft/confirmed/... ở các trang
// khác) — mockup chỉ dùng ĐÚNG 1 accent phụ (magenta --color-accent-2) cho mọi mức cảnh báo,
// không dùng bảng 3 màu đèn giao thông (--s-*) của StatusBadge. "Đủ tồn" KHÔNG tô nền, chỉ là
// chữ xám thường — chỉ 3 trạng thái còn lại mới thật sự "có màu" để mắt bắt được ngay dòng nào
// cần chú ý, tránh nhuộm màu cả cột khi phần lớn SKU đều ổn. Dùng thẳng class .kv-tag--* thật
// từ kv.css (port nguyên từ app.css) thay vì tự phối màu qua style — pixel-for-pixel mockup.
function stockStatus(row: {
  qty_on_hand: number; qty_available: number; reorder_point: number | null
  nearest_lot?: { receipt_code: string; expires_at: string } | null
}) {
  if (row.qty_on_hand <= 0) {
    return { key: 'out' as const, label: 'Hết hàng', alert: true, tagClass: 'kv-tag kv-tag--out' }
  }
  if (row.reorder_point && row.qty_available <= row.reorder_point) {
    return { key: 'low' as const, label: 'Sắp hết', alert: true, tagClass: 'kv-tag kv-tag--low' }
  }
  if (row.nearest_lot) {
    const daysLeft = (new Date(row.nearest_lot.expires_at).getTime() - Date.now()) / 86_400_000
    if (daysLeft <= NEAR_EXPIRY_DAYS) {
      return { key: 'near_expiry' as const, label: 'Cận hạn', alert: false, tagClass: 'kv-tag kv-tag--exp' }
    }
  }
  return { key: 'ok' as const, label: 'Đủ tồn', alert: false, tagClass: 'kv-tag kv-tag--ok' }
}

function ReservedSheet({
  open, variantId, variantName, unit, onClose,
}: { open: boolean; variantId: string | null; variantName: string; unit: string | null; onClose: () => void }) {
  const navigate = useNavigate()
  const { data, isFetching } = useQuery({
    queryKey: ['inventory', 'reserved', variantId],
    queryFn: async () => (await api.get('/inventory/reserved', { params: { variant_id: variantId } })).data as any[],
    enabled: !!variantId,
    staleTime: 30_000,
  })

  const SOURCE_PATH: Record<string, string> = { quotation: '/quotations', delivery_order: '/deliveries' }
  const SOURCE_LABEL: Record<string, string> = { quotation: 'Báo giá', delivery_order: 'Phiếu xuất' }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-[480px]">
        <div className="flex h-full flex-col gap-4 px-1 pt-6">
          <h2 className="text-sm font-semibold text-foreground">Đang giữ chỗ</h2>
          <div className="text-sm text-muted-foreground">{variantName}</div>
          {isFetching ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Đang tải…</div>
          ) : !data?.length ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Không có dữ liệu giữ chỗ</div>
          ) : (
            <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
              {data.map((r: any) => (
                <button
                  key={r.source_id}
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                  onClick={() => { navigate(`${SOURCE_PATH[r.source_type]}/${r.source_id}`); onClose() }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-sm font-medium text-muted-foreground">
                      {SOURCE_LABEL[r.source_type]}
                    </span>
                    <span className="font-mono text-sm font-medium text-foreground">{r.doc_code}</span>
                    {r.customer_name && (
                      <span className="truncate text-sm text-muted-foreground" title={r.customer_name}>{r.customer_name}</span>
                    )}
                  </div>
                  <span className="ml-3 shrink-0 text-sm font-semibold tabular-nums text-foreground">
                    {r.qty}{unit ? ` ${unit}` : ''}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// Tab "Hàng đã bán" — danh sách từng Serial Number đã xuất bán (serial_numbers.status =
// 'sold'), kèm phiếu xuất/khách hàng để tra cứu hậu mãi. Chỉ storable mới có SN nên tab
// này chỉ liệt kê storable đã bán — consumable xuất bán chỉ trừ qty, không có record theo
// từng cái. Không lọc cứng export_type='sale' ở backend (internal/demo_out/warranty_out
// cũng set status='sold') nên UI hiện cột "Loại xuất" để tự phân biệt.
const EXPORT_TYPE_FALLBACK_LABEL: Record<string, string> = {
  sale: 'Bán hàng', internal: 'Xuất nội bộ', demo_out: 'Cho mượn demo',
  warranty_out: 'Gửi bảo hành', return_out: 'Trả về NCC', dispose: 'Huỷ hàng', adjustment: 'Điều chỉnh',
}

function SoldSerialsTable({ search }: { search: string }) {
  const [page, setPage] = useState(1)
  const limit = 20
  const { data: exportTypes } = useQuery({
    queryKey: ['export-types'],
    queryFn: async () => (await api.get('/settings/export-types')).data,
  })
  const queryKey = ['inventory', 'sold-serials', search, page]
  const { data, isFetching } = useQuery({
    queryKey,
    queryFn: async () => (await api.get('/inventory/sold-serials', { params: { search: search || undefined, page, limit } })).data,
    placeholderData: keepPreviousData,
  })
  const [selected, setSelected] = useState<any>(null)
  const rows: any[] = data?.data ?? []
  const total: number = data?.total ?? 0
  const from = total === 0 ? 0 : (page - 1) * limit + 1
  const to = Math.min(page * limit, total)

  function exportTypeLabel(key: string | null) {
    if (!key) return '—'
    return exportTypes?.find((t: any) => t.key === key)?.label ?? EXPORT_TYPE_FALLBACK_LABEL[key] ?? key
  }

  return (
    <>
      <div className="overflow-x-auto">
      <table className="kv-table" style={{ minWidth: 1000, tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '13%' }} />
          <col style={{ width: '11%' }} />
          <col />
          <col style={{ width: '11%' }} />
          <col style={{ width: '13%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '10%' }} />
          <col style={{ width: '10%' }} />
        </colgroup>
        <thead>
          <tr>
            {['Serial No', 'Mã hàng', 'Tên SP', 'Loại xuất', 'Khách hàng', 'Phiếu xuất · Ngày bán', 'Hết BH hãng', 'Hết BH cty'].map((h) => (
              <th key={h} className="text-left">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isFetching && rows.length === 0 ? (
            <tr><td colSpan={8} className="kv-muted" style={{ padding: '32px 10px', textAlign: 'center' }}>Đang tải…</td></tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={8} className="kv-muted" style={{ padding: '32px 10px', textAlign: 'center' }}>
                {search ? 'Không tìm thấy hàng đã bán nào khớp' : 'Chưa có hàng nào được bán'}
              </td>
            </tr>
          ) : rows.map((r) => (
            <tr key={r.id} onClick={() => setSelected(r)} className="kv-row-link">
              <td className="mono kv-cell-title">{r.serial_no}</td>
              <td className="mono truncate" title={r.item_code ?? ''}>{r.item_code}</td>
              <td className="kv-muted truncate" title={r.variant_name}>{r.variant_name}</td>
              <td>{exportTypeLabel(r.export_type)}</td>
              <td className="truncate" title={r.company_name ?? ''}>{r.company_name ?? <span className="kv-muted">—</span>}</td>
              <td className="mono kv-muted">{fmtReceipt(r.delivery_code, r.sold_at)}</td>
              <td className="kv-muted">{fmt(r.manufacturer_warranty_end)}</td>
              <td className="kv-muted">{fmt(r.customer_warranty_end)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      {total > 0 && (
        <div className="kv-pager">
          <div className="kv-actions">
            <span>{from}–{to} / {total} SN đã bán</span>
          </div>
          <div className="kv-pages">
            <button type="button" className="kv-page" aria-label="Trang trước" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span style={{ minWidth: 48, textAlign: 'center' }}>{page} / {Math.max(1, Math.ceil(total / limit))}</span>
            <button type="button" className="kv-page" aria-label="Trang sau" disabled={to >= total} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <SnDetailSheet sn={selected} onClose={() => setSelected(null)} listQueryKey={queryKey} />
    </>
  )
}

export default function InventoryPage() {
  const hook = useInventory()
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useState<'sku' | 'sold'>('sku')
  const [reservedSheet, setReservedSheet] = useState<{ variantId: string; variantName: string; unit: string | null } | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState<'all' | 'ok' | 'low' | 'out' | 'near_expiry'>('all')

  function handleViewModeChange(mode: 'sku' | 'sold') {
    setViewMode(mode)
    hook.setSearchInput('')
    hook.setSnSearchInput('')
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function exportCsv(list: any[]) {
    const header = ['Mã SKU', 'Tên hàng', 'Danh mục', 'Tồn kho', 'Tối thiểu', 'Giá nhập', 'Giá trị tồn']
    const lines = list.map((r) => [
      r.item_code, r.variant_name, r.category_name ?? '', r.qty_on_hand, r.reorder_point ?? 0,
      r.avg_cost ?? '', r.avg_cost != null ? Number(r.avg_cost) * r.qty_on_hand : '',
    ].join(','))
    const csv = [header.join(','), ...lines].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ton-kho-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // "Xuất Excel" ở hàng filter (khác nút cùng tên trong bulk-bar) — xuất trang đang xem,
  // không phải toàn bộ 1.284 mã hàng (sẽ cần 1 endpoint export riêng ở server, ngoài phạm
  // vi bản demo layout này).
  function exportPageCsv() {
    exportCsv(rows)
  }

  // In tem hàng loạt cho các dòng đã chọn — QR code (không có lib barcode 1D trong repo,
  // giống VariantDetailPage::printLabel, xem ghi chú ở đó).
  function printSelectedLabels() {
    const chosen = rows.filter((r) => selected.has(r.variant_id))
    if (chosen.length === 0) return
    const cards = chosen.map((r) => {
      const qr = renderToStaticMarkup(<QRCodeSVG value={r.item_code} size={120} />)
      return `<div style="page-break-inside:avoid;text-align:center;padding:12px;border:1px solid #ddd;border-radius:8px">
        ${qr}<h3 style="margin:8px 0 0;font-size:13px">${r.item_code}</h3>
        <p style="margin:2px 0;color:#555;font-size:11px">${r.variant_name}</p>
      </div>`
    }).join('')
    const win = window.open('', '_blank', 'width=500,height=600')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head><title>In tem</title></head>
      <body style="font-family:sans-serif">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">${cards}</div>
        <script>window.onload = () => window.print()</script>
      </body></html>`)
    win.document.close()
  }

  const allRows: any[] = hook.data?.data ?? []
  // Lọc trạng thái CHỈ áp trên trang hiện tại (client-side) — trạng thái tính từ
  // reorder_point ngay ở component này, không phải cột lọc được server hỗ trợ, nên
  // "tổng SKU" bên dưới vẫn theo total của server, không khớp số dòng đang hiện khi lọc.
  const rows: any[] = statusFilter === 'all' ? allRows : allRows.filter((r) => stockStatus(r).key === statusFilter)
  const total: number = hook.data?.total ?? 0
  const from = total === 0 ? 0 : (hook.page - 1) * hook.limit + 1
  const to = Math.min(hook.page * hook.limit, total)
  const warehouses: any[] = hook.warehouses ?? []
  const categories: any[] = hook.categories ?? []
  const brands: any[] = hook.brands ?? []

  // Trang này KHÔNG dùng usePageHeader (thanh topbar chung của app, cỡ chữ nhỏ gọn theo
  // chuẩn mật độ cao toàn app) — mockup có 1 tiêu đề lớn nằm ngay trong nội dung trang,
  // cuộn cùng trang chứ không dính topbar. Tự vẽ header to/thoáng riêng bên dưới thay vì
  // gọi usePageHeader, theo đúng yêu cầu "chỉ riêng trang này theo mockup".

  return (
    <div className="theme-2a -m-6 flex flex-col gap-4 bg-background p-6">

      {/* Header — port nguyên .kv-head/.kv-title/.kv-btn từ export/inventory.html (kv.css)
          thay vì Button shadcn, để khớp pixel-for-pixel thay vì "giống giống". */}
      <div className="kv-head">
        <div>
          <h1 className="kv-title">Tồn kho</h1>
          <p className="kv-sub">
            {total.toLocaleString('vi-VN')} mã hàng · cập nhật {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} hôm nay
          </p>
        </div>
        <div className="kv-actions">
          <button type="button" className="kv-btn" onClick={() => handleViewModeChange('sold')}>
            <ScanLine className="h-[17px] w-[17px]" /> Quét mã
          </button>
          <button type="button" className="kv-btn" onClick={() => navigate('/receipts/new')}>
            <PackageCheck className="h-[17px] w-[17px]" /> Nhập kho
          </button>
          <button type="button" className="kv-btn" onClick={() => navigate('/deliveries/new')}>
            <PackageOpen className="h-[17px] w-[17px]" /> Xuất kho
          </button>
          <button type="button" className="kv-btn kv-btn--primary" onClick={() => navigate('/products')}>
            <Plus className="h-[17px] w-[17px]" /> Thêm mã hàng
          </button>
        </div>
      </div>

      <ReservedSheet
        open={!!reservedSheet}
        variantId={reservedSheet?.variantId ?? null}
        variantName={reservedSheet?.variantName ?? ''}
        unit={reservedSheet?.unit ?? null}
        onClose={() => setReservedSheet(null)}
      />

      {/* Bọc khối tab/toolbar/bảng bằng border + nền --bg-card riêng (khác --bg-page trắng của
          trang) — trước đây --bg-card = --bg-page nên bảng "chìm" vào nền trang, không phân
          biệt được ranh giới; giờ 2 token đã tách nhau (xem tokens.css), card cần border kẻ
          rõ để thấy được bảng đang nằm trong 1 khối riêng. */}
      <div className="kv-table-wrap">

        {/* Tab nav — port .kv-tabs/.kv-tab nguyên bản, thay cho border-b tự vẽ trước đây */}
        <div className="kv-tabs">
          {[
            { key: 'sku',  label: 'Theo SKU' },
            { key: 'sold', label: 'Hàng đã bán' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              className="kv-tab"
              aria-current={viewMode === tab.key ? 'page' : undefined}
              onClick={() => handleViewModeChange(tab.key as 'sku' | 'sold')}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {viewMode === 'sku' ? (
          <>
            {/* Toolbar — port .kv-toolbar/.kv-search/.kv-select nguyên bản (select thường,
                không phải Radix Select, đúng markup mockup) */}
            <div className="kv-toolbar">
              <div className="kv-search">
                <Search className="h-4 w-4" />
                <input
                  className="kv-input"
                  type="search"
                  placeholder="Tìm mã SKU, tên hàng…"
                  value={hook.searchInput}
                  onChange={(e) => hook.setSearchInput(e.target.value)}
                />
              </div>

              <select
                className="kv-select kv-select--auto"
                aria-label="Kho"
                value={hook.warehouseId ?? '__all__'}
                onChange={(e) => hook.setWarehouseId(e.target.value === '__all__' ? undefined : e.target.value)}
              >
                <option value="__all__">Tất cả kho</option>
                {warehouses.map((w: any) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>

              <select
                className="kv-select kv-select--auto"
                aria-label="Loại"
                value={hook.productType ?? '__all__'}
                onChange={(e) => hook.setProductType(e.target.value === '__all__' ? undefined : e.target.value)}
              >
                <option value="__all__">Tất cả loại</option>
                <option value="storable">Thiết bị</option>
                <option value="consumable">Vật tư</option>
              </select>

              {categories.length > 0 && (
                <select
                  className="kv-select kv-select--auto"
                  aria-label="Danh mục"
                  value={hook.categoryId ?? '__all__'}
                  onChange={(e) => hook.setCategoryId(e.target.value === '__all__' ? undefined : e.target.value)}
                >
                  <option value="__all__">Tất cả danh mục</option>
                  {categories.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}

              {brands.length > 0 && (
                <select
                  className="kv-select kv-select--auto"
                  aria-label="Hãng"
                  value={hook.brandId ?? '__all__'}
                  onChange={(e) => hook.setBrandId(e.target.value === '__all__' ? undefined : e.target.value)}
                >
                  <option value="__all__">Tất cả hãng</option>
                  {brands.map((b: any) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              )}

              {/* Lọc trạng thái — client-side trên trang hiện tại, xem ghi chú ở khai báo rows */}
              <select
                className="kv-select kv-select--auto"
                aria-label="Trạng thái"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              >
                <option value="all">Trạng thái: tất cả</option>
                <option value="ok">Đủ tồn</option>
                <option value="low">Sắp hết</option>
                <option value="out">Hết hàng</option>
                <option value="near_expiry">Cận hạn</option>
              </select>

              <div className="kv-spacer" />

              <span className="kv-muted" style={{ fontSize: 14 }}>
                {rows.length !== allRows.length ? `${rows.length}/` : ''}{total.toLocaleString('vi-VN')} SKU
              </span>

              <button type="button" className="kv-btn kv-btn--ghost" onClick={exportPageCsv}>
                <Download className="h-[17px] w-[17px]" /> Xuất Excel
              </button>
            </div>

            {/* Thanh hành động hàng loạt — thay thế chỗ toolbar khi có dòng được chọn,
                giống pattern PageActions.selection (CompaniesPage...) nhưng đặt trong bảng
                như mockup thay vì đẩy lên topbar. */}
            {selected.size > 0 && (
              <div className="kv-bulk">
                <span className="kv-strong">Đã chọn {selected.size} dòng</span>
                <span className="kv-bulk-sep" />
                <button type="button" onClick={() => navigate('/receipts/new')}>Nhập kho nhanh</button>
                <button type="button" onClick={() => navigate('/deliveries/new')}>Xuất kho nhanh</button>
                <button type="button" onClick={printSelectedLabels}>In tem</button>
                <button
                  type="button"
                  style={{ color: 'var(--text-3)', cursor: 'not-allowed' }}
                  disabled
                  title="Hệ thống chưa có trường vị trí (kệ/tầng) theo SKU nên chưa hỗ trợ thao tác này"
                >
                  Đổi vị trí
                </button>
                <div className="kv-spacer" />
                <button type="button" style={{ color: 'var(--text-2)' }} onClick={() => setSelected(new Set())}>Bỏ chọn</button>
              </div>
            )}

            {/* Main inventory table — port .kv-table nguyên bản, click dòng storable để xem
                danh sách SN. Giữ overflow-x-auto (mockup fix cứng 1440px, app thì responsive
                theo layout thật của AppLayout nên vẫn cần cuộn ngang khi màn hẹp). */}
            <div className="overflow-x-auto">
            <table className="kv-table" style={{ tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ width: 34 }} className="text-center">
                    <input
                      type="checkbox"
                      checked={rows.length > 0 && selected.size === rows.length}
                      onChange={(e) => setSelected(e.target.checked ? new Set(rows.map((r) => r.variant_id)) : new Set())}
                    />
                  </th>
                  {([
                    ['Mã SKU', 'left', 200],
                    ['Tên hàng', 'left'],
                    ['Danh mục', 'left', 170],
                    ['Tồn / tối thiểu', 'center', 130],
                    ['Giá nhập', 'right', 110],
                    ['Giá trị tồn', 'right', 130],
                    ['Lô / hạn dùng', 'left', 150],
                    ['Trạng thái', 'center', 100],
                    ['', 'center', 36],
                  ] as [string, string, number?][]).map(([label, align, width], i) => (
                    <th
                      key={i}
                      style={width ? { width } : undefined}
                      className={align === 'left' ? 'text-left' : align === 'right' ? 'num' : 'text-center'}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hook.isFetching && rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="kv-muted" style={{ padding: '32px 10px', textAlign: 'center' }}>Đang tải…</td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="kv-muted" style={{ padding: '32px 10px', textAlign: 'center' }}>
                      {hook.searchInput ? 'Không tìm thấy kết quả.' : 'Chưa có tồn kho nào.'}
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const status = stockStatus(row)
                    const stockValue = row.avg_cost != null ? Number(row.avg_cost) * row.qty_on_hand : null
                    return (
                    <tr
                      key={row.variant_id}
                      className={cn('kv-row-link', status.alert && 'kv-row--alert')}
                      onClick={() => {
                        if (row.product_type === 'storable') {
                          navigate(`/inventory/serials/${row.variant_id}?code=${encodeURIComponent(row.item_code ?? '')}&name=${encodeURIComponent(row.variant_name ?? '')}`)
                        }
                      }}
                    >
                      <td className="text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected.has(row.variant_id)}
                          onChange={() => toggleSelected(row.variant_id)}
                        />
                      </td>
                      <td className="mono truncate" title={row.item_code ?? ''}>{row.item_code}</td>
                      <td title={row.variant_name}>
                        <div className="kv-cell-title">{row.variant_name}</div>
                        {/* Subtext gộp kho + đơn vị thay cho 2 cột riêng — dữ liệu thật (không
                            có field "kệ" trong schema nên không bịa như mockup, dùng tên kho
                            + đơn vị tính thật của SKU). */}
                        <div className="kv-cell-sub">
                          {(row.warehouse_breakdown ?? []).map((w: any) => w.name).join(', ') || '—'}
                          {row.unit ? ` · ${row.unit}` : ''}
                        </div>
                      </td>
                      <td>{row.category_name ?? '—'}</td>
                      <td className="num">
                        <span className="kv-strong">{row.qty_on_hand}</span>
                        <span className="kv-muted"> / {row.reorder_point != null ? row.reorder_point : '—'}</span>
                      </td>
                      <td className="num">
                        {row.avg_cost != null ? fmtVnd(row.avg_cost) : <span className="kv-muted">—</span>}
                      </td>
                      <td className="num kv-strong">
                        {stockValue != null ? fmtVnd(stockValue) : <span className="kv-muted">—</span>}
                      </td>
                      <td>
                        {row.nearest_lot ? (
                          <>
                            <div className="mono">{row.nearest_lot.receipt_code}</div>
                            <div className="kv-cell-sub mono">HSD {fmt(row.nearest_lot.expires_at)}</div>
                          </>
                        ) : (
                          <span className="kv-muted">Không theo lô</span>
                        )}
                      </td>
                      <td>
                        <span className={status.tagClass}>{status.label}</span>
                      </td>
                      <td className="num kv-caret">
                        {row.product_type === 'storable' && <ChevronRight className="inline h-4 w-4" aria-label="Xem Serial No" />}
                      </td>
                    </tr>
                  )})
                )}
              </tbody>
            </table>
            </div>

            {/* Pagination — port .kv-pager/.kv-pages/.kv-page nguyên bản */}
            {total > 0 && (
              <div className="kv-pager">
                <span>Hiển thị {from}–{to} trong {total.toLocaleString('vi-VN')} mã hàng</span>
                <div className="kv-actions">
                  <select
                    className="kv-select kv-select--auto"
                    aria-label="Số dòng mỗi trang"
                    style={{ height: 32, fontSize: 13 }}
                    value={String(hook.limit)}
                    onChange={(e) => hook.setLimit(Number(e.target.value))}
                  >
                    {[10, 20, 50, 100].map((n) => (
                      <option key={n} value={n}>{n} dòng / trang</option>
                    ))}
                  </select>
                  <div className="kv-pages">
                    <button
                      type="button"
                      className="kv-page"
                      aria-label="Trang trước"
                      disabled={hook.page <= 1}
                      onClick={() => hook.setPage(hook.page - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    {(() => {
                      const totalPages = Math.max(1, Math.ceil(total / hook.limit))
                      // Tối đa 5 số trang xoay quanh trang hiện tại — tránh dải số dài vô hạn
                      // khi 1.284 mã hàng / 50 dòng = 26 trang, mockup chỉ minh hoạ vài trang đầu.
                      const start = Math.max(1, Math.min(hook.page - 2, totalPages - 4))
                      const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i)
                      return pages.map((p) => (
                        <button
                          key={p}
                          type="button"
                          className="kv-page"
                          aria-current={p === hook.page ? 'page' : undefined}
                          onClick={() => hook.setPage(p)}
                        >
                          {p}
                        </button>
                      ))
                    })()}
                    <button
                      type="button"
                      className="kv-page"
                      aria-label="Trang sau"
                      disabled={to >= total}
                      onClick={() => hook.setPage(hook.page + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Toolbar — tìm theo Serial No/mã hàng/tên SP/khách hàng/mã phiếu xuất, các filter
                kho/loại/danh mục/hãng không áp dụng cho danh sách hàng đã bán */}
            <div className="kv-toolbar">
              <div className="kv-search" style={{ width: 288 }}>
                <Search className="h-4 w-4" />
                <input
                  className="kv-input"
                  type="search"
                  placeholder="Tìm serial, mã hàng, khách hàng, mã phiếu…"
                  value={hook.snSearchInput}
                  onChange={(e) => hook.setSnSearchInput(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <SoldSerialsTable search={hook.snSearch} />
          </>
        )}
      </div>
    </div>
  )
}
