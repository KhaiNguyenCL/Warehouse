import { cn } from '@/lib/utils'

const OPTIONS = [10, 20, 50, 100]

export function PageSizeSelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground">Hiển thị</span>
      <div className="flex items-center rounded-md border border-border bg-muted/40 p-0.5 gap-0.5">
        {OPTIONS.map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={cn(
              'rounded px-2 py-0.5 text-xs font-medium transition-colors',
              value === n
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}
