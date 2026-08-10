import type { CSSProperties, ReactNode } from 'react'

// ── SectionCard ───────────────────────────────────────────────
export function SectionCard({
  title, extra, children, padding,
}: {
  title: string
  extra?: ReactNode
  children: ReactNode
  padding?: number | string
}) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-md)',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '8px 14px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', letterSpacing: '0.1px' }}>{title}</span>
        {extra}
      </div>
      <div style={{ padding: padding ?? '10px 14px' }}>{children}</div>
    </div>
  )
}

// ── Field ─────────────────────────────────────────────────────
// Horizontal layout: label (right-align, fixed width) | value (flex)
// Tiết kiệm 50% chiều cao so với label-on-top.

const LABEL_W = 110  // px — đủ cho label ~15 ký tự tiếng Việt

const labelStyle: CSSProperties = {
  width: LABEL_W,
  flexShrink: 0,
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--text-2)',
  textAlign: 'right',
  paddingRight: 10,
  lineHeight: 1.4,
}

export function Field({
  label, children, span, labelWidth, alignStart,
}: {
  label: string
  children: ReactNode
  span?: number
  labelWidth?: number
  alignStart?: boolean   // dùng khi children là TextArea / nội dung nhiều dòng
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: alignStart ? 'flex-start' : 'center',
      minHeight: 30,
      ...(span ? { gridColumn: `span ${span}` } : undefined),
    }}>
      <div style={{
        ...(labelWidth ? { ...labelStyle, width: labelWidth } : labelStyle),
        ...(alignStart ? { paddingTop: 7 } : undefined),
      }}>
        {label}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  )
}

// ── Val ───────────────────────────────────────────────────────
// Read-mode value: plain text, không cần background vì horizontal layout
// đã phân biệt rõ label ↔ value.
// Edit mode: AntD Input (có border) → contrast tự nhiên.
export function Val({ v }: { v?: ReactNode }) {
  const empty = v == null || v === ''
  return (
    <span style={{
      fontSize: 14,
      fontWeight: empty ? 400 : 500,
      color: empty ? 'var(--text-3)' : 'var(--text-1)',
    }}>
      {empty ? '—' : v}
    </span>
  )
}
