export type WmsStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'completed'
  | 'cancelled'
  | 'confirmed'
  | 'in_progress'
  | 'expired'

interface StatusDef {
  label: string
  color: string
  bg: string
}

const STATUS_MAP: Record<WmsStatus, StatusDef> = {
  draft:            { label: 'Nháp',            color: 'var(--s-draft-color)',     bg: 'var(--s-draft-bg)' },
  pending_approval: { label: 'Chờ duyệt',       color: 'var(--s-pending-color)',   bg: 'var(--s-pending-bg)' },
  approved:         { label: 'Đã duyệt',         color: 'var(--s-approved-color)',  bg: 'var(--s-approved-bg)' },
  completed:        { label: 'Hoàn thành',       color: 'var(--s-completed-color)', bg: 'var(--s-completed-bg)' },
  cancelled:        { label: 'Đã hủy',           color: 'var(--s-cancelled-color)', bg: 'var(--s-cancelled-bg)' },
  confirmed:        { label: 'Đã xác nhận',      color: 'var(--s-confirmed-color)', bg: 'var(--s-confirmed-bg)' },
  in_progress:      { label: 'Đang thực hiện',   color: 'var(--s-approved-color)',  bg: 'var(--s-approved-bg)' },
  expired:          { label: 'Hết hạn',          color: 'var(--s-expired-color)',   bg: 'var(--s-expired-bg)' },
}

const FALLBACK: StatusDef = { label: 'Không rõ', color: 'var(--s-draft-color)', bg: 'var(--s-draft-bg)' }

interface Props {
  status: string
  label?: string
}

export function StatusBadge({ status, label }: Props) {
  const def = STATUS_MAP[status as WmsStatus] ?? FALLBACK
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        height: 26,
        padding: '0 10px',
        borderRadius: 13,
        fontSize: 'var(--font-md)',
        fontWeight: 600,
        whiteSpace: 'nowrap',
        color: def.color,
        background: def.bg,
        lineHeight: 1,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: 'currentColor',
          flexShrink: 0,
        }}
      />
      {label ?? def.label}
    </span>
  )
}
