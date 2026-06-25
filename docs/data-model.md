# Data model: PO / Lô nhập / Serial Number / Custom Field

Tóm tắt quan hệ giữa các bảng quanh PO → Receipt → Serial Number, và cơ chế Custom Field
(EAV) — đặc biệt phần field "rơi rớt" sang object khác (`applies_to_po_line`). Nguồn schema
chính thức: `backend/migrations/001_initial_schema.sql`.

## 1. PO → Lô nhập → Serial Number → Inventory

```
purchase_orders (1) ──< (n) purchase_order_lines
        │ company_id → companies                    │ variant_id → variants
        │ status: draft/confirmed/cancelled          │ unit_price, warranty_months
        │                                             │   (bản sao ĐỘC LẬP từ variant —
        │                                             │    sửa variant sau đó không ảnh
        │                                             │    hưởng dòng PO đã tạo)
        │ (tuỳ chọn — nullable)                       │ (tuỳ chọn — nullable)
        ▼                                             ▼
receipts (n) ──────────────────────────────────> receipt_lines = "LÔ NHẬP"
   │ po_id → purchase_orders (nullable)              │ po_line_id → purchase_order_lines
   │ warehouse_id, status, completed_at               │   (nullable)
   │                                                   │ cost_price, warranty_months
   │                                                   │   (bản sao độc lập từ po_line)
   │                                                   │ qty_remaining
   │                                                   │   (= quantity lúc Receipt Complete,
   │                                                   │    Delivery FIFO trừ dần)
   │                                                   │
   │                                                   ▼ (chỉ product_type=storable)
   │                                            serial_numbers
   │                                              │ receipt_line_id → receipt_lines (nullable)
   │                                              │ delivery_line_id → delivery_order_lines
   │                                              │   (nullable, set lúc xuất kho)
   │                                              │ warehouse_id (NULL khi sold/disposed)
   │                                              │ status: active / sold / disposed
   ▼
inventory (UNIQUE variant_id + warehouse_id)
   qty_on_hand / qty_reserved / avg_cost — TỔNG HỢP, không lưu theo lô
```

**Quan trọng:** `po_id`, `po_line_id`, `receipt_line_id` đều **nullable** — không phải mọi
SN truy được về PO (VD: nhập qua `adjustment` thì không có lô/PO nào). Mọi query đọc theo
chuỗi này phải dùng `leftJoin`, không dùng `join` (xem `inventory.repository.ts::findLots()`).

Tra cứu thực tế (đã có sẵn trong code):
- 1 lô (`receipt_line_id`) → danh sách SN: `GET /inventory/serials?receipt_line_id=`
- 1 SKU → breakdown từng lô (kèm PO nếu có): `GET /inventory/lots?variant_id=&warehouse_id=`
- 1 SN cụ thể → tra ngược không cần biết SKU/kho/lô: `GET /inventory/serials?search=`
- 1 SN → lịch sử di chuyển (nhập/xuất/chuyển): `GET /inventory/serials/:id/movements`
- **Chưa có:** tra trực tiếp "tất cả SN thuộc PO X" bằng 1 API call — phải đi qua Receipt
  trước (xem phần "Gaps" cuối file).

## 2. Custom Field (EAV) — `custom_fields` + `field_values`

```
custom_fields                              field_values
  id                                          field_id → custom_fields.id (FK thật)
  object_type   (CHECK constraint:            object_type  (TEXT THƯỜNG — KHÔNG có FK,
    quotation/receipt/delivery_order/           KHÔNG có CHECK constraint, KHÔNG bắt buộc
    product/variant/company)                    khớp với custom_fields.object_type)
  field_name, field_label, field_type          object_id    (KHÔNG có FK thật — app tự
  options (JSONB, dùng cho select)               validate object_id thuộc đúng bảng nào)
  applies_to_po_line (bool)                    value (TEXT)
```

**Quy tắc mặc định:** 1 field định nghĩa ở `custom_fields.object_type = X` thì giá trị của
nó PHẢI lưu ở `field_values.object_type = X`, `object_id` = id của đúng bảng đó (VD:
object_type='variant' → object_id = variants.id). Đây là cách dùng cho >90% trường hợp,
được enforce ở tầng service: `CustomFieldService.setValues()` ném 400 nếu
`field.object_type !== objectType` truyền vào.

**Trường hợp NGOẠI LỆ duy nhất hiện tại — `applies_to_po_line`:**

Field định nghĩa `object_type='variant'` nhưng có `applies_to_po_line=true` thì giá trị của
nó CÒN lưu thêm 1 bản dưới `object_type='purchase_order_line'`, `object_id` =
`purchase_order_lines.id` — đây là cơ chế "PO line lưu giá trị riêng, độc lập với SKU" (giống
`unit_price`). Việc này bypass check ở `CustomFieldService.setValues()` vì
`PurchaseOrderService.validateLineCustomFieldValues()` tự kiểm tra riêng (field phải
`object_type==='variant' && applies_to_po_line===true`) rồi ghi trực tiếp qua
`PurchaseOrderRepository.saveLineCustomFieldValues()` — KHÔNG đi qua endpoint
`PUT /custom-fields/values` chung.

Vì `field_values.object_type` không có constraint, về mặt kỹ thuật KHÔNG có gì ngăn việc thêm
một cơ chế tương tự cho object khác trong tương lai (VD: field SKU áp dụng riêng theo dòng
Quotation). **Mỗi khi thêm 1 cơ chế "cross-object" mới như vậy, PHẢI ghi lại ở đây** — nếu
không, sau vài tháng sẽ không ai nhớ field nào của SKU đang "rơi rớt" ở object nào.

### Cách kiểm tra (audit) field nào đang rơi rớt sang object khác

Cách nhanh nhất, không cần SQL: vào **Settings → Custom Field → chọn object_type "Variant
(SKU)"** — cột **"Sửa riêng theo PO"** = Có chính là field đang rơi rớt sang
`purchase_order_line`. Đây là nguồn sự thật duy nhất, vì đó là CHECK trước khi ghi giá trị
(`applies_to_po_line=false` thì không có cách nào tạo được `field_values` chéo object).

Muốn kiểm tra ở tầng dữ liệu thật (xem có field nào đã có giá trị thực tế nằm ngoài
object_type gốc của nó hay không), chạy SQL sau:

```sql
-- Liệt kê mọi field_values mà object_type KHÁC với object_type gốc của field —
-- hiện tại chỉ nên thấy field có applies_to_po_line=true xuất hiện dưới
-- object_type='purchase_order_line'. Nếu thấy object_type khác lạ xuất hiện ở đây mà
-- không phải case này → có bug hoặc có cơ chế cross-object mới chưa được ghi vào doc.
SELECT cf.field_name, cf.field_label, cf.object_type AS field_object_type,
       fv.object_type AS value_object_type, cf.applies_to_po_line, count(*) AS so_luong_value
FROM field_values fv
JOIN custom_fields cf ON cf.id = fv.field_id
WHERE fv.object_type <> cf.object_type
GROUP BY cf.field_name, cf.field_label, cf.object_type, fv.object_type, cf.applies_to_po_line
ORDER BY cf.field_name;
```

## 3. Gaps đã biết, chưa làm (ghi lại để không quên)

- Chưa có API/UI tra "tất cả SN thuộc PO X" trong 1 lần gọi — phải tự đi qua Receipt trước.
  Muốn làm: thêm `po_id`/`po_line_id` param cho `GET /inventory/serials`.
- `PurchaseOrderDetailPage` chưa hiện danh sách lô/receipt đã nhận cho từng dòng PO — chỉ có
  số liệu tổng hợp `received_qty/pending_qty/remaining_qty`.
