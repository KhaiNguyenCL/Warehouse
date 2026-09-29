import { useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { api } from '../lib/api'
import { fmt, fmtReceipt } from '../lib/snFormat'
import { SnDetailSheet } from '../components/SnDetailSheet'
import { StatusBadge } from '@/components/ui/StatusBadge'

const PAGE_SIZE = 50

function warrantyMonthsLabel(v: number | null) {
  if (v == null) return '—'
  if (v === 0) return 'Không BH'
  return `${v} tháng`
}

// Port class kv-* từ export/app.css (kv.css) — cùng công thức đã áp cho InventoryPage.
// Trước đây trang này còn nguyên Ant Design (Table/Drawer/Form) — đổi hết sang kv-table +
// SnDetailSheet dùng chung với InventoryPage để đồng bộ UI, đồng thời thêm checkbox chọn
// dòng + bulk "Xuất Excel" giống các trang danh sách khác.
export default function InventorySerialsPage() {
  const { variantId } = useParams<{ variantId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [selectedSn, setSelectedSn] = useState<any>(null)
  const [snFilter, setSnFilter] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const itemCode = searchParams.get('code') ?? ''
  const variantName = searchParams.get('name') ?? ''

  const queryKey = ['inventory', 'serials', 'variant', variantId]
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => (await api.get('/inventory/serials', { params: { variant_id: variantId } })).data,
    enabled: !!variantId,
  })

  const allRows: any[] = data ?? []
  const filteredRows = snFilter.trim()
    ? allRows.filter((r) =>
        r.serial_no?.toLowerCase().includes(snFilter.toLowerCase()) ||
        r.mac_address?.toLowerCase().includes(snFilter.toLowerCase()),
      )
    : allRows

  const total = filteredRows.length
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const to = Math.min(page * PAGE_SIZE, total)
  const rows = filteredRows.slice(from - 1, to)

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function exportSelectedCsv() {
    const list = filteredRows.filter((r) => selected.has(r.id))
    const header = ['Serial No', 'Trạng thái', 'Kho', 'MAC', 'Phiếu nhập', 'Ngày nhập', 'BH hãng (tháng)', 'BH công ty (tháng)', 'Hết BH hãng', 'Hết BH cty']
    const lines = list.map((r) => [
      r.serial_no, r.status ?? '', r.warehouse_name ?? '', r.mac_address ?? '', r.receipt_code ?? '',
      r.completed_at ? new Date(r.completed_at).toLocaleDateString('vi-VN') : '',
      r.manufacturer_warranty_months ?? '', r.customer_warranty_months ?? '',
      fmt(r.manufacturer_warranty_end), fmt(r.customer_warranty_end),
    ].join(','))
    const csv = [header.join(','), ...lines].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `serial-${itemCode || variantId}-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="theme-2a -m-6 flex flex-col gap-4 bg-background p-6">

      {/* Header — port .kv-head.kv-head--divided/.kv-crumb/.kv-title--sm nguyên bản, đồng bộ
          với ProductDetailPage/VariantDetailPage thay vì PageHeader antd cũ. */}
      <div className="kv-head kv-head--divided">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button type="button" className="kv-btn kv-btn--ghost" onClick={() => navigate(-1)} style={{ padding: 0, width: 30, flexShrink: 0 }} aria-label="Quay lại">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="kv-crumb">
              <button onClick={() => navigate('/inventory')} style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer' }}>
                Tồn kho
              </button>
              {' / '}{itemCode}
            </div>
            <h1 className="kv-title kv-title--sm">
              Serial Numbers — {itemCode}{variantName ? ` · ${variantName}` : ''}
            </h1>
          </div>
        </div>
        <div className="kv-actions">
          <div className="kv-search" style={{ width: 240 }}>
            <Search className="h-4 w-4" />
            <input
              className="kv-input"
              type="search"
              placeholder="Tìm serial / MAC…"
              value={snFilter}
              onChange={(e) => { setSnFilter(e.target.value); setPage(1) }}
            />
          </div>
        </div>
      </div>

      <div className="kv-table-wrap">

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
        <table className="kv-table" style={{ minWidth: 1100, tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: 34 }} />
            <col style={{ width: '5%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '9%' }} />
          </colgroup>
          <thead>
            <tr>
              <th className="text-center">
                <input
                  type="checkbox"
                  checked={rows.length > 0 && rows.every((r) => selected.has(r.id))}
                  onChange={(e) => setSelected((prev) => {
                    const next = new Set(prev)
                    rows.forEach((r) => (e.target.checked ? next.add(r.id) : next.delete(r.id)))
                    return next
                  })}
                />
              </th>
              <th className="text-center">#</th>
              <th className="text-left">Serial No</th>
              <th className="text-center">Trạng thái</th>
              <th className="text-left">Kho</th>
              <th className="text-left">MAC</th>
              <th className="text-left">Phiếu nhập · Ngày</th>
              <th className="text-center">BH hãng</th>
              <th className="text-center">BH công ty</th>
              <th className="text-left">Hết BH hãng</th>
              <th className="text-left">Hết BH cty</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={11} className="kv-muted" style={{ padding: '32px 10px', textAlign: 'center' }}>Đang tải…</td></tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={11} className="kv-muted" style={{ padding: '32px 10px', textAlign: 'center' }}>
                  {snFilter ? 'Không tìm thấy serial nào khớp' : 'Không có serial nào'}
                </td>
              </tr>
            ) : rows.map((r, i) => (
              <tr key={r.id} onClick={() => setSelectedSn(r)} className="kv-row-link">
                <td className="text-center" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSelected(r.id)} />
                </td>
                <td className="text-center kv-muted">{from + i}</td>
                <td className="mono kv-cell-title">{r.serial_no}</td>
                <td className="text-center"><StatusBadge status={r.status} /></td>
                <td className="truncate" title={r.warehouse_name}>{r.warehouse_name ?? '—'}</td>
                <td className="mono kv-muted">{r.mac_address ?? '—'}</td>
                <td className="mono kv-muted">{fmtReceipt(r.receipt_code, r.completed_at)}</td>
                <td className="text-center kv-muted">{warrantyMonthsLabel(r.manufacturer_warranty_months)}</td>
                <td className="text-center kv-muted">{warrantyMonthsLabel(r.customer_warranty_months)}</td>
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
              <span>{from}–{to} / {total} serial</span>
            </div>
            {total > PAGE_SIZE && (
              <div className="kv-pages">
                <button type="button" className="kv-page" aria-label="Trang trước" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span style={{ minWidth: 48, textAlign: 'center' }}>{page} / {Math.max(1, Math.ceil(total / PAGE_SIZE))}</span>
                <button type="button" className="kv-page" aria-label="Trang sau" disabled={to >= total} onClick={() => setPage(page + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <SnDetailSheet sn={selectedSn} onClose={() => setSelectedSn(null)} listQueryKey={queryKey} />
    </div>
  )
}
