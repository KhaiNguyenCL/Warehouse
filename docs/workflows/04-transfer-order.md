# Workflow: Transfer Order — Phiếu chuyển kho

## Trạng thái

```
Draft ──► Completed
  │
  └──► Cancelled
```

> Workflow đã đơn giản hoá: **không có bước Submit / Approve**.

## Các bước chi tiết

### 1. Tạo Transfer Order (Draft)
- Người dùng: **Manager**, **Admin** (quyền `transfer.create`)
- Từ màn hình tạo có 2 lựa chọn:
  - **"Lưu nháp"** → ở lại trang danh sách
  - **"Tạo & Complete"** → chuyển thẳng vào trang chi tiết để Complete
- Dữ liệu bắt buộc:
  - `transfer_type`: xem bảng bên dưới
  - `to_warehouse_id`: kho đích
  - `lines[]`: `variant_id`, `quantity`
  - `from_warehouse_id`: **chỉ cần với `transfer_type = 'transfer'`** — các type khác tự suy

#### Tự suy `from_warehouse_id`
| transfer_type | from_warehouse_id tự suy |
|---|---|
| `warranty_in` | Kho ảo `WH-BH` |
| `demo_in` | Kho ảo `WH-DEMO` |
| `qc_pass` | Kho ảo `WH-QC` |
| `sn_ready` | Kho ảo `WH-SN` |
| `transfer` | **Bắt buộc client truyền lên** |

> Nếu client gửi `from_warehouse_id` cho 4 type kho ảo → bị **bỏ qua**, luôn dùng kho ảo đúng.

#### Validate khi tạo
- `from_warehouse_id ≠ to_warehouse_id` (DB CHECK constraint + app validation)
- `transfer_type = 'transfer'` mà thiếu `from_warehouse_id` → 400

### 2. Sửa Transfer Order (chỉ khi Draft)
- Sửa được: `note` và field header
- **Không sửa được**: `transfer_type`, `from_warehouse_id`, `to_warehouse_id`, danh sách lines

### 3. Complete (Draft → Completed)
- Quyền: `transfer.complete`
- Dữ liệu kèm theo (với storable):
  - `lines[{ line_id, serials[] }]` — serial phải ở kho nguồn, đúng variant, `status = 'active'`
  - Serial count phải khớp `quantity`
- Validate trước transaction:
  - `inventory.qty_on_hand (kho nguồn) ≥ quantity` mỗi dòng
  - Từng serial phải thuộc đúng `variant_id`, đang `status = 'active'`, đang ở đúng `from_warehouse_id`
- Kết quả sau Complete:
  - Kho nguồn: `qty_on_hand -= quantity`
  - Kho đích: `qty_on_hand += quantity`, `avg_cost` cập nhật weighted average từ `avg_cost` kho nguồn
  - Storable: `serial_numbers.warehouse_id` đổi sang `to_warehouse_id` (status giữ `active`)
  - `stock_movements`: 2 cặp dòng per serial — `out` (kho nguồn) + `in` (kho đích), mỗi dòng `quantity = 1`
  - FIFO trừ `receipt_lines.qty_remaining` ở kho nguồn

### 4. Cancel (Draft → Cancelled)
- Người được phép: **người tạo** HOẶC người có `transfer.approve`
- **Chặn** nếu status đã `completed` hoặc `cancelled`

## Các loại chuyển kho (transfer_type)

| transfer_type | Mô tả | from | to |
|---|---|---|---|
| `transfer` | Chuyển kho thông thường | Kho vật lý (client chọn) | Kho vật lý |
| `warranty_in` | Nhận lại sau bảo hành | `WH-BH` (kho ảo Bảo hành) | Kho vật lý |
| `demo_in` | Nhận lại sau demo | `WH-DEMO` (kho ảo Demo) | Kho vật lý |
| `qc_pass` | Hàng qua QC đạt | `WH-QC` (kho ảo Chờ QC) | Kho vật lý |
| `sn_ready` | Đã nhập SN xong | `WH-SN` (kho ảo Chờ nhập SN) | Kho vật lý |

## avg_cost kho đích

```
avg_cost_mới = (existing_qty * existing_avg + transferred_qty * source_avg_cost)
               / (existing_qty + transferred_qty)
```

Nếu kho đích chưa có inventory → tạo mới với `avg_cost = avg_cost kho nguồn`.
