// Shim giữ API cũ (actionLabel/onAction/extra/level) nhưng delegate sang ui/PageHeader
// để tất cả trang đang import từ '../components/PageHeader' không cần sửa.
import { Button } from 'antd'
import { ReactNode } from 'react'
import { PageHeader as UIPageHeader } from './ui/PageHeader'

export function PageHeader({
  title,
  meta,
  actionLabel,
  onAction,
  extra,
  actions,
}: {
  title: ReactNode
  meta?: ReactNode
  level?: number        // không dùng nữa — ui/PageHeader không có level
  actionLabel?: string
  onAction?: () => void
  extra?: ReactNode     // hiển thị sau title, trước actions
  actions?: ReactNode
}) {
  const allActions = (
    <>
      {extra}
      {actions}
      {actionLabel && (
        <Button type="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </>
  )

  return <UIPageHeader title={title} meta={meta} actions={allActions} />
}
