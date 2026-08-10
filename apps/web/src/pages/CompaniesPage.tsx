import { useState } from 'react'
import { Table, Input as AntInput, AutoComplete, Modal, Space, Tag, Checkbox, Spin, Tooltip } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { RefreshCw, Plus, Phone, Mail, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { useCompanies } from '../hooks/useCompanies'
import { useDebounce } from '../hooks/useDebounce'
import { api } from '../lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import CompanySheet, { type SheetMode } from '../components/CompanySheet'

function TypeBadge({ types }: { types: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {types?.map((t) => (
        <span key={t} className={cn(
          'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
          t === 'customer'
            ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
            : 'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
        )}>
          {t === 'customer' ? 'Khách hàng' : 'NCC'}
        </span>
      ))}
    </div>
  )
}

export default function CompaniesPage() {
  const hook = useCompanies()
  const total = hook.data?.total ?? 0

  const [sheetMode, setSheetMode] = useState<SheetMode>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  function openView(id: string)   { setSelectedId(id);   setSheetMode('view') }
  function openCreate()           { setSelectedId(null);  setSheetMode('create') }
  function closeSheet()           { setSheetMode(null) }

  const [inputValue, setInputValue] = useState('')
  const debouncedInput = useDebounce(inputValue, 200)

  const { data: suggestData } = useQuery({
    queryKey: ['companies-suggest', debouncedInput],
    queryFn: async () =>
      (await api.get('/companies', { params: { search: debouncedInput.trim(), limit: 8 } })).data,
    enabled: debouncedInput.trim().length >= 1,
    staleTime: 10_000,
  })

  const suggestOptions = (suggestData?.data ?? []).map((c: any) => ({
    value: c.name,
    companyId: c.id,
    label: (
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium truncate">{c.name}</span>
        <span className="text-xs text-muted-foreground font-mono flex-shrink-0">{c.code}</span>
      </div>
    ),
  }))

  const rows: any[] = hook.data?.data ?? []
  const pageSize = 20
  const from = total === 0 ? 0 : (hook.page - 1) * pageSize + 1
  const to = Math.min(hook.page * pageSize, total)

  return (
    <div className="flex flex-col gap-6">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Đối tác</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{total.toLocaleString('vi-VN')} công ty</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={hook.openSync}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Đồng bộ Bitrix
          </Button>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Tạo mới
          </Button>
        </div>
      </div>

      {/* Table card */}
      <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">

        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            {/* AutoComplete search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
              <AutoComplete
                options={suggestOptions}
                value={inputValue}
                onChange={(v) => { setInputValue(v); hook.setSearch(v) }}
                onSelect={(_: string, option: any) => { setInputValue(''); openView(option.companyId) }}
                onClear={() => { setInputValue(''); hook.setSearch('') }}
                filterOption={false}
                style={{ width: 320 }}
                allowClear
              >
                <AntInput
                  placeholder="Tìm tên, mã, MST…"
                  style={{ height: 36, paddingLeft: 36, fontSize: 14 }}
                />
              </AutoComplete>
            </div>

            {/* Type filters */}
            {(['all', 'customer', 'supplier'] as const).map((t) => (
              <button
                key={t}
                onClick={() => hook.setTypeFilter(t)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  hook.typeFilter === t
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {t === 'all' ? 'Tất cả' : t === 'customer' ? 'Khách hàng' : 'NCC'}
              </button>
            ))}
          </div>
          <span className="text-sm text-muted-foreground">{total.toLocaleString('vi-VN')} kết quả</span>
        </div>

        {/* Table */}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="w-12 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">#</th>
              <th className="w-36 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mã</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tên công ty</th>
              <th className="w-32 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Loại</th>
              <th className="w-44 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Liên hệ</th>
              <th className="w-32 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">MST</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {hook.isFetching && rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">Đang tải…</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  {hook.search ? 'Không tìm thấy kết quả.' : 'Chưa có đối tác nào.'}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr
                  key={row.id}
                  onClick={() => openView(row.id)}
                  className="cursor-pointer transition-colors hover:bg-muted/40"
                >
                  <td className="px-4 py-3 text-center text-xs text-muted-foreground">{from + i}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="inline-flex items-center rounded-md border border-border bg-muted/60 px-2 py-0.5 font-mono text-xs font-medium text-foreground">
                      {row.code}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground leading-snug">{row.name}</div>
                    {row.address && (
                      <div className="mt-0.5 text-xs text-muted-foreground leading-snug line-clamp-1">{row.address}</div>
                    )}
                  </td>
                  <td className="px-4 py-3"><TypeBadge types={row.types ?? []} /></td>
                  <td className="px-4 py-3">
                    {row.phone || row.email ? (
                      <div className="flex flex-col gap-0.5 min-w-0">
                        {row.phone && (
                          <span className="flex items-center gap-1.5 text-xs text-foreground min-w-0">
                            <Phone className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                            <span className="truncate">{row.phone}</span>
                          </span>
                        )}
                        {row.email && (
                          <span className="flex items-center gap-1.5 text-xs text-foreground min-w-0">
                            <Mail className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                            <span className="truncate">{row.email}</span>
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-foreground">
                    {row.tax_code || '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {total > 0 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
            <span className="text-xs text-muted-foreground">{from}–{to} / {total} công ty</span>
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

      {/* Company sidebar — view & create */}
      <CompanySheet
        mode={sheetMode}
        companyId={selectedId}
        customFieldDefs={hook.customFieldDefs}
        onClose={closeSheet}
        onCreated={() => hook.setPage(1)}
      />

      {/* Bitrix sync modal — AntD */}
      <SyncBitrixModal hook={hook} />
    </div>
  )
}


const FIELD_LABEL: Record<string, string> = {
  name: 'Tên', phone: 'SĐT', email: 'Email',
  tax_code: 'MST', address: 'Địa chỉ',
  bank_account: 'Tài khoản', bank_name: 'Ngân hàng',
}

function SyncBitrixModal({ hook }: { hook: any }) {
  const preview = hook.syncPreview
  const newList: any[]     = preview?.new_companies     ?? []
  const changedList: any[] = preview?.changed_companies ?? []

  function toggleId(id: string) {
    hook.setSelectedBxIds((prev: string[]) =>
      prev.includes(id) ? prev.filter((x: string) => x !== id) : [...prev, id]
    )
  }

  function toggleAll(ids: string[], checked: boolean) {
    hook.setSelectedBxIds((prev: string[]) =>
      checked ? [...new Set([...prev, ...ids])] : prev.filter((x: string) => !ids.includes(x))
    )
  }

  const newIds     = newList.map((c: any) => c.bitrix_id)
  const changedIds = changedList.map((c: any) => c.bitrix_id)
  const allNewSel     = newIds.length > 0     && newIds.every((id: string) => hook.selectedBxIds.includes(id))
  const allChangedSel = changedIds.length > 0 && changedIds.every((id: string) => hook.selectedBxIds.includes(id))

  return (
    <Modal
      title="Đồng bộ công ty từ Bitrix"
      open={hook.syncOpen}
      onCancel={() => hook.setSyncOpen(false)}
      width={820}
      okText={`Áp dụng (${hook.selectedBxIds.length})`}
      okButtonProps={{
        disabled: hook.selectedBxIds.length === 0 || hook.previewLoading,
        loading: hook.syncMutation.isPending,
      }}
      onOk={() => hook.syncMutation.mutate()}
      cancelText="Đóng"
    >
      {hook.previewLoading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin tip="Đang tải dữ liệu từ Bitrix…" />
        </div>
      ) : preview ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 20, fontSize: 13, color: 'var(--text-2)' }}>
            <span>Tổng Bitrix: <strong style={{ color: 'var(--text-1)' }}>{preview.total_bitrix}</strong></span>
            <span>Mới: <strong style={{ color: '#15803d' }}>{newList.length}</strong></span>
            <span>Có thay đổi: <strong style={{ color: '#d97706' }}>{changedList.length}</strong></span>
            <span>Không đổi: <strong>{preview.unchanged_count}</strong></span>
            {preview.locked_count > 0 && (
              <span>Đã khoá: <strong style={{ color: '#d97706' }}>{preview.locked_count}</strong></span>
            )}
          </div>

          {newList.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Checkbox
                  checked={allNewSel}
                  indeterminate={!allNewSel && newIds.some((id: string) => hook.selectedBxIds.includes(id))}
                  onChange={(e) => toggleAll(newIds, e.target.checked)}
                />
                <span style={{ fontWeight: 600, fontSize: 13 }}>Công ty mới ({newList.length})</span>
              </div>
              <Table size="small" pagination={false} rowKey="bitrix_id" dataSource={newList}
                columns={[
                  { width: 36, render: (_: any, r: any) => <Checkbox checked={hook.selectedBxIds.includes(r.bitrix_id)} onChange={() => toggleId(r.bitrix_id)} /> },
                  { title: 'Tên', dataIndex: 'name' },
                  { title: 'MST', dataIndex: 'tax_code', width: 120, render: (v: string) => v ?? '—' },
                  { title: 'SĐT', dataIndex: 'phone', width: 120, render: (v: string) => v ?? '—' },
                  { title: 'Loại', dataIndex: 'types', width: 100, render: (t: string[]) => t?.map((x) => <Tag key={x} color={x === 'customer' ? 'blue' : 'purple'} style={{ margin: 0 }}>{x === 'customer' ? 'KH' : 'NCC'}</Tag>) },
                ]}
              />
            </div>
          )}

          {changedList.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Checkbox
                  checked={allChangedSel}
                  indeterminate={!allChangedSel && changedIds.some((id: string) => hook.selectedBxIds.includes(id))}
                  onChange={(e) => toggleAll(changedIds, e.target.checked)}
                />
                <span style={{ fontWeight: 600, fontSize: 13 }}>Có thay đổi ({changedList.length})</span>
              </div>
              <Table size="small" pagination={false} rowKey="bitrix_id" dataSource={changedList}
                expandable={{
                  expandedRowRender: (r: any) => (
                    <div style={{ paddingLeft: 24 }}>
                      {r.changes.map((ch: any) => (
                        <div key={ch.field} style={{ display: 'flex', gap: 8, marginBottom: 4, fontSize: 13 }}>
                          <span style={{ width: 90, color: 'var(--text-3)', flexShrink: 0 }}>{FIELD_LABEL[ch.field] ?? ch.field}</span>
                          <span style={{ color: '#b91c1c', textDecoration: 'line-through' }}>{ch.old ?? '—'}</span>
                          <span style={{ color: 'var(--text-3)' }}>→</span>
                          <span style={{ color: '#15803d' }}>{ch.new ?? '—'}</span>
                        </div>
                      ))}
                    </div>
                  ),
                  rowExpandable: (r: any) => r.changes?.length > 0,
                }}
                columns={[
                  { width: 36, render: (_: any, r: any) => <Checkbox checked={hook.selectedBxIds.includes(r.bitrix_id)} onChange={() => toggleId(r.bitrix_id)} /> },
                  { title: 'Mã WMS', dataIndex: 'wms_code', width: 110 },
                  { title: 'Tên hiện tại', dataIndex: 'name' },
                  { title: 'Thay đổi', dataIndex: 'changes', render: (changes: any[]) => <Space size={4} wrap>{changes.map((c: any) => <Tooltip key={c.field} title={`${c.old ?? '—'} → ${c.new ?? '—'}`}><Tag style={{ cursor: 'default' }}>{FIELD_LABEL[c.field] ?? c.field}</Tag></Tooltip>)}</Space> },
                ]}
              />
            </div>
          )}

          {newList.length === 0 && changedList.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: '20px 0' }}>
              Tất cả công ty đã đồng bộ, không có gì thay đổi.
            </div>
          )}
        </div>
      ) : null}
    </Modal>
  )
}
