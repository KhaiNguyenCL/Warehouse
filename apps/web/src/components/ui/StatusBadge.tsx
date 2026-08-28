import { cn } from '@/lib/utils'

export type WmsStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'completed'
  | 'cancelled'
  | 'confirmed'
  | 'in_progress'
  | 'expired'
  | 'active'
  | 'sold'
  | 'disposed'

interface StatusDef {
  label: string
  className: string
  dotClass: string
}

// Chỉ 1 chấm màu nhỏ làm tín hiệu nhận diện — chữ dùng màu text trung tính,
// không tô nền pill để bảng đỡ rối mắt khi nhiều dòng trạng thái khác nhau.
const STATUS_MAP: Record<string, StatusDef> = {
  draft:            { label: 'Nháp',            className: 'text-foreground',       dotClass: 'bg-slate-400' },
  pending_approval: { label: 'Chờ duyệt',       className: 'text-amber-700',        dotClass: 'bg-amber-500' },
  approved:         { label: 'Đã duyệt',         className: 'text-blue-700',         dotClass: 'bg-blue-500' },
  completed:        { label: 'Hoàn thành',       className: 'text-emerald-700',      dotClass: 'bg-emerald-500' },
  cancelled:        { label: 'Đã hủy',           className: 'text-red-700',          dotClass: 'bg-red-500' },
  confirmed:        { label: 'Đã xác nhận',      className: 'text-emerald-700',      dotClass: 'bg-emerald-500' },
  in_progress:      { label: 'Đang thực hiện',   className: 'text-blue-700',         dotClass: 'bg-blue-500' },
  expired:          { label: 'Hết hạn',          className: 'text-purple-700',       dotClass: 'bg-purple-500' },
  active:           { label: 'Hoạt động',        className: 'text-emerald-700',      dotClass: 'bg-emerald-500' },
  sold:             { label: 'Đã bán',           className: 'text-blue-700',         dotClass: 'bg-blue-500' },
  disposed:         { label: 'Đã huỷ',           className: 'text-muted-foreground', dotClass: 'bg-zinc-400' },
}

const FALLBACK: StatusDef = { label: 'Không rõ', className: 'text-muted-foreground', dotClass: 'bg-zinc-400' }

interface Props {
  status: string
  label?: string
  className?: string
}

export function StatusBadge({ status, label, className }: Props) {
  const def = STATUS_MAP[status] ?? FALLBACK
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 text-sm font-medium whitespace-nowrap',
      def.className,
      className,
    )}>
      <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', def.dotClass)} />
      {label ?? def.label}
    </span>
  )
}
