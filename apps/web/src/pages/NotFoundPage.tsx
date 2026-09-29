import { useNavigate } from 'react-router-dom'
import { SearchX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePageHeader } from '@/layout/PageHeaderSlot'

export default function NotFoundPage() {
  const navigate = useNavigate()

  usePageHeader(
    <h1 className="truncate text-sm font-semibold tracking-tight">Không tìm thấy trang</h1>,
  )

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-4 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <SearchX className="h-8 w-8" />
      </span>
      <div className="flex flex-col gap-1.5">
        <h2 className="text-lg font-semibold text-foreground">Không tìm thấy trang</h2>
        <p className="text-sm text-muted-foreground">
          Đường dẫn này không tồn tại hoặc đã bị xoá. Kiểm tra lại URL hoặc quay về trang chủ.
        </p>
      </div>
      <Button size="sm" onClick={() => navigate('/actions')}>Về trang chủ</Button>
    </div>
  )
}
