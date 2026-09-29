// Layout dùng chung cho 2 trang liền kề của cùng 1 nghiệp vụ SKU — VariantDetailPage (xem/sửa)
// và VariantCreatePage (tạo mới) — để không lặp lại định nghĩa và luôn nhìn giống hệt nhau.
// Trước đây mỗi trang tự định nghĩa 1 bản riêng (số px khác nhau do VariantCreatePage không
// bọc trong .theme-2a nên var(--t2-*) không resolve được) — giờ export đúng 1 bộ, dùng biến
// --t2-* của tokens.css (chỉ resolve trong .theme-2a), nơi gọi PHẢI bọc root trong className
// "theme-2a" (xem VariantDetailPage.tsx/VariantCreatePage.tsx).

export function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-lg)',
      boxShadow: 'var(--shadow-sm)',
      overflow: 'hidden',
    }}>
      <div style={{ padding: '8px 14px', background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)', fontSize: 'var(--t2-body)', fontWeight: 700, color: 'var(--text-1)' }}>
        {title}
      </div>
      <div style={{ padding: 12 }}>{children}</div>
    </div>
  )
}

export const labelStyle: React.CSSProperties = {
  fontSize: 'var(--t2-label)',
  color: 'var(--text-2)',
  fontWeight: 600,
  marginBottom: 2,
}

export const valueStyle: React.CSSProperties = {
  fontSize: 'var(--t2-body)',
  color: 'var(--text-1)',
  minHeight: 28,
  display: 'flex',
  alignItems: 'center',
}

// Field — mặc định label bên trái + input bên phải trên cùng 1 hàng (gọn hơn label-trên-
// input-dưới); field full-width nhiều dòng (mô tả dài) dùng `stacked` để giữ label phía trên.
export function Field({ label, children, full, stacked }: { label: string; children: React.ReactNode; full?: boolean; stacked?: boolean }) {
  if (stacked) {
    return (
      <div style={full ? { gridColumn: '1 / -1' } : undefined}>
        <div style={labelStyle}>{label}</div>
        {children}
      </div>
    )
  }
  return (
    <div style={{ ...(full ? { gridColumn: '1 / -1' } : undefined), display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 130, flexShrink: 0, fontSize: 'var(--t2-label)', color: 'var(--text-2)', fontWeight: 600 }}>{label}</div>
      <div style={{ ...valueStyle, flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  )
}

export function Val({ v }: { v?: React.ReactNode }) {
  return v != null && v !== '' ? <>{v}</> : <span style={{ color: 'var(--text-3)' }}>—</span>
}

// GroupRow — nhãn nhóm bên trái + field bên phải, theo đúng layout mockup "chi tiết SKU 1B"
// (MỖI NHÓM nghiệp vụ là 1 hàng ngang, nhãn nhóm không lặp lại cho từng field mà chỉ hiện
// 1 lần bên trái, xuyên suốt chiều cao của nhóm).
export function GroupRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 16, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ width: 120, flexShrink: 0, fontSize: 'var(--t2-strong)', fontWeight: 600, color: 'var(--text-1)', fontFamily: 'var(--font-display)' }}>
        {label}
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {children}
      </div>
    </div>
  )
}
