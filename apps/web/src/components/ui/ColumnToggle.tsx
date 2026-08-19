import { useState } from 'react'
import { Check, SlidersHorizontal } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

// ── Types ───────────────────────────────────────────────────────────────────

export interface ColumnDef {
  key: string
  label: string
  default?: boolean   // defaults to true if omitted
  fixed?: boolean     // cannot be hidden
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function useColumnVisibility(tableId: string, columns: ColumnDef[]) {
  const [visible, setVisible] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem(`col-vis:${tableId}`)
      if (stored) return JSON.parse(stored) as Record<string, boolean>
    } catch {}
    return Object.fromEntries(columns.map((c) => [c.key, c.default ?? true]))
  })

  function toggle(key: string) {
    setVisible((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      try { localStorage.setItem(`col-vis:${tableId}`, JSON.stringify(next)) } catch {}
      return next
    })
  }

  function isVisible(key: string) {
    const col = columns.find((c) => c.key === key)
    if (col?.fixed) return true
    return visible[key] ?? true
  }

  return { visible, toggle, isVisible }
}

// ── Component ────────────────────────────────────────────────────────────────

interface ColumnToggleProps {
  tableId: string
  columns: ColumnDef[]
  visible: Record<string, boolean>
  onToggle: (key: string) => void
}

export function ColumnToggle({ columns, visible, onToggle }: ColumnToggleProps) {
  const toggleable = columns.filter((c) => !c.fixed)
  const hiddenCount = toggleable.filter((c) => !(visible[c.key] ?? true)).length

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={cn(
          'flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
          hiddenCount > 0 ? 'text-foreground' : 'text-muted-foreground',
        )}>
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Cột
          {hiddenCount > 0 && (
            <span className="rounded-full bg-primary/10 px-1 text-xs font-semibold text-primary">
              {hiddenCount} ẩn
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-44 rounded-xl p-1.5 shadow-lg"
      >
        <p className="px-2 pb-1 pt-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Hiển thị cột
        </p>
        <div className="flex flex-col gap-0.5">
          {toggleable.map((col) => {
            const on = visible[col.key] ?? true
            return (
              <button
                key={col.key}
                onClick={() => onToggle(col.key)}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent"
              >
                <span className={cn(
                  'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                  on ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background',
                )}>
                  {on && <Check className="h-3 w-3" />}
                </span>
                <span className={cn('flex-1 text-left', on ? 'text-foreground' : 'text-muted-foreground')}>
                  {col.label}
                </span>
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
