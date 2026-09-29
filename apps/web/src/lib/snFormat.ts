// Helper dùng chung cho mọi nơi hiển thị Serial Number (InventoryPage tab "Theo SKU"/"Hàng
// đã bán", InventorySerialsPage, SnDetailSheet) — tách ra 1 chỗ để không lệch format ngày/
// phiếu nhập giữa các trang.
export const REF_DOCUMENT_PATH: Record<string, string> = {
  receipt: '/receipts',
  delivery_order: '/deliveries',
  transfer_order: '/transfers',
}
export const REF_DOCUMENT_LABEL: Record<string, string> = {
  receipt: 'Phiếu nhập',
  delivery_order: 'Phiếu xuất',
  transfer_order: 'Phiếu chuyển',
}

export function fmt(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('vi-VN')
}

export function fmtReceipt(code: string | null, completedAt: string | null) {
  if (!code) return '—'
  if (!completedAt) return code
  return `${code} · ${fmt(completedAt)}`
}
