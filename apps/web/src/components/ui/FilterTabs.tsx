import { cn } from '@/lib/utils'

// FilterTabs — dải tab lọc có hiện số đếm ngay trên mỗi tab (VD "Hoạt động (12)"), tab đang
// chọn có gạch chân + màu accent. Dùng cho filter trạng thái ở roster (Brand/Category/
// Warehouse...) — thay cho SegmentedControl khi cần hiện số lượng theo từng lựa chọn.
// SegmentedControl vẫn giữ lại cho các chỗ switch loại trừ nhau KHÔNG cần đếm số lượng
// (VD tab Đối tác/Người liên hệ ở CompaniesPage).
export function FilterTabs<T extends string>({ value, onChange, options, countShape = 'pill' }: {
  value: T
  onChange: (v: T) => void
  options: readonly { value: T; label: string; count?: number }[]
  // 'pill' = mặc định (bo tròn hết cỡ). 'tag' = thử nghiệm bo góc nhẹ — xem StatusToggle.
  countShape?: 'pill' | 'tag'
}) {
  return (
    <div className="flex items-center gap-3 border-b border-border">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'relative -mb-px flex items-center gap-1.5 border-b-2 px-0.5 py-2 text-sm font-medium transition-colors',
            value === opt.value
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          {opt.label}
          {opt.count != null && (
            <span className={cn(
              'px-1.5 py-0.5 text-xs font-semibold tabular-nums',
              countShape === 'tag' ? 'rounded-md' : 'rounded-full',
              value === opt.value ? 'bg-[var(--accent-bg)] text-[var(--accent-text)]' : 'bg-muted text-muted-foreground',
            )}>
              {opt.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
