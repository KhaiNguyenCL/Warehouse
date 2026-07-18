/**
 * Độ rộng chuẩn cho các loại input field.
 * Dùng thống nhất ở mọi nơi để field có cùng data type luôn có cùng kích thước,
 * tránh field chứa text dài bị cắt cụt.
 *
 * Cách dùng:
 *   import { fw } from '@/styles/fieldWidths'
 *   <Select style={{ width: fw.company }} ... />
 *   <Input  style={{ width: fw.sku }}     ... />
 */
export const fw = {
  // ── Entity pickers ──────────────────────────────────
  company:  400,   // Tên công ty / KH / NCC
  product:  280,   // Tên sản phẩm
  sku:      300,   // Mã SKU + tên variant
  warehouse: 200,  // Tên kho

  // ── Số & tiền ────────────────────────────────────────
  price:    160,   // Giá tiền
  quantity:  90,   // Số lượng
  percent:   80,   // % VAT, discount

  // ── Văn bản ngắn ─────────────────────────────────────
  code:     160,   // Mã sản phẩm, mã hàng
  unit:     110,   // Đơn vị tính
  currency:  90,   // VND / USD
  month:     90,   // Số tháng bảo hành

  // ── Văn bản dài ──────────────────────────────────────
  name:     320,   // Tên đầy đủ
  note:     400,   // Ghi chú
} as const
