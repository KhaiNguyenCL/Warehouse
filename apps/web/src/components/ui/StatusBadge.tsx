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
  draft:            { label: 'Nháp',            className: 'bg-slate-100 text-slate-900 ring-1 ring-slate-400',           dotClass: 'bg-slate-600' },
  pending_approval: { label: 'Chờ duyệt',       className: 'bg-amber-200 text-amber-800 ring-1 ring-amber-400',           dotClass: 'bg-amber-600' },
  approved:         { label: 'Đã duyệt',         className: 'bg-blue-100 text-blue-800 ring-1 ring-blue-300',              dotClass: 'bg-blue-600' },
  completed:        { label: 'Hoàn thành',       className: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300',     dotClass: 'bg-emerald-600' },
  cancelled:        { label: 'Đã hủy',           className: 'bg-red-100 text-red-700 ring-1 ring-red-300',                dotClass: 'bg-red-600' },
  confirmed:        { label: 'Đã xác nhận',      className: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300',     dotClass: 'bg-emerald-600' },
  in_progress:      { label: 'Đang thực hiện',   className: 'bg-blue-100 text-blue-800 ring-1 ring-blue-300',              dotClass: 'bg-blue-600' },
  expired:          { label: 'Hết hạn',          className: 'bg-purple-100 text-purple-800 ring-1 ring-purple-300',        dotClass: 'bg-purple-600' },
  active:           { label: 'Hoạt động',        className: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300',     dotClass: 'bg-emerald-600' },
  sold:             { label: 'Đã bán',           className: 'bg-blue-100 text-blue-800 ring-1 ring-blue-300',              dotClass: 'bg-blue-600' },
  disposed:         { label: 'Đã huỷ',           className: 'bg-zinc-100 text-zinc-900 ring-1 ring-zinc-400',             dotClass: 'bg-zinc-600' },
}

const FALLBACK: StatusDef = { label: 'Không rõ', className: 'bg-zinc-100 text-zinc-900 ring-1 ring-zinc-400', dotClass: 'bg-zinc-600' }

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
