import type { ReactNode } from 'react'

// PageHeader — header chuẩn của mọi trang list và trang detail.
// Cấu trúc: [title + meta] ......... [actions]
// meta = dòng phụ nhỏ bên dưới title (VD: "Cập nhật 2 phút trước", "3 phiếu chờ duyệt").

interface Props {
  title: ReactNode
  meta?: ReactNode       // dòng phụ bên dưới title
  actions?: ReactNode    // nút bấm bên phải
}

export function PageHeader({ title, meta, actions }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1
          style={{
            margin: 0,
            fontSize: 'var(--font-xl)',
            fontWeight: 700,
            letterSpacing: '-0.5px',
            color: 'var(--text-1)',
            lineHeight: 1.25,
            textWrap: 'balance',
          } as React.CSSProperties}
        >
          {title}
        </h1>
        {meta && (
          <p
            style={{
              margin: '3px 0 0',
              fontSize: 'var(--font-base)',
              color: 'var(--text-2)',
              fontWeight: 400,
            }}
          >
            {meta}
          </p>
        )}
      </div>
      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {actions}
        </div>
      )}
    </div>
  )
}
