# Workflow: Quotation — Báo giá

## Trạng thái

```
Draft ──► Confirmed ──► Expired (tự động khi quá hạn)
  ▲           │
  │ unconfirm └──► Cancelled (thủ công)
  └───────────
```

## Các bước chi tiết

### 1. Tạo Quotation (Draft)
- Quyền: `quotation.create`
- Dữ liệu bắt buộc:
  - `company_id`, `warehouse_id`, `valid_days`
  - `sections[]` → `line_items[]`: `variant_id` hoặc `bundle_id`, `quantity`, `unit_price`
- Tuỳ chọn: `contact_id`, `project_name`, `delivery_location`, `discount`, `terms`
- Các field tính tự động:
  ```
  line_total    = quantity × unit_price
  vat_amount    = line_total × (vat_percent / 100)
  subtotal      = SUM(line_total + vat_amount)
  vat_total     = SUM(vat_amount)
  grand_total   = subtotal + vat_total - discount
  expired_at    = created_at + valid_days (ngày)
  ```
- `is_reserved`:
  - Mặc định `true` cho storable/consumable
  - Luôn `false` cho service (không giữ chỗ tồn kho)
  - Dòng mô tả tự do (không variant/bundle) → `false`
  - User có thể bỏ tick nếu không muốn giữ chỗ

### 2. Sửa Quotation (chỉ khi Draft)
- Quyền: `quotation.edit`
- Sửa được: toàn bộ header và sections/lines
- Nếu đã Confirm → phải Unconfirm trước

### 3. Confirm (Draft → Confirmed)
- Quyền: `quotation.confirm`
- Kết quả:
  - `status = 'confirmed'`
  - Tạo `reserved_items` cho các dòng `is_reserved = true`:
    - `inventory.qty_reserved += quantity`
  - Bundle → expand thành sản phẩm con rồi reserved từng cái
  - Service → không reserved

### 4. Unconfirm (Confirmed → Draft)
- Quyền: `quotation.confirm`
- **Chặn** nếu đã có DO liên quan (`exported_qty > 0` hoặc `pending_qty > 0`)
- Kết quả: `status = 'draft'`, giải phóng toàn bộ `reserved_items` của Quotation này

### 5. Cancel (Confirmed → Cancelled)
- Người được phép: `quotation.confirm`
- Kết quả: `status = 'cancelled'`, giải phóng toàn bộ reserved

### 6. Expired (tự động)
- Background job chạy khi `now() > expired_at` và `status = 'confirmed'`
- Kết quả: `status = 'expired'`, giải phóng toàn bộ reserved

## Tạo Delivery Order từ Quotation

- Quotation phải `status = 'confirmed'`
- Từng dòng DO tham chiếu `quotation_line_item_id`, `quantity ≤ remaining_qty`
- Validate:
  ```
  committed_qty = SUM(DO status IN ('draft','completed') qty của dòng đó)
  remaining_qty = quotation_line.quantity - committed_qty
  ```
- `remaining_qty = 0` → không tạo thêm DO được

## Theo dõi tiến độ xuất hàng (per line)

```
exported_qty  = SUM(DO.status = 'completed' qty)
pending_qty   = SUM(DO.status = 'draft' qty)
remaining_qty = quotation_line.quantity - exported_qty - pending_qty
```

## Tính toán giá

| Field | Công thức |
|---|---|
| `line_total` | `quantity × unit_price` |
| `vat_amount` | `line_total × vat_percent / 100` |
| `section.subtotal` | `SUM(line_total + vat_amount)` |
| `quotation.subtotal` | `SUM(section.subtotal - vat trong section)` → tổng line_total |
| `quotation.vat_total` | `SUM(vat_amount)` tất cả lines |
| `quotation.grand_total` | `subtotal + vat_total - discount` |

## Xuất báo giá (Template)

- Admin upload Excel template với biến Carbone (`{d.customer_name}`,...)
- Map biến với DB field hoặc Bitrix field trong Settings
- Khi xuất: build JSON → Carbone điền → xuất `.xlsx` + `.pdf`
- 1 Quotation có thể có nhiều template (VN / EN)
