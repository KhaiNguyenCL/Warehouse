import { Drawer } from 'antd'
import type { ReactNode } from 'react'
import { StatusBadge } from './StatusBadge'
import type { WmsStatus } from './StatusBadge'

interface Props {
  open: boolean
  onClose: () => void
  label?: string
  title: ReactNode
  code?: string
  status?: string
  statusLabel?: string
  width?: number
  footer?: ReactNode
  children: ReactNode
}

export function SlideOver({
  open, onClose,
  label, title, code, status, statusLabel,
  width = 500,
  footer,
  children,
}: Props) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      placement="right"
      width={width}
      closable={false}
      styles={{
        body: { padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
        wrapper: { boxShadow: 'var(--shadow-lg)' },
      }}
      style={{ background: 'var(--bg-card)' }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          padding: '18px 20px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          {label && (
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--text-2)',
                marginBottom: 4,
              }}
            >
              {label}
            </div>
          )}
          <div
            style={{
              fontSize: 19,
              fontWeight: 700,
              letterSpacing: '-0.4px',
              color: 'var(--text-1)',
              lineHeight: 1.3,
              textWrap: 'balance',
            } as React.CSSProperties}
          >
            {title}
          </div>
          {code && (
            <div
              style={{
                marginTop: 4,
                fontFamily: 'var(--font-mono)',
                fontSize: 14,
                color: 'var(--accent)',
                fontWeight: 600,
              }}
            >
              {code}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {status && <StatusBadge status={status} label={statusLabel} />}
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30,
              borderRadius: 'var(--r-sm)',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-2)',
              transition: 'background 0.12s, color 0.12s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-1)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-2)' }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Body */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        {children}
      </div>

      {/* Footer */}
      {footer && (
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexShrink: 0,
            background: 'var(--bg-subtle)',
          }}
        >
          {footer}
        </div>
      )}
    </Drawer>
  )
}

// ── SlideOverSection ─────────────────────────────────────
// Tiêu đề section dùng màu text-1 (đen) để dễ đọc
export function SlideOverSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: 'var(--text-1)',
          marginBottom: 12,
          paddingBottom: 8,
          borderBottom: '1px solid var(--border)',
        }}
      >
        {title}
      </div>
      {children}
    </div>
  )
}

// ── InfoGrid ─────────────────────────────────────────────
export function InfoGrid({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      {children}
    </div>
  )
}

// ── InfoField ─────────────────────────────────────────────
export function InfoField({
  label,
  value,
  full = false,
}: {
  label: string
  value: ReactNode
  full?: boolean
}) {
  return (
    <div style={full ? { gridColumn: '1 / -1' } : {}}>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--text-2)',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 15, color: 'var(--text-1)', fontWeight: 500 }}>
        {value ?? <span style={{ color: 'var(--text-3)' }}>—</span>}
      </div>
    </div>
  )
}
