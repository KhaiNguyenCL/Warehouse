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
/**
 * 3 mức maxWidth chuẩn cho field trong lưới "Field" (grid đồng đều 3-4 cột) của các trang
 * Detail/Form — dùng để chặn field có giá trị ngắn (số, select, ngày...) bị kéo giãn hết bề
 * rộng ô grid. KHÁC với `fw` bên dưới (dùng cho Select/Input full-width trong bảng/panel).
 *
 * Cách phân loại field vào 1 trong 3 mức — dựa vào ĐỘ DÀI GIÁ TRỊ THỰC TẾ, không phải tên field:
 *   - short  (~120px): số nhỏ, %, đơn vị tiền tệ, số tháng, số ngày — VD: "12", "VND", "36"
 *   - medium (~180px): tiền có phân cách hàng nghìn, ngày tháng, đơn vị tính, số lượng vừa —
 *     VD: "12,345,678", "31/12/2026", "Cái"
 *   - long   (~260px): mã/code/ID có thể dài — VD: Bitrix Deal ID, số chứng từ, model/part number
 * Field có giá trị KHÔNG giới hạn được (tên, mô tả, ghi chú, địa chỉ) — KHÔNG dùng tier nào,
 * để full 100% ô grid hoặc dùng prop `full` để chiếm trọn hàng.
 *
 * Cách dùng:
 *   import { fieldTier } from '@/styles/fieldWidths'
 *   <Select style={{ width: '100%', maxWidth: fieldTier.short }} ... />
 */
export const fieldTier = {
  short: 120,
  medium: 180,
  long: 260,
} as const

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
