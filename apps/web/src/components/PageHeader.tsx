// Header lặp lại ở đầu mọi trang list: tiêu đề bên trái + nút hành động chính bên phải.
// Dùng Typography.Title (không phải <h2> thuần) để đồng nhất với các trang detail đã
// dùng Typography.Title từ trước (ReceiptDetailPage/ProductDetailPage) — antd tự style
// theo level, không lệ thuộc font-size mặc định của browser cho từng cấp thẻ heading.
import { Button, Typography } from 'antd'
import { ReactNode } from 'react'

export function PageHeader({
  title,
  level = 3,
  actionLabel,
  onAction,
  extra,
}: {
  title: ReactNode
  level?: 1 | 2 | 3 | 4 | 5
  actionLabel?: string
  onAction?: () => void
  extra?: ReactNode
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Typography.Title level={level} style={{ margin: 0 }}>
          {title}
        </Typography.Title>
        {extra}
      </div>
      {actionLabel && (
        <Button type="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
