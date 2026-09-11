import type { ReactNode } from 'react'

// SectionCard — khối card chuẩn cho từng phần trong detail panel (master-detail layout):
// header có tiêu đề + action tuỳ chọn, body padding cố định. Dùng cho mọi trang chi tiết
// đi kèm layout master-detail (roster trái + panel phải) — xem CLAUDE.md mục UI Standards.
export function SectionCard({
  title, children, actions,
}: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border-md bg-background shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-serif text-sm font-semibold text-foreground">{title}</h2>
        {actions}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

// InfoRow — cặp label/value chuẩn trong SectionCard, xếp lưới 2 cột (full=true để chiếm
// trọn hàng, dùng cho field dài như địa chỉ/ghi chú).
export function InfoRow({ label, value, full }: { label: string; value?: string | null; full?: boolean }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <div className="text-xs font-semibold text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm text-foreground">{value || '—'}</div>
    </div>
  )
}
