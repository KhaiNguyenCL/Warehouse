import { cn } from '@/lib/utils'

// Badge Hoạt động/Ngừng — lặp lại ở mọi trang danh mục có is_active (Category, Brand,
// Warehouse, User, SettingsTypes, CustomFields...). Pill nền nhạt màu, cùng phong cách
// với StatusBadge (đã đổi từ kiểu chấm tròn + chữ sang pill để dễ quét mắt hơn).
export function ActiveBadge({ active, activeLabel = 'Hoạt động', inactiveLabel = 'Ngừng' }: {
  active: boolean
  activeLabel?: string
  inactiveLabel?: string
}) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap',
      active ? 'bg-[var(--s-completed-bg)] text-[var(--s-completed-color)]' : 'bg-muted text-muted-foreground',
    )}>
      {active ? activeLabel : inactiveLabel}
    </span>
  )
}
