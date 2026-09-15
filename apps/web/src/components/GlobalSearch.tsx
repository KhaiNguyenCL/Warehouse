import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, Building2, Boxes, Package, ClipboardList, FileText, PackageCheck, PackageOpen, ArrowLeftRight, PackageSearch, Hash } from 'lucide-react'
import {
  CommandDialog, Command, CommandInput, CommandList,
  CommandEmpty, CommandGroup, CommandItem,
} from '@/components/ui/command'
import { api } from '../lib/api'

interface SearchResult {
  type: string
  id: string
  title: string
  subtitle: string
  link: string
}

interface SearchResponse {
  results: SearchResult[]
  grouped: Record<string, SearchResult[]>
  typeLabels: Record<string, string>
}

const TYPE_ORDER = [
  'company', 'product', 'variant',
  'purchase_order', 'quotation', 'receipt',
  'delivery', 'shipment', 'transfer', 'serial',
]

const TYPE_ICON: Record<string, React.ElementType> = {
  company:        Building2,
  product:        Boxes,
  variant:        Package,
  purchase_order: ClipboardList,
  quotation:      FileText,
  receipt:        PackageCheck,
  delivery:       PackageOpen,
  shipment:       PackageSearch,
  transfer:       ArrowLeftRight,
  serial:         Hash,
}

const TYPE_LABEL: Record<string, string> = {
  company:        'Đối tác',
  product:        'Sản phẩm',
  variant:        'SKU',
  purchase_order: 'Phiếu mua hàng',
  quotation:      'Báo giá',
  receipt:        'Phiếu nhập kho',
  delivery:       'Phiếu xuất kho',
  shipment:       'Phiếu nhận hàng',
  transfer:       'Chuyển kho',
  serial:         'Serial Number',
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export default function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const debouncedQuery = useDebounce(query, 300)

  // Ctrl+K / Cmd+K để mở
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Reset query khi đóng
  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  const { data, isFetching } = useQuery<SearchResponse>({
    queryKey: ['search', debouncedQuery],
    queryFn: async () => (await api.get('/search', { params: { q: debouncedQuery } })).data,
    enabled: debouncedQuery.length >= 2,
    staleTime: 10_000,
  })

  function handleSelect(link: string) {
    setOpen(false)
    navigate(link)
  }

  const grouped = data?.grouped ?? {}
  const hasResults = data?.results && data.results.length > 0
  const showEmpty = debouncedQuery.length >= 2 && !isFetching && !hasResults

  return (
    <>
      {/* Trigger button trong topbar */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 h-8 rounded-lg border border-border bg-background px-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      >
        <Search className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden sm:inline">Tìm kiếm...</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1 text-[10px] font-medium text-muted-foreground">
          <span>Ctrl</span><span>K</span>
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen} title="Tìm kiếm toàn cục">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Tìm kiếm đối tác, sản phẩm, phiếu..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList className="max-h-[480px]">
            {query.length < 2 && (
              <div className="px-3 py-3">
                <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Có thể tìm kiếm
                </p>
                <div className="grid grid-cols-2 gap-1">
                  {[
                    { icon: Building2,     label: 'Đối tác',           hint: 'tên, mã công ty' },
                    { icon: Boxes,         label: 'Sản phẩm / SKU',    hint: 'tên, mã, SKU' },
                    { icon: ClipboardList, label: 'Phiếu mua hàng',    hint: 'mã phiếu, VD: PO-2026-001' },
                    { icon: PackageSearch, label: 'Phiếu nhận hàng',   hint: 'mã phiếu, VD: SH-2026-001' },
                    { icon: PackageCheck,  label: 'Phiếu nhập kho',    hint: 'mã phiếu, VD: NK-2026-001' },
                    { icon: FileText,      label: 'Báo giá',           hint: 'mã phiếu, VD: BG-2026-001' },
                    { icon: PackageOpen,   label: 'Phiếu xuất kho',    hint: 'mã phiếu, VD: XK-2026-001' },
                    { icon: ArrowLeftRight,label: 'Chuyển kho',        hint: 'mã phiếu, VD: CK-2026-001' },
                    { icon: Hash,          label: 'Serial Number',     hint: 'SN đầy đủ hoặc một phần' },
                  ].map(({ icon: Icon, label, hint }) => (
                    <div key={label} className="flex items-start gap-2 rounded-lg px-2 py-1.5">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[var(--accent-bg)]">
                        <Icon className="h-3 w-3 text-[var(--accent-text)]" />
                      </span>
                      <div>
                        <p className="text-xs font-medium text-foreground leading-tight">{label}</p>
                        <p className="text-[11px] text-muted-foreground leading-tight">{hint}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isFetching && query.length >= 2 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Đang tìm...
              </div>
            )}

            {showEmpty && (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-muted-foreground">Không tìm thấy kết quả cho <strong>"{debouncedQuery}"</strong></p>
                <p className="mt-1 text-xs text-muted-foreground">Thử nhập mã phiếu (VD: NK-2026-...) hoặc tên sản phẩm</p>
              </div>
            )}

            {!isFetching && hasResults && TYPE_ORDER.map((type) => {
              const items = grouped[type]
              if (!items?.length) return null
              const Icon = TYPE_ICON[type] ?? Package
              const label = TYPE_LABEL[type] ?? type

              return (
                <CommandGroup key={type} heading={label}>
                  {items.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={`${type}-${item.id}`}
                      onSelect={() => handleSelect(item.link)}
                      className="cursor-pointer"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--accent-bg)]">
                        <Icon className="h-3.5 w-3.5 text-[var(--accent-text)]" />
                      </span>
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-sm font-medium">{item.title}</span>
                        {item.subtitle && (
                          <span className="truncate text-xs text-muted-foreground">{item.subtitle}</span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )
            })}
          </CommandList>

          {hasResults && (
            <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
              {data!.results.length} kết quả · ↑↓ điều hướng · Enter chọn · Esc đóng
            </div>
          )}
        </Command>
      </CommandDialog>
    </>
  )
}
