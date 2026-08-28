import { cn } from '@/lib/utils'

// Badge Hoạt động/Ngừng — lặp lại ở mọi trang danh mục có is_active (Category, Brand,
// Warehouse, User, SettingsTypes, CustomFields...). Cùng phong cách tối giản với
// StatusBadge: chấm tròn nhỏ + chữ màu, không pill nền màu.
export function ActiveBadge({ active, activeLabel = 'Hoạt động', inactiveLabel = 'Ngừng' }: {
  active: boolean
  activeLabel?: string
  inactiveLabel?: string
}) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 text-sm font-medium whitespace-nowrap',
      active ? 'text-emerald-700' : 'text-muted-foreground',
    )}>
      <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', active ? 'bg-emerald-500' : 'bg-zinc-400')} />
      {active ? activeLabel : inactiveLabel}
    </span>
  )
}
