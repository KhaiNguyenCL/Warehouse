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
  | 'received'

interface StatusDef {
  label: string
  className: string
}

// Pill nền nhạt màu + chữ đậm cùng tông — dễ quét mắt hơn kiểu chấm+chữ trước đây khi bảng
// có nhiều dòng trạng thái khác nhau. Màu lấy từ --s-{key}-color/-bg trong styles/tokens.css
// (7 cặp semantic có sẵn) qua Tailwind arbitrary value — tự đổi đúng theo dark mode.
// Vài status không có token riêng (in_progress/active/sold/disposed/received) được map
// sang token semantic gần nghĩa nhất thay vì thêm token mới.
const STATUS_MAP: Record<string, StatusDef> = {
  draft:            { label: 'Nháp',           className: 'bg-[var(--s-draft-bg)] text-[var(--s-draft-color)]' },
  pending_approval: { label: 'Chờ duyệt',      className: 'bg-[var(--s-pending-bg)] text-[var(--s-pending-color)]' },
  approved:         { label: 'Đã duyệt',       className: 'bg-[var(--s-approved-bg)] text-[var(--s-approved-color)]' },
  completed:        { label: 'Hoàn thành',     className: 'bg-[var(--s-completed-bg)] text-[var(--s-completed-color)]' },
  cancelled:        { label: 'Đã hủy',         className: 'bg-[var(--s-cancelled-bg)] text-[var(--s-cancelled-color)]' },
  confirmed:        { label: 'Đã xác nhận',    className: 'bg-[var(--s-confirmed-bg)] text-[var(--s-confirmed-color)]' },
  in_progress:      { label: 'Đang thực hiện', className: 'bg-[var(--s-approved-bg)] text-[var(--s-approved-color)]' },
  expired:          { label: 'Hết hạn',        className: 'bg-[var(--s-expired-bg)] text-[var(--s-expired-color)]' },
  active:           { label: 'Hoạt động',      className: 'bg-[var(--s-completed-bg)] text-[var(--s-completed-color)]' },
  sold:             { label: 'Đã bán',         className: 'bg-[var(--s-confirmed-bg)] text-[var(--s-confirmed-color)]' },
  disposed:         { label: 'Đã huỷ',         className: 'bg-[var(--s-cancelled-bg)] text-[var(--s-cancelled-color)]' },
  received:         { label: 'Đã nhận hàng',   className: 'bg-[var(--s-completed-bg)] text-[var(--s-completed-color)]' },
}

const FALLBACK: StatusDef = { label: 'Không rõ', className: 'bg-muted text-muted-foreground' }

// Dùng cho filter pill (status tab bên trái toolbar List page) — khi đang active, pill phải
// lên đúng màu của status đó (vàng/xanh lá/đỏ) thay vì 1 màu primary chung chung, để filter
// và badge trong bảng nói cùng 1 "ngôn ngữ màu". Trả về className rỗng (fallback muted) nếu
// status không có trong STATUS_MAP.
export function statusFilterClassName(status: string): string {
  return STATUS_MAP[status]?.className ?? FALLBACK.className
}

interface Props {
  status: string
  label?: string
  className?: string
  /**
   * Tương thích ngược với StatusTag cũ: map status -> tên màu AntD (blue/green/red/gold/
   * orange/purple/cyan/default). Chỉ cần khi status không nằm trong STATUS_MAP ở trên.
   */
  colorMap?: Record<string, string>
  labelMap?: Record<string, string>
}

const LEGACY_COLOR_TO_TOKEN: Record<string, StatusDef> = {
  default: { label: '', className: 'bg-muted text-muted-foreground' },
  blue:    { label: '', className: 'bg-[var(--s-approved-bg)] text-[var(--s-approved-color)]' },
  green:   { label: '', className: 'bg-[var(--s-completed-bg)] text-[var(--s-completed-color)]' },
  red:     { label: '', className: 'bg-[var(--s-cancelled-bg)] text-[var(--s-cancelled-color)]' },
  gold:    { label: '', className: 'bg-[var(--s-pending-bg)] text-[var(--s-pending-color)]' },
  orange:  { label: '', className: 'bg-[var(--s-pending-bg)] text-[var(--s-pending-color)]' },
  purple:  { label: '', className: 'bg-[var(--s-expired-bg)] text-[var(--s-expired-color)]' },
  cyan:    { label: '', className: 'bg-[var(--s-approved-bg)] text-[var(--s-approved-color)]' },
}

export function StatusBadge({ status, label, className, colorMap, labelMap }: Props) {
  const def = colorMap
    ? (LEGACY_COLOR_TO_TOKEN[colorMap[status]] ?? FALLBACK)
    : (STATUS_MAP[status] ?? FALLBACK)
  const text = labelMap?.[status] ?? label ?? def.label ?? status
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap',
      def.className,
      className,
    )}>
      {text}
    </span>
  )
}
