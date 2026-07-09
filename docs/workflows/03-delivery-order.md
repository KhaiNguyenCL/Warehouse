# Workflow: Delivery Order — Phiếu xuất kho

## Trạng thái

```
Draft ──► Completed
  │
  └──► Cancelled
```

> Workflow đã đơn giản hoá: **không có bước Submit / Approve**.

## Các bước chi tiết

### 1. Tạo Delivery Order (Draft)
- Người dùng: **Manager**, **Admin** (quyền `delivery.create`)
- Từ màn hình tạo có 2 lựa chọn:
  - **"Lưu nháp"** → ở lại trang danh sách
  - **"Tạo & Complete"** → chuyển thẳng vào trang chi tiết để Complete
- Dữ liệu bắt buộc:
  - `export_type`: xem bảng bên dưới
  - `warehouse_id`: kho xuất
  - `lines[]`: `variant_id`, `quantity`
- Tuỳ chọn kèm Quotation (chỉ với `export_type = 'sale'`):
  - `quotation_id`: Quotation phải đang `status = 'confirmed'`
  - `lines[].quotation_line_item_id`: `quantity ≤ remaining_qty` của dòng báo giá

#### Validate khi tạo
- `export_type = 'sale'` → bắt buộc `company_id` (khách hàng)
- `export_type = 'adjustment'` → bắt buộc `ref_document_type = 'stocktake_result'` + `ref_document_id` hợp lệ
- Các type cần `company_id`: `sale`, `demo_out`, `warranty_out`, `return_out` (xem `export_types` table trong Settings)

### 2. Sửa Delivery Order (chỉ khi Draft)
- Sửa được: `note`, `lines[].customer_warranty_start`, và các field header khác
- **Không sửa được**: `export_type`, `warehouse_id`, danh sách lines

### 3. Complete (Draft → Completed)
- Quyền: `delivery.complete`
- Dữ liệu kèm theo (với storable):
  - `lines[{ line_id, serials[] }]` — số serial phải **khớp chính xác** `quantity`
  - Ngoại trừ `export_type = 'adjustment'` → không cần serial
- Validate TRƯỚC transaction:
  - `inventory.qty_on_hand ≥ quantity` cho mỗi dòng
  - Serial phải `status = 'active'`, đúng `variant_id`, đúng `warehouse_id`
  - Serial count = quantity (trừ adjustment)
- Kết quả sau Complete:
  - `status = 'completed'`, `completed_at` được ghi
  - `inventory.qty_on_hand -= quantity` (avg_cost giữ nguyên)
  - `stock_movements` (type = `out`) được tạo, mỗi serial 1 dòng riêng
  - Serial transitions (xem bảng export_type bên dưới)
  - BH công ty tính trên serial: `customer_warranty_end = customer_warranty_start + customer_warranty_months`
  - FIFO trừ `receipt_lines.qty_remaining` (consumable) hoặc theo đúng lô của serial (storable)
  - Nếu có `quotation_line_item_id`: `inventory.qty_reserved -= quantity`, giải phóng `reserved_items`

### 4. Cancel (Draft → Cancelled)
- Người được phép: **người tạo** HOẶC người có `delivery.approve`
- **Chặn** nếu status đã `completed` hoặc `cancelled`
- Không hoàn tác inventory — DO chưa Complete thì chưa ảnh hưởng tồn kho

## Các loại xuất kho (export_type)

| export_type | company_id | Storable sau Complete | Consumable | Ghi chú |
|---|---|---|---|---|
| `sale` | KH bắt buộc | `status=sold`, `warehouse=null` | `qty -n` | Phải từ Quotation Confirmed |
| `internal` | Không cần | `status=sold`, `warehouse=null` | `qty -n` | Xuất nội bộ |
| `demo_out` | KH bắt buộc | `status=active`, `warehouse=WH-DEMO` | `qty -n` | Cho mượn demo |
| `warranty_out` | NCC tuỳ chọn | `status=active`, `warehouse=WH-BH` | `qty -n` | Gửi bảo hành |
| `return_out` | NCC bắt buộc | **Hard delete** khỏi DB | `qty -n` | Trả hàng về NCC |
| `dispose` | Không cần | `status=disposed`, `warehouse=null` | `qty -n` | Huỷ hàng hỏng |
| `adjustment` | Không cần | Không cần serial | `qty -n` | Điều chỉnh thiếu từ kiểm kê |

> Admin có thể thêm export_type tuỳ chỉnh trong Settings (với `parent_key` trỏ về 1 trong 7 type hệ thống trên).

## Quan hệ với Quotation

```
Quotation (Confirmed)
  └── remaining_qty = total_qty - exported_qty - pending_qty
         exported_qty = SUM(DO Completed qty)
         pending_qty  = SUM(DO Draft qty)

remaining_qty = 0 → không được tạo thêm DO từ Quotation này
```

## Bảo hành công ty (customer_warranty_end)

- Tính lúc DO Complete, trên từng serial
- `customer_warranty_start` = nhập trên dòng DO (ngày bàn giao thực tế) — null → dùng `completed_at`
- `customer_warranty_months` lấy từ `receipt_line` của đúng lô mà serial đó thuộc về (FIFO-aware)
- Ví dụ: serial nhập lô tháng 1 (BH cty 12 tháng), bán tháng 6 → BH cty hết tháng 6 năm sau
