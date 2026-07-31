import type { ReactNode } from 'react'

interface Props {
  title?: string
  count?: number
  toolbar?: ReactNode
  actions?: ReactNode
  children: ReactNode
}

export function TableCard({ title, count, toolbar, actions, children }: Props) {
  const hasToolbar = title || count != null || toolbar || actions

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-lg)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
      }}
    >
      {hasToolbar && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 16px',
            borderBottom: '1px solid var(--border)',
            flexWrap: 'wrap',
          }}
        >
          {title && (
            <span style={{ fontSize: 'var(--font-lg)', fontWeight: 700, color: 'var(--text-1)' }}>
              {title}
            </span>
          )}
          {count != null && (
            <span
              style={{
                fontSize: 'var(--font-md)',
                fontWeight: 500,
                background: 'var(--bg-subtle)',
                color: 'var(--text-2)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '1px 8px',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {count.toLocaleString('vi-VN')}
            </span>
          )}
          {toolbar && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {toolbar}
            </div>
          )}
          {actions && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
              {actions}
            </div>
          )}
        </div>
      )}
      <div style={{ overflowX: 'auto' }}>{children}</div>
    </div>
  )
}

// ── FilterChip ────────────────────────────────────────────
interface FilterChipProps {
  label: ReactNode
  active?: boolean
  onClick?: () => void
}

export function FilterChip({ label, active, onClick }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: 0,
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        borderRadius: 13,
        outline: active ? '2px solid var(--accent)' : '2px solid transparent',
        outlineOffset: 2,
        transition: 'outline 0.12s',
        opacity: active ? 1 : 0.65,
      }}
    >
      {label}
    </button>
  )
}
