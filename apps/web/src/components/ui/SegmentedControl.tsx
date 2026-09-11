import { cn } from '@/lib/utils'

// Segmented control dùng chung cho mọi chỗ cần "switch" giữa vài lựa chọn loại trừ
// nhau — dải tab Đối tác/Người liên hệ, lọc loại đối tác... 1 kiểu nút thống nhất,
// pill nền active nổi lên trên track chìm thay vì border rời rạc từng nút.
export function SegmentedControl<T extends string>({ value, onChange, options }: {
  value: T
  onChange: (v: T) => void
  options: readonly { value: T; label: string }[]
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-border-md bg-muted/40 p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'rounded-md px-2.5 py-1 text-xs font-medium transition-all',
            value === opt.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
