import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Dùng cho Ant Design InputNumber — hiển thị dấu phẩy phân cách hàng nghìn
export const moneyProps = {
  controls: false,
  precision: 0,
  style: { width: '100%' },
  formatter: (v: any) => (v != null && v !== '' ? String(Math.round(Number(v))).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''),
  parser:    (v: any) => (v ? Number(String(v).replace(/,/g, '')) : ('' as any)),
}
