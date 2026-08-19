import type { ReactNode } from 'react'

interface Props {
  title?: string
  count?: number
  toolbar?: ReactNode   // search / filter inputs — left side
  actions?: ReactNode   // filter chips / toggles — right side
  children: ReactNode
}

export function TableCard({ title, count, toolbar, actions, children }: Props) {
  const hasToolbar = title || count != null || toolbar || actions

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid #e2e8f0',
        borderRadius: 'var(--r-lg)',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      {hasToolbar && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-subtle)',
          }}
        >
          {title && (
            <span style={{ fontSize: 'var(--font-md)', fontWeight: 700, color: 'var(--text-1)', flexShrink: 0 }}>
              {title}
            </span>
          )}
          {count != null && (
            <span
              style={{
                fontSize: 'var(--font-sm)',
                fontWeight: 500,
                background: 'var(--bg-card)',
                color: 'var(--text-2)',
                border: '1px solid var(--border)',
                borderRadius: 999,
                padding: '0 8px',
                lineHeight: '20px',
                fontVariantNumeric: 'tabular-nums',
                flexShrink: 0,
              }}
            >
              {count.toLocaleString('vi-VN')}
            </span>
          )}

          {/* Left: search / inputs */}
          {toolbar && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {toolbar}
            </div>
          )}

          {/* Right: filter chips / toggles */}
          {actions && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
              {actions}
            </div>
          )}
        </div>
      )}
      <div style={{ overflowX: 'auto' }}>{children}</div>
    </div>
  )
}

// ── FilterChip ────────────────────────────────────────────────────────────────
interface FilterChipProps {
  label: ReactNode
  count?: number        // hiện số lượng bên cạnh label khi active
  active?: boolean
  onClick?: () => void
}

export function FilterChip({ label, count, active, onClick }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        height: 26,
        padding: '0 10px',
        borderRadius: 999,
        border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
        background: active ? 'var(--accent-bg)' : 'var(--bg-card)',
        color: active ? 'var(--accent-text)' : 'var(--text-2)',
        fontWeight: active ? 600 : 400,
        fontSize: 'var(--font-sm)',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'border-color 0.12s, background 0.12s, color 0.12s',
        lineHeight: 1,
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)' }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
    >
      {label}
      {count != null && active && (
        <span
          style={{
            background: 'var(--accent)',
            color: '#fff',
            borderRadius: 999,
            padding: '0 5px',
            fontSize: 10,
            fontWeight: 700,
            lineHeight: '16px',
          }}
        >
          {count}
        </span>
      )}
    </button>
  )
}
