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
          <CommandList className="max-h-[420px]">
            {query.length < 2 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Nhập ít nhất 2 ký tự để tìm kiếm
              </div>
            )}

            {isFetching && query.length >= 2 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Đang tìm...
              </div>
            )}

            {showEmpty && (
              <CommandEmpty>Không tìm thấy kết quả cho "{debouncedQuery}"</CommandEmpty>
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
