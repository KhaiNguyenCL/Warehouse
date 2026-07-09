# Tồn kho & Serial Number

## Công thức tồn kho

```
qty_available = qty_on_hand - qty_reserved
```

| Field | Khi thay đổi |
|---|---|
| `qty_on_hand` | Receipt Complete (+), Delivery Complete (-), Transfer Complete (+/-) |
| `qty_reserved` | Quotation Confirm (+), Quotation Cancel/Expire (-), Delivery Complete (-) |
| `avg_cost` | Receipt Complete (weighted average), Transfer Complete kho đích |

## Vòng đời Serial Number (storable)

```
                ┌─────────────────────────────────────┐
                │           Receipt Complete           │
                │  serial_no, variant_id, warehouse_id │
                │  status = 'active'                   │
                └──────────────┬──────────────────────┘
                               │
          ┌────────────────────┼───────────────────────────┐
          │                    │                           │
   DO sale/internal     DO demo_out                DO warranty_out
   status=sold          status=active              status=active
   warehouse=null       warehouse=WH-DEMO          warehouse=WH-BH
                               │                           │
                        Transfer demo_in           Transfer warranty_in
                        warehouse=kho vật lý       warehouse=kho vật lý
                        (về active)                (về active)
          │
   DO return_out → HARD DELETE khỏi DB
   DO dispose   → status=disposed, warehouse=null
```

## Trạng thái Serial

| Status | warehouse_id | Ý nghĩa |
|---|---|---|
| `active` | ID kho | Đang trong hệ thống, vị trí xác định qua `warehouse_id` |
| `sold` | null | Đã bán / xuất nội bộ |
| `disposed` | null | Đã huỷ |
| (hard delete) | — | `return_out` — đã trả về NCC, xoá hoàn toàn |

## Lô hàng (Receipt Line = Lô)

Không có bảng `stock_batches` riêng — **mỗi `receipt_line` chính là 1 lô nhập**:
- `cost_price`: giá vốn của lô
- `manufacturer_warranty_months`: BH hãng theo lô
- `customer_warranty_months`: BH công ty theo lô
- `qty_remaining`: còn lại trong lô, bị FIFO trừ dần khi xuất consumable

### FIFO order (chuẩn, áp dụng nhất quán mọi nơi)
```
receipts.completed_at ASC, receipt_lines.line_order ASC
```

## Bảo hành

### BH hãng (`manufacturer_warranty_end`) — tính lúc Receipt Complete
```
manufacturer_warranty_end =
  (manufacturer_warranty_start ?? completed_at) + manufacturer_warranty_months
```
- `manufacturer_warranty_start` = null → dùng `completed_at` (ngày nhập kho)
- `manufacturer_warranty_months = 0` → tường minh "không bảo hành" (khác null)
- Lưu trong `serial_numbers.manufacturer_warranty_end` (TIMESTAMPTZ)

### BH công ty (`customer_warranty_end`) — tính lúc Delivery Complete
```
customer_warranty_end =
  (customer_warranty_start ?? delivery.completed_at) + customer_warranty_months
```
- `customer_warranty_start` nhập trên dòng DO (ngày bàn giao thực tế)
- `customer_warranty_months` lấy từ `receipt_line` của đúng lô mà serial đó thuộc về
- Lưu trong `serial_numbers.customer_warranty_end` (TIMESTAMPTZ)

## reserved_items

| Sự kiện | Thay đổi |
|---|---|
| Quotation Confirmed | Tạo `reserved_items`, `inventory.qty_reserved += qty` |
| DO tạo từ Quotation | Transfer reserved từ Quotation sang DO (trong `reserved_items`) |
| DO Completed | `inventory.qty_reserved -= qty`, `inventory.qty_on_hand -= qty`, xoá reserved |
| Quotation Cancelled/Expired | Xoá toàn bộ reserved, `inventory.qty_reserved -= qty` |

## stock_movements

Mỗi lần Receipt/Delivery/Transfer Complete → tạo dòng `stock_movements`:
- `movement_type`: `in` / `out`
- `quantity`: 1 mỗi serial (storable), hoặc tổng (consumable)
- `serial_id`: gắn đúng SN (storable), null (consumable)
- `unit_cost`: `avg_cost` tại thời điểm giao dịch (dùng tính COGS)
- `ref_document_type` + `ref_document_id`: trỏ về phiếu gốc
