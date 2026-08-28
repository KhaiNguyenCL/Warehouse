// Trạng thái theo status — lặp lại ở mọi trang detail có state machine (Receipt/PO/
// Delivery/Transfer...). Mỗi object tự định nghĩa colorMap riêng (số lượng & tên status
// khác nhau giữa các object) và truyền vào, component không tự đoán màu.
// Render tối giản: 1 chấm màu nhỏ + chữ màu ngữ nghĩa — không dùng AntD <Tag> filled-pill,
// đồng bộ với components/ui/StatusBadge.tsx.
import { cn } from '@/lib/utils'

// colorMap dùng tên màu AntD quen thuộc (blue/green/red/gold/purple/cyan/orange/default) —
// map sang cặp text/dot tương ứng theo mẫu StatusBadge.
const COLOR_MAP: Record<string, { text: string; dot: string }> = {
  default: { text: 'text-foreground',       dot: 'bg-slate-400' },
  blue:    { text: 'text-blue-700',         dot: 'bg-blue-500' },
  green:   { text: 'text-emerald-700',      dot: 'bg-emerald-500' },
  red:     { text: 'text-red-700',          dot: 'bg-red-500' },
  gold:    { text: 'text-amber-700',        dot: 'bg-amber-500' },
  orange:  { text: 'text-amber-700',        dot: 'bg-amber-500' },
  purple:  { text: 'text-purple-700',       dot: 'bg-purple-500' },
  cyan:    { text: 'text-cyan-700',         dot: 'bg-cyan-500' },
}
const FALLBACK = { text: 'text-muted-foreground', dot: 'bg-zinc-400' }

export function StatusTag({
  status,
  colorMap,
  labelMap,
}: {
  status: string
  colorMap: Record<string, string>
  labelMap?: Record<string, string>
}) {
  const def = COLOR_MAP[colorMap[status]] ?? FALLBACK
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-sm font-medium whitespace-nowrap', def.text)}>
      <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', def.dot)} />
      {labelMap?.[status] ?? status}
    </span>
  )
}
