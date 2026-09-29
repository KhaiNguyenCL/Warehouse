import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

// SectionCard — khối card chuẩn cho từng phần trong detail panel (master-detail layout):
// header có tiêu đề + action tuỳ chọn, body padding cố định. Dùng cho mọi trang chi tiết
// đi kèm layout master-detail (roster trái + panel phải) — xem CLAUDE.md mục UI Standards.
// `className` là override tuỳ chọn (KHÔNG đổi mặc định) — dùng khi thử nghiệm 1 style khác
// (VD bớt bo góc/bỏ shadow) chỉ trên 1 trang, không ảnh hưởng các trang khác đang dùng.
export function SectionCard({
  title, children, actions, className,
}: { title: string; children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={cn('overflow-hidden rounded-2xl border border-border bg-card shadow-md', className)}>
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
        {actions}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

// InfoRow — cặp label/value chuẩn trong SectionCard, xếp lưới 2 cột (full=true để chiếm
// trọn hàng, dùng cho field dài như địa chỉ/ghi chú).
// Label nhạt màu + weight thường, value đậm hơn hẳn — trước đây cả 2 đều font-semibold nên
// nhìn không phân biệt được label với giá trị thật, đổi lại để value luôn là phần nổi bật.
export function InfoRow({ label, value, full }: { label: string; value?: string | null; full?: boolean }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium text-foreground">{value || '—'}</div>
    </div>
  )
}
