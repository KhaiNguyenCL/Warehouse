# Workflow: Receipt — Phiếu nhập kho

## Trạng thái

```
Draft ──► Completed
  │
  └──► Cancelled
```

> Workflow đã đơn giản hoá: **không có bước Submit / Approve**.

## Các bước chi tiết

### 1. Tạo Receipt (Draft)
- Người dùng: **Manager**, **Admin** (quyền `receipt.create`)
- Từ màn hình tạo có 2 lựa chọn:
  - **"Lưu nháp"** → tạo xong ở lại trang danh sách
  - **"Tạo & Complete"** → tạo xong chuyển thẳng vào trang chi tiết để Complete
- Dữ liệu bắt buộc:
  - `import_type`: `purchase` | `return_in` | `adjustment`
  - `warehouse_id`: kho nhập
  - `lines[]`: `variant_id`, `quantity`, `cost_price`
- Tuỳ chọn kèm PO:
  - `po_id`: PO phải đang `status = 'confirmed'`
  - `lines[].po_line_id`: phải thuộc đúng PO đó, `quantity ≤ remaining_qty`

#### Bảo hành (per line, tuỳ chọn)
| Field | Mô tả |
|---|---|
| `manufacturer_warranty_months` | Số tháng BH hãng (0 = tường minh "không BH") |
| `manufacturer_warranty_start` | Ngày bắt đầu tính BH hãng (null → dùng `completed_at`) |
| `customer_warranty_months` | Số tháng BH công ty (0 = tường minh "không BH") |

Trên form: mỗi field có **checkbox "Có"** — nếu bỏ tick thì gửi `null` (không bảo hành), nếu tick thì hiển thị input nhập tháng/ngày.

### 2. Sửa Receipt (chỉ khi Draft)
- Sửa được: `note`, `lines[].cost_price`, `lines[].manufacturer_warranty_months`, `lines[].customer_warranty_months`
- **Không sửa được**: `import_type`, `warehouse_id`, danh sách lines (thêm/xoá)

### 3. Complete Receipt (Draft → Completed)
- Quyền: `receipt.complete`
- Dữ liệu kèm theo:
  - Với **storable**: `lines[{ line_id, serials[] }]` — số lượng serial phải **khớp chính xác** `quantity`
  - Với **consumable**: `lines = []` — không cần serial
  - Với **mixed**: chỉ truyền lines có `product_type = 'storable'`
- Validate trước khi ghi:
  - Serial không được trùng với serial đã có trong hệ thống
  - Số serial phải đúng bằng `quantity`
- Kết quả sau Complete:
  - `status = 'completed'`, `completed_at` được ghi
  - Tạo `serial_numbers` (storable): `status = 'active'`, `warehouse_id = kho nhập`
  - `inventory.qty_on_hand += quantity`
  - `inventory.avg_cost` cập nhật theo weighted average:
    ```
    avg_cost_mới = (old_qty * old_avg + new_qty * new_cost) / (old_qty + new_qty)
    ```
  - `receipt_line.qty_remaining = quantity` (dùng cho FIFO khi xuất)
  - `stock_movements` (type = `in`) được tạo
  - Bảo hành storable:
    ```
    manufacturer_warranty_end = (manufacturer_warranty_start ?? completed_at) + warranty_months
    customer_warranty_end = null (tính sau khi xuất bán)
    ```

### 4. Cancel (Draft → Cancelled)
- Người được phép: **người tạo** HOẶC người có `receipt.approve`
- **Chặn** nếu status đã `completed` hoặc `cancelled`
- Không hoàn tác inventory — Receipt chưa Complete thì chưa ảnh hưởng tồn kho

## Các loại nhập kho (import_type)

| import_type | Mô tả | Bắt buộc |
|---|---|---|
| `purchase` | Mua hàng mới từ NCC | `company_id` (NCC) |
| `return_in` | Khách hàng trả lại (SN đã `sold`) | `company_id` (KH) |
| `adjustment` | Điều chỉnh tồn kho thừa (từ kiểm kê) | `ref_document_type = 'stocktake_result'` |

## Ràng buộc kỹ thuật

- Serial trùng → 400 ngay lập tức (unique constraint DB + app-level check)
- PO quantity lock: `FOR UPDATE` trên `purchase_orders` + `purchase_order_lines` trong cùng transaction tạo `receipt_lines`
- Race condition guard khi Complete: `UPDATE ... WHERE status='draft'` → nếu 0 rows affected → 409
