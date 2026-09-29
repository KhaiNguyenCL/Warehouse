import { cn } from '@/lib/utils'

// StatusToggle — control bật/tắt trạng thái is_active dạng 2 nút chọn (không phải switch
// gạt nhỏ) để rõ ràng, dễ thấy khác biệt ngay cả khi nhìn tĩnh không tương tác. Dùng trong
// panel chi tiết của các trang danh mục (Brand/Category/Warehouse/User...).
export function StatusToggle({
  active, onChange, activeLabel = 'Hoạt động', inactiveLabel = 'Ngừng', disabled, shape = 'pill',
}: {
  active: boolean
  onChange: (value: boolean) => void
  activeLabel?: string
  inactiveLabel?: string
  disabled?: boolean
  // 'pill' = mặc định (bo tròn hết cỡ). 'tag' = thử nghiệm bo góc nhẹ, dùng khi đối chiếu
  // 1 hướng ít bo tròn hơn trên 1 trang cụ thể — KHÔNG đổi mặc định các trang khác.
  shape?: 'pill' | 'tag'
}) {
  const radius = shape === 'tag' ? 'rounded-md' : 'rounded-full'
  return (
    <div className={cn('inline-flex items-center gap-0.5 border border-border-md bg-muted/40 p-0.5', radius)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(true)}
        className={cn(
          'px-2.5 py-1 text-xs font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50',
          radius,
          active
            ? 'bg-[var(--s-completed-color)] text-white shadow-sm'
            : 'text-muted-foreground hover:bg-background hover:text-foreground',
        )}
      >
        {activeLabel}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(false)}
        className={cn(
          'px-2.5 py-1 text-xs font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50',
          radius,
          !active
            ? 'bg-[var(--text-2)] text-white shadow-sm'
            : 'text-muted-foreground hover:bg-background hover:text-foreground',
        )}
      >
        {inactiveLabel}
      </button>
    </div>
  )
}
