import type { ReactNode } from 'react'

// StatCard — KPI card cho dashboard / report.
// Hỗ trợ icon, delta (thay đổi so với kỳ trước), và các loại số: integer, tiền tệ, ...

type IconColor = 'blue' | 'green' | 'amber' | 'purple' | 'red'

const ICON_COLORS: Record<IconColor, { bg: string; color: string }> = {
  blue:   { bg: 'var(--accent-bg)',      color: 'var(--accent)' },
  green:  { bg: 'var(--s-completed-bg)', color: 'var(--s-completed-color)' },
  amber:  { bg: 'var(--s-pending-bg)',   color: 'var(--s-pending-color)' },
  purple: { bg: 'var(--s-confirmed-bg)', color: 'var(--s-confirmed-color)' },
  red:    { bg: 'var(--s-cancelled-bg)', color: 'var(--s-cancelled-color)' },
}

interface Props {
  label: string
  value: ReactNode            // số hoặc formatted string
  sub?: ReactNode             // dòng phụ bên dưới value (VD: "+12 tháng này")
  deltaType?: 'up' | 'down' | 'neutral'  // màu của sub
  icon?: ReactNode            // icon SVG 18×18
  iconColor?: IconColor
  loading?: boolean
}

export function StatCard({ label, value, sub, deltaType = 'neutral', icon, iconColor = 'blue', loading }: Props) {
  const deltaColor =
    deltaType === 'up'   ? 'var(--s-completed-color)' :
    deltaType === 'down' ? 'var(--s-cancelled-color)' :
    'var(--text-3)'

  if (loading) {
    return (
      <div style={cardStyle}>
        <div style={{ background: 'var(--bg-hover)', borderRadius: 6, height: 13, width: '60%', marginBottom: 12 }} />
        <div style={{ background: 'var(--bg-hover)', borderRadius: 6, height: 30, width: '40%', marginBottom: 8 }} />
        <div style={{ background: 'var(--bg-hover)', borderRadius: 6, height: 13, width: '70%' }} />
      </div>
    )
  }

  return (
    <div style={cardStyle}>
      {icon && (
        <div
          style={{
            float: 'right',
            width: 36, height: 36,
            borderRadius: 'var(--r-md)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: ICON_COLORS[iconColor].bg,
            color: ICON_COLORS[iconColor].color,
            marginTop: -2,
          }}
        >
          {icon}
        </div>
      )}
      <div
        style={{
          fontSize: 'var(--font-md)',
          fontWeight: 600,
          color: 'var(--text-2)',
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 'var(--font-kpi)',
          fontWeight: 700,
          letterSpacing: '-0.5px',
          color: 'var(--text-1)',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1,
          marginBottom: sub ? 6 : 0,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 'var(--font-md)', color: deltaColor }}>
          {sub}
        </div>
      )}
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--r-lg)',
  padding: '16px 18px',
  boxShadow: 'var(--shadow-sm)',
  overflow: 'hidden',
}
