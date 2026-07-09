# Workflow: Purchase Order (Đơn đặt hàng NCC)

## Trạng thái

```
Draft ──► Confirmed
  │           │
  └──────────►└──► Cancelled
```

## Các bước chi tiết

### 1. Tạo PO (Draft)
- Người dùng: **Warehouse**, **Manager**, **Admin**
- Quyền: `purchase_order.create`
- Dữ liệu bắt buộc:
  - `company_id` (NCC — bắt buộc)
  - `lines[]`: `variant_id`, `quantity`, `unit_price`
  - `lines[].manufacturer_warranty_months` (tuỳ chọn)
- Kết quả: PO được tạo với `status = 'draft'`, tự sinh `code = PO-YYYY-NNNN`

### 2. Confirm PO (Draft → Confirmed)
- Quyền: `purchase_order.confirm`
- Điều kiện: status phải là `draft`
- Kết quả: `status = 'confirmed'` — PO sẵn sàng để tạo Receipt

### 3. Unconfirm (Confirmed → Draft) — để sửa
- Quyền: `purchase_order.confirm`
- **Chặn** nếu đã có Receipt liên quan (`received_qty > 0` hoặc `pending_qty > 0`)
- Kết quả: về `draft`, có thể sửa lại header và lines

### 4. Sửa PO (chỉ khi Draft)
- Quyền: `purchase_order.edit`
- Sửa được: header (note, terms, delivery_date) và lines (thêm/sửa/xoá)
- Nếu PO đã Confirmed → phải Unconfirm trước

### 5. Cancel
- Người được phép: **người tạo PO** HOẶC người có `purchase_order.confirm`
- **Chặn** nếu đang Confirmed VÀ có Receipt liên quan
- `status = 'cancelled'` — không thể khôi phục

## Theo dõi tiến độ nhận hàng (per line)

```
received_qty  = SUM(receipt_line.quantity WHERE receipt.status = 'completed')
pending_qty   = SUM(receipt_line.quantity WHERE receipt.status = 'draft')
remaining_qty = po_line.quantity - received_qty - pending_qty
```

- `remaining_qty > 0` → còn có thể tạo thêm Receipt
- `remaining_qty = 0` → đã nhận đủ (không bị khoá tự động, chỉ là thông tin)

## Ràng buộc kỹ thuật

- Khi tạo Receipt link PO: validate `quantity ≤ remaining_qty` trong transaction với `FOR UPDATE` lock trên `purchase_orders` + `purchase_order_lines` — tránh race condition
- `remaining_qty` là computed field, **không lưu DB**
- PO không tự sang trạng thái "Completed" — tiến độ suy ra từ `remaining_qty = 0`
