// Số tiền → chữ (VND)
export function amountToWords(amount: number): string {
  // TODO: implement
  return `${amount.toLocaleString('vi-VN')} đồng`
}

// Tính expired_at từ valid_days
export function calcExpiredAt(validDays: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + validDays)
  return d
}

// Pagination helper
export function paginate(page = 1, limit = 20) {
  return { limit, offset: (page - 1) * limit }
}
