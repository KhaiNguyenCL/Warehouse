import { type ComponentType } from 'react'
import { MoreHorizontal, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

// PageActions — vùng nút hành động chuẩn cho header mọi trang, thiết kế để thêm nút mới về
// sau KHÔNG phá layout hàng trên cùng:
// - `primary`: 1 nút chính duy nhất, luôn hiện rõ (VD "Tạo mới").
// - `secondary`: nút phụ (export, import, đồng bộ...) gom vào 1 nút "···" — thêm bao nhiêu
//   nút phụ mới cũng chỉ là thêm 1 dòng trong dropdown, không đụng tới hàng nút.
// - `selection`: hành động hàng loạt (bulk) khi tick chọn nhiều dòng trong bảng/roster — khi
//   `selection.count > 0`, toàn bộ thanh đổi thành "N đã chọn" + action, THAY THẾ primary/
//   secondary (giống Gmail) — vì bulk action và page action là 2 loại khác nhau, không nên
//   trộn chung 1 hàng cố định.
export interface PageAction {
  label: string
  icon?: ComponentType<{ className?: string }>
  onClick: () => void
  variant?: 'default' | 'destructive'
  disabled?: boolean
}

export interface PageActionsProps {
  primary?: PageAction
  secondary?: PageAction[]
  selection?: {
    count: number
    actions: PageAction[]
    onClear: () => void
    label?: (count: number) => string
  }
}

export function PageActions({ primary, secondary, selection }: PageActionsProps) {
  if (selection && selection.count > 0) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent-bg)] px-3 py-2">
        <button
          onClick={selection.onClear}
          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-[var(--accent-text)] hover:bg-background/60"
          title="Bỏ chọn"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <span className="text-sm font-medium text-[var(--accent-text)]">
          {selection.label?.(selection.count) ?? `${selection.count} đã chọn`}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {selection.actions.map((a) => (
            <Button
              key={a.label}
              size="sm"
              variant={a.variant === 'destructive' ? 'destructive' : 'outline'}
              className={cn(a.variant !== 'destructive' && 'bg-card')}
              onClick={a.onClick}
              disabled={a.disabled}
            >
              {a.label}
            </Button>
          ))}
        </div>
      </div>
    )
  }

  if (!primary && !secondary?.length) return null

  return (
    <div className="flex items-center gap-2">
      {secondary && secondary.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon-sm" className="bg-card" title="Thao tác khác">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {secondary.map((a) => (
              <DropdownMenuItem
                key={a.label}
                onClick={a.onClick}
                disabled={a.disabled}
                className={a.variant === 'destructive' ? 'text-destructive focus:text-destructive' : ''}
              >
                {a.icon && <a.icon className="mr-2 h-4 w-4" />}
                {a.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {primary && (
        <Button size="sm" onClick={primary.onClick} disabled={primary.disabled}>
          {primary.label}
        </Button>
      )}
    </div>
  )
}
