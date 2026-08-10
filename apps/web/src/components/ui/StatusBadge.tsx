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

const STATUS_MAP: Record<string, StatusDef> = {
  draft:            { label: 'Nháp',            className: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',           dotClass: 'bg-slate-400' },
  pending_approval: { label: 'Chờ duyệt',       className: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200',           dotClass: 'bg-amber-500' },
  approved:         { label: 'Đã duyệt',         className: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',               dotClass: 'bg-blue-500' },
  completed:        { label: 'Hoàn thành',       className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',      dotClass: 'bg-emerald-500' },
  cancelled:        { label: 'Đã hủy',           className: 'bg-red-50 text-red-600 ring-1 ring-red-200',                 dotClass: 'bg-red-500' },
  confirmed:        { label: 'Đã xác nhận',      className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',      dotClass: 'bg-emerald-500' },
  in_progress:      { label: 'Đang thực hiện',   className: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',               dotClass: 'bg-blue-500' },
  expired:          { label: 'Hết hạn',          className: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200',         dotClass: 'bg-purple-500' },
  active:           { label: 'Hoạt động',        className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',      dotClass: 'bg-emerald-500' },
  sold:             { label: 'Đã bán',           className: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',               dotClass: 'bg-blue-500' },
  disposed:         { label: 'Đã huỷ',           className: 'bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200',             dotClass: 'bg-zinc-400' },
}

const FALLBACK: StatusDef = { label: 'Không rõ', className: 'bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200', dotClass: 'bg-zinc-400' }

interface Props {
  status: string
  label?: string
  className?: string
}

export function StatusBadge({ status, label, className }: Props) {
  const def = STATUS_MAP[status] ?? FALLBACK
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
      def.className,
      className,
    )}>
      <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', def.dotClass)} />
      {label ?? def.label}
    </span>
  )
}
