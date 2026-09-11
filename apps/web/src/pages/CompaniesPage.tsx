import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { RefreshCw, Phone, Mail, Search, ChevronLeft, ChevronRight, ChevronDown, Loader2, User } from 'lucide-react'
import { useCompanies } from '../hooks/useCompanies'
import { useDebounce } from '../hooks/useDebounce'
import { api } from '../lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { CodeText } from '@/components/ui/CodeText'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import CompanyDetailPanel from '../components/CompanyDetailPanel'
import ContactDetailPanel from '../components/ContactDetailPanel'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

// Header dùng chung cho cả 2 tab — CÙNG 1 cấu trúc DOM/kích thước cố định, chỉ đổi
// nội dung chữ + actions. Nhờ vậy khi chuyển tab, header không bị "nhảy" hình dạng,
// chỉ có bảng dữ liệu bên dưới thay đổi.
function TabHeader({
  title, subtitle, activeTab, onTabChange, actions,
}: {
  title: string
  subtitle: string
  activeTab: 'companies' | 'contacts'
  onTabChange: (v: 'companies' | 'contacts') => void
  actions?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2">
        <SegmentedControl
          value={activeTab}
          onChange={onTabChange}
          options={[
            { value: 'companies', label: 'Đối tác' },
            { value: 'contacts',  label: 'Người liên hệ' },
          ]}
        />
        {actions}
      </div>
    </div>
  )
}

export default function CompaniesPage() {
  const [activeTab, setActiveTab] = useState<'companies' | 'contacts'>('companies')
  // Hook nâng lên parent — dùng chung cho cả 2 tab để nút "Đồng bộ Bitrix" luôn
  // hiện diện ở cùng 1 vị trí bất kể tab nào đang active (switch không bị lệch chỗ),
  // và modal đồng bộ luôn mount sẵn nên bấm từ tab nào cũng mở được.
  const hook = useCompanies()

  return (
    <>
      {activeTab === 'companies'
        ? <CompaniesTab activeTab={activeTab} onTabChange={setActiveTab} hook={hook} />
        : <ContactsTab activeTab={activeTab} onTabChange={setActiveTab} onOpenSync={hook.openSync} />}
      <SyncBitrixModal hook={hook} />
    </>
  )
}

function CompaniesTab({ activeTab, onTabChange, hook }: {
  activeTab: 'companies' | 'contacts'
  onTabChange: (v: 'companies' | 'contacts') => void
  hook: ReturnType<typeof useCompanies>
}) {
  const total = hook.data?.total ?? 0
  const rows: any[] = hook.data?.data ?? []
  const totalPages = Math.max(1, Math.ceil(total / hook.limit))

  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Giữ lựa chọn hiện tại nếu vẫn còn trong trang; nếu không (đổi trang/lọc/tìm kiếm) thì
  // tự chọn dòng đầu tiên để panel bên phải luôn có nội dung hiển thị.
  useEffect(() => {
    if (rows.length === 0) { setSelectedId(null); return }
    if (!selectedId || !rows.some((r) => r.id === selectedId)) setSelectedId(rows[0].id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows])

  return (
    <div className="flex flex-col gap-4">

      <TabHeader
        title="Đối tác"
        subtitle={`${total.toLocaleString('vi-VN')} công ty`}
        activeTab={activeTab}
        onTabChange={onTabChange}
        actions={
          <Button variant="outline" onClick={hook.openSync}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Đồng bộ Bitrix
          </Button>
        }
      />

      <div className="grid grid-cols-[380px_1fr] items-start gap-4">

        {/* Roster */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border-md bg-background shadow-sm">
          <div className="flex flex-col gap-2 border-b border-border p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tìm tên, mã, MST…"
                value={hook.search}
                onChange={(e) => hook.setSearch(e.target.value)}
                className="h-9 pl-9 text-sm shadow-none"
              />
            </div>
            <SegmentedControl
              value={hook.typeFilter}
              onChange={hook.setTypeFilter}
              options={[
                { value: 'all' as const,      label: 'Tất cả' },
                { value: 'customer' as const, label: 'Khách hàng' },
                { value: 'supplier' as const, label: 'NCC' },
              ]}
            />
          </div>

          <ul
            className="flex-1 overflow-y-auto p-1.5"
            style={{ maxHeight: 'calc(100vh - 320px)', minHeight: 240 }}
          >
            {hook.isFetching && rows.length === 0 ? (
              <li className="px-3 py-10 text-center text-xs text-muted-foreground">Đang tải…</li>
            ) : rows.length === 0 ? (
              <li className="px-3 py-10 text-center text-xs text-muted-foreground">
                {hook.search ? 'Không tìm thấy đối tác nào.' : 'Chưa có đối tác nào.'}
              </li>
            ) : (
              rows.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => setSelectedId(c.id)}
                    className={cn(
                      'flex w-full items-start gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors',
                      c.id === selectedId
                        ? 'border-[var(--accent)]/25 bg-[var(--accent-bg)]'
                        : 'border-transparent hover:bg-muted/60',
                    )}
                  >
                    <span
                      className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full"
                      style={{ background: c.types?.includes('customer') ? 'var(--accent)' : 'var(--s-expired-color)' }}
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className="block text-sm font-medium leading-snug text-foreground"
                        title={c.name}
                        style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                      >
                        {c.name}
                      </span>
                      <span className="mt-1 flex items-center gap-1.5">
                        <CodeText>{c.code}</CodeText>
                        {c.phone && <Phone className="h-2.5 w-2.5 flex-shrink-0 text-muted-foreground" />}
                        {c.email && <Mail className="h-2.5 w-2.5 flex-shrink-0 text-muted-foreground" />}
                      </span>
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>

          {total > 0 && (
            <div className="flex items-center justify-between border-t border-border px-3 py-2">
              <span className="text-xs text-muted-foreground">Trang {hook.page} / {totalPages}</span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline" size="icon-sm"
                  disabled={hook.page <= 1}
                  onClick={() => hook.setPage(hook.page - 1)}
                  className="h-6 w-6"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline" size="icon-sm"
                  disabled={hook.page >= totalPages}
                  onClick={() => hook.setPage(hook.page + 1)}
                  className="h-6 w-6"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Detail */}
        <CompanyDetailPanel companyId={selectedId} />
      </div>
    </div>
  )
}

// ─── Contacts Tab ──────────────────────────────────────────────────────────────
// Cùng layout master-detail với CompaniesTab ở trên (roster trái 380px + panel chi
// tiết phải) — trước đây tab này dùng 1 bảng màu slate cứng copy từ mẫu khác, không
// khớp token WMS và khác hẳn cấu trúc CompaniesTab; giờ quy về đồng bộ.

function ContactsTab({ activeTab, onTabChange, onOpenSync }: {
  activeTab: 'companies' | 'contacts'
  onTabChange: (v: 'companies' | 'contacts') => void
  onOpenSync: () => void
}) {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 200)
  const [page, setPage] = useState(1)
  const limit = 50
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data, isFetching } = useQuery({
    queryKey: ['contacts', debouncedSearch, page, limit],
    queryFn: async () =>
      (await api.get('/companies/contacts', { params: { search: debouncedSearch.trim() || undefined, page, limit } })).data,
    staleTime: 30_000,
  })

  const rows: any[] = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const selected = rows.find((r) => r.id === selectedId) ?? null

  // Giữ lựa chọn hiện tại nếu vẫn còn trong trang; nếu không thì tự chọn dòng đầu
  // tiên để panel bên phải luôn có nội dung hiển thị — giống hệt CompaniesTab.
  useEffect(() => {
    if (rows.length === 0) { setSelectedId(null); return }
    if (!selectedId || !rows.some((r) => r.id === selectedId)) setSelectedId(rows[0].id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows])

  return (
    <div className="flex flex-col gap-4">
      <TabHeader
        title="Người liên hệ"
        subtitle={`${total.toLocaleString('vi-VN')} người liên hệ`}
        activeTab={activeTab}
        onTabChange={onTabChange}
        actions={
          <Button variant="outline" onClick={onOpenSync}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Đồng bộ Bitrix
          </Button>
        }
      />

      <div className="grid grid-cols-[380px_1fr] items-start gap-4">

        {/* Roster */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border-md bg-background shadow-sm">
          <div className="border-b border-border p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tìm tên, SĐT, email, công ty…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="h-9 pl-9 text-sm shadow-none"
              />
            </div>
          </div>

          <ul
            className="flex-1 overflow-y-auto p-1.5"
            style={{ maxHeight: 'calc(100vh - 320px)', minHeight: 240 }}
          >
            {isFetching && rows.length === 0 ? (
              <li className="px-3 py-10 text-center text-xs text-muted-foreground">Đang tải…</li>
            ) : rows.length === 0 ? (
              <li className="px-3 py-10 text-center text-xs text-muted-foreground">
                {search ? 'Không tìm thấy người liên hệ nào.' : 'Chưa có người liên hệ nào.'}
              </li>
            ) : (
              rows.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => setSelectedId(c.id)}
                    className={cn(
                      'flex w-full items-start gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors',
                      c.id === selectedId
                        ? 'border-[var(--accent)]/25 bg-[var(--accent-bg)]'
                        : 'border-transparent hover:bg-muted/60',
                    )}
                  >
                    <User className="mt-1 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium leading-snug text-foreground" title={c.full_name}>{c.full_name}</span>
                        {c.is_primary && <span className="flex-shrink-0 text-[10px] font-semibold text-emerald-700">Chính</span>}
                      </span>
                      <span className="mt-1 flex items-center gap-1.5">
                        {c.company_name && <span className="truncate text-xs text-muted-foreground" title={c.company_name}>{c.company_name}</span>}
                        {c.phone && <Phone className="h-2.5 w-2.5 flex-shrink-0 text-muted-foreground" />}
                        {c.email && <Mail className="h-2.5 w-2.5 flex-shrink-0 text-muted-foreground" />}
                      </span>
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>

          {total > 0 && (
            <div className="flex items-center justify-between border-t border-border px-3 py-2">
              <span className="text-xs text-muted-foreground">Trang {page} / {totalPages}</span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline" size="icon-sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="h-6 w-6"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline" size="icon-sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="h-6 w-6"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Detail */}
        <ContactDetailPanel contact={selected} />
      </div>
    </div>
  )
}

const FIELD_LABEL: Record<string, string> = {
  name: 'Tên', phone: 'SĐT', email: 'Email',
  tax_code: 'MST', address: 'Địa chỉ',
  bank_account: 'Tài khoản', bank_name: 'Ngân hàng',
}

// Checkbox tối giản dùng riêng cho bảng sync — chỉ 4 chỗ dùng (2 select-all + 2 select-row),
// không đáng để dựng thành component ui/checkbox.tsx dùng chung cho cả app.
function SyncCheckbox({ checked, indeterminate, onChange }: {
  checked: boolean
  indeterminate?: boolean
  onChange: (checked: boolean) => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { if (ref.current) ref.current.indeterminate = !!indeterminate }, [indeterminate])
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      onClick={(e) => e.stopPropagation()}
      className="h-4 w-4 cursor-pointer rounded border-border-md accent-[var(--accent)]"
    />
  )
}

function MiniTypeTag({ type }: { type: string }) {
  const isCust = type === 'customer'
  const color = isCust ? 'var(--accent-text)' : 'var(--s-expired-color)'
  const bg    = isCust ? 'var(--accent-bg)'   : 'var(--s-expired-bg)'
  return (
    <span className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: bg, color }}>
      {isCust ? 'KH' : 'NCC'}
    </span>
  )
}

function ChangeFieldTag({ field, old, next }: { field: string; old: string | null; next: string | null }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-default rounded-md border border-border bg-muted/60 px-1.5 py-0.5 text-xs font-medium text-foreground">
          {FIELD_LABEL[field] ?? field}
        </span>
      </TooltipTrigger>
      <TooltipContent>{old ?? '—'} → {next ?? '—'}</TooltipContent>
    </Tooltip>
  )
}

function SyncBitrixModal({ hook }: { hook: any }) {
  const preview = hook.syncPreview
  const newList: any[]     = preview?.new_companies     ?? []
  const changedList: any[] = preview?.changed_companies ?? []
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

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

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const newIds     = newList.map((c: any) => c.bitrix_id)
  const changedIds = changedList.map((c: any) => c.bitrix_id)
  const allNewSel     = newIds.length > 0     && newIds.every((id: string) => hook.selectedBxIds.includes(id))
  const allChangedSel = changedIds.length > 0 && changedIds.every((id: string) => hook.selectedBxIds.includes(id))
  const someNewSel     = !allNewSel     && newIds.some((id: string) => hook.selectedBxIds.includes(id))
  const someChangedSel = !allChangedSel && changedIds.some((id: string) => hook.selectedBxIds.includes(id))

  return (
    <Dialog open={hook.syncOpen} onOpenChange={(o: boolean) => hook.setSyncOpen(o)}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-4 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Đồng bộ công ty từ Bitrix</DialogTitle>
        </DialogHeader>

        {hook.previewLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang tải dữ liệu từ Bitrix…
          </div>
        ) : preview ? (
          <div className="flex min-h-0 flex-1 flex-col gap-4">

            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
              <span>Tổng Bitrix: <strong className="text-foreground">{preview.total_bitrix}</strong></span>
              <span>Mới: <strong style={{ color: 'var(--s-completed-color)' }}>{newList.length}</strong></span>
              <span>Có thay đổi: <strong style={{ color: 'var(--s-pending-color)' }}>{changedList.length}</strong></span>
              <span>Không đổi: <strong className="text-foreground">{preview.unchanged_count}</strong></span>
              {preview.locked_count > 0 && (
                <span>Đã khoá: <strong style={{ color: 'var(--s-pending-color)' }}>{preview.locked_count}</strong></span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="flex flex-col gap-5">

                {newList.length > 0 && (
                  <div>
                    <div className="mb-1.5 flex items-center gap-2">
                      <SyncCheckbox checked={allNewSel} indeterminate={someNewSel} onChange={(c) => toggleAll(newIds, c)} />
                      <span className="text-sm font-semibold text-foreground">Công ty mới ({newList.length})</span>
                    </div>
                    <div className="overflow-hidden rounded-lg border border-border-md">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/60 hover:bg-muted/60">
                            <TableHead className="w-9" />
                            <TableHead>Tên</TableHead>
                            <TableHead className="w-32">MST</TableHead>
                            <TableHead className="w-32">SĐT</TableHead>
                            <TableHead className="w-16 text-center">Loại</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {newList.map((r: any) => (
                            <TableRow key={r.bitrix_id}>
                              <TableCell><SyncCheckbox checked={hook.selectedBxIds.includes(r.bitrix_id)} onChange={() => toggleId(r.bitrix_id)} /></TableCell>
                              <TableCell className="whitespace-normal font-medium text-foreground">{r.name}</TableCell>
                              <TableCell className="text-muted-foreground">{r.tax_code ?? '—'}</TableCell>
                              <TableCell className="text-muted-foreground">{r.phone ?? '—'}</TableCell>
                              <TableCell>
                                <div className="flex justify-center gap-1">
                                  {r.types?.map((t: string) => <MiniTypeTag key={t} type={t} />)}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {changedList.length > 0 && (
                  <div>
                    <div className="mb-1.5 flex items-center gap-2">
                      <SyncCheckbox checked={allChangedSel} indeterminate={someChangedSel} onChange={(c) => toggleAll(changedIds, c)} />
                      <span className="text-sm font-semibold text-foreground">Có thay đổi ({changedList.length})</span>
                    </div>
                    <div className="overflow-hidden rounded-lg border border-border-md">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/60 hover:bg-muted/60">
                            <TableHead className="w-9" />
                            <TableHead className="w-28">Mã WMS</TableHead>
                            <TableHead>Tên hiện tại</TableHead>
                            <TableHead>Thay đổi</TableHead>
                            <TableHead className="w-9" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {changedList.map((r: any) => {
                            const expanded = expandedIds.has(r.bitrix_id)
                            const expandable = r.changes?.length > 0
                            return (
                              <Fragment key={r.bitrix_id}>
                                <TableRow>
                                  <TableCell><SyncCheckbox checked={hook.selectedBxIds.includes(r.bitrix_id)} onChange={() => toggleId(r.bitrix_id)} /></TableCell>
                                  <TableCell><CodeText size="sm">{r.wms_code}</CodeText></TableCell>
                                  <TableCell className="whitespace-normal font-medium text-foreground">{r.name}</TableCell>
                                  <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                      {r.changes.map((c: any) => (
                                        <ChangeFieldTag key={c.field} field={c.field} old={c.old} next={c.new} />
                                      ))}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {expandable && (
                                      <button
                                        type="button"
                                        onClick={() => toggleExpanded(r.bitrix_id)}
                                        className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                      >
                                        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')} />
                                      </button>
                                    )}
                                  </TableCell>
                                </TableRow>
                                {expanded && expandable && (
                                  <TableRow className="hover:bg-transparent">
                                    <TableCell colSpan={5} className="bg-muted/30 py-2.5">
                                      <div className="flex flex-col gap-1.5 pl-9">
                                        {r.changes.map((ch: any) => (
                                          <div key={ch.field} className="flex items-center gap-2 text-xs">
                                            <span className="w-20 flex-shrink-0 text-muted-foreground">{FIELD_LABEL[ch.field] ?? ch.field}</span>
                                            <span className="line-through" style={{ color: 'var(--s-cancelled-color)' }}>{ch.old ?? '—'}</span>
                                            <span className="text-muted-foreground">→</span>
                                            <span style={{ color: 'var(--s-completed-color)' }}>{ch.new ?? '—'}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )}
                              </Fragment>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {newList.length === 0 && changedList.length === 0 && (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    Tất cả công ty đã đồng bộ, không có gì thay đổi.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => hook.setSyncOpen(false)}>Đóng</Button>
          <Button
            disabled={hook.selectedBxIds.length === 0 || hook.previewLoading || hook.syncMutation.isPending}
            onClick={() => hook.syncMutation.mutate()}
          >
            {hook.syncMutation.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Áp dụng ({hook.selectedBxIds.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
