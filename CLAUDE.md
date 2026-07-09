# CLAUDE.md — Warehouse Management System
## DNS Technology Invest Co., Ltd

> File này cung cấp context đầy đủ cho Claude agent khi làm việc với dự án này.
> Đọc toàn bộ file trước khi bắt đầu bất kỳ task nào.

---

## 1. Tổng quan dự án

**Tên hệ thống:** Warehouse Management System (WMS)
**Công ty:** DNS Technology Invest Co., Ltd
**Lĩnh vực:** Kinh doanh thiết bị công nghệ và linh kiện mạng (router, switch, access point, camera, cáp mạng,...) kết hợp dịch vụ thi công, lắp đặt, bảo trì hệ thống mạng.

**Vấn đề cần giải quyết:**
- Hiện tại không có hệ thống quản lý kho — nhập/xuất qua chat group
- Serial number lưu rải rác trong từng file dự án
- Không biết tồn kho thực tế tại bất kỳ thời điểm nào
- Báo giá làm thủ công trên Excel

**Mục tiêu:**
- Quản lý tồn kho tập trung, real-time
- Theo dõi serial number xuyên suốt vòng đời
- Số hóa quy trình báo giá, tích hợp Bitrix CRM
- Cung cấp báo cáo cho ban lãnh đạo

---

## 2. Tech Stack

| Layer | Công nghệ | Ghi chú |
|---|---|---|
| **Backend** | Node.js + **Fastify** | Nhanh hơn Express ~2x, JSON Schema validation built-in |
| **Frontend** | React + **Vite** | Vite thay CRA, build nhanh hơn |
| **Mobile** | **React Native + Expo** | Dùng chung logic với web, Expo Camera quét SN |
| **Database** | PostgreSQL 14+ | UUID PK, TIMESTAMPTZ, generated columns |
| **ORM/Query** | **Knex.js** | Query builder — không dùng Prisma (conflict với polymorphic refs) |
| **Template** | Carbone.io | Xuất báo giá Excel + PDF |
| **Language** | **TypeScript** | Xuyên suốt backend + frontend + mobile |
| **Monorepo** | pnpm workspaces | Shared types và validation schema |

**Frontend libraries:**

| Thư viện | Mục đích |
|---|---|
| TanStack Query | Server state, cache, auto-refetch |
| Zustand | UI state (thay Redux) |
| Ant Design | Component table/form nghiệp vụ |
| React Hook Form | Form phức tạp (quotation lines) |

---

## 3. Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────┐
│                   pnpm Monorepo                      │
│                                                      │
│  apps/web      apps/mobile     apps/backend          │
│  (React+Vite)  (RN+Expo)      (Fastify)              │
│       │              │              │                │
│       └──────────────┴──────────────┘                │
│                      │                               │
│              packages/types   ← shared TS interfaces │
│              packages/utils   ← shared validators    │
└─────────────────────────────────────────────────────┘
                        │
              REST API (Fastify)
                 │          │
            PostgreSQL    Bitrix REST API (read-only)
                              Carbone.io (file export)
```

**Kiến trúc backend: Modular Monolith**

```
backend/src/
├── modules/
│   ├── auth/           ← JWT, login, refresh token
│   ├── warehouse/      ┐
│   ├── inventory/      │ Core Layer — hoạt động độc lập
│   ├── receipt/        │
│   ├── purchaseorder/  │ (Receipt có thể link tới PO, không bắt buộc)
│   ├── delivery/       │
│   ├── transfer/       ┘
│   ├── quotation/      ┐
│   ├── company/        │ Business Layer — phụ thuộc Core
│   ├── stocktake/      │
│   ├── template/       │
│   ├── bitrix/         ┘
│   ├── product/
│   └── settings/
├── middleware/
│   ├── auth.ts         ← verify JWT
│   └── permission.ts   ← check RBAC permission key
└── plugins/
    ├── knex.ts         ← DB connection
    └── carbone.ts      ← template engine
```

Mỗi module tự chứa: `routes.ts` · `service.ts` · `repository.ts` · `schema.ts`

**Phân tầng theo client:**
- **Web:** Full tính năng tất cả module
- **Mobile:** Chỉ Core Layer — nhập/xuất kho, quét SN bằng Expo Camera

---

## 4. Phân loại sản phẩm (Product Type)

| Product Type | Kho | Serial Number | Mô tả |
|---|---|---|---|
| storable | Có | Bắt buộc | Thiết bị vật lý: switch, router, camera |
| consumable | Có | Không có | Vật tư tiêu hao: cáp, đầu nối, phụ kiện |
| service | Không | Không có | Dịch vụ: thi công, bảo hành, nhân công |
| bundle | Không trực tiếp | Theo sản phẩm con | Gói sản phẩm gồm nhiều sản phẩm con |

**Bundle rules:**
- Có SKU và giá riêng
- Hiển thị 1 dòng trên báo giá (tên bundle)
- Reserved theo từng sản phẩm con, không reserved theo bundle
- Khi xuất kho tách ra từng sản phẩm con + note bundle_id
- Không lồng bundle trong bundle

**Service rules:**
- Chỉ xuất hiện trên Quotation và Delivery Order để tính tiền
- Không ảnh hưởng tồn kho, không có reserved, không có SN

---

## 5. Category / Brand / Quy tắc đặt tên sản phẩm

**Thứ tự tạo bắt buộc:** Category và Brand phải tồn tại **trước khi** tạo Product — vì cả hai dùng để gợi ý mã sản phẩm.

| Bảng | Field liên quan | Ghi chú |
|---|---|---|
| `categories` | `short_code` (UNIQUE, nullable ở DB) | Viết tắt category, VD: `SW` (Switch) |
| `brands` | `short_code` (UNIQUE, nullable ở DB) | Viết tắt hãng, VD: `CSC` (Cisco) |
| `products` | `category_id`, `brand_id` (FK, nullable ở DB, **bắt buộc ở API schema**) | Xem nguyên tắc validate ở mục 19 |

**Quy tắc đặt tên (gợi ý ở client, KHÔNG enforce format ở backend — user luôn sửa được):**

```
Product.code = Category.short_code + "-" + Brand.short_code + "-" + [mã dòng sản phẩm]
Variant.sku  = Product.code + "-" + [field đặc thù]
```

- **"Mã dòng sản phẩm"** (free-text, optional, nhập ở ProductsPage khi tạo Product): phân biệt
  các dòng sản phẩm khác nhau của cùng 1 Category+Brand — VD: Cisco có nhiều dòng switch
  SG110/SG350, chỉ Category+Brand sẽ bị trùng mã.
- **"Field đặc thù"** (free-text, optional, nhập ở ProductDetailPage khi tạo Variant): phân
  biệt các SKU khác nhau của cùng 1 Product — VD: dung lượng RAM 8GB/16GB.
- Cả 2 tầng đều theo cùng pattern: `mã tầng trên + phần tự nhập để phân biệt`. Cả `code` và
  `sku` luôn là field text bình thường, có thể sửa tay sau khi gợi ý tự động điền.

---

## 6. Item Status (Serial Number)

Chỉ áp dụng cho **storable**. Vị trí xác định qua `warehouse_id`.

| Status | warehouse_id | Mô tả |
|---|---|---|
| active | ID kho | Đang trong hệ thống, xem warehouse_id để biết vị trí |
| sold | null | Đã bán / xuất nội bộ |
| disposed | null | Đã huỷ |
| (hard delete) | — | Khi return_out — xoá khỏi database |

`serial_numbers.warranty_end` = thời điểm Receipt Complete + `receipt_lines.warranty_months`
của đúng lô đó (không phải warranty_months mặc định của variant — xem mục 19).

---

## 7. Trạng thái các đối tượng

### Purchase Order (Đơn đặt hàng NCC)
```
Draft → Confirmed
     → Cancelled
```
- **3 trạng thái** — không có Expired/Completed (PO không tự hết hạn; "hoàn thành" được suy ra
  từ `remaining_qty = 0` của các dòng, không phải 1 status riêng)
- Confirmed → Draft (`unconfirm`) chỉ cho phép khi chưa có Receipt nào tham chiếu tới (xem
  `assertNoReceiptActivity` ở mục 19)
- Cancel: chỉ người tạo PO hoặc người có quyền `purchase_order.confirm`; nếu PO đang Confirmed
  thì áp dụng cùng điều kiện chặn như unconfirm
- Tiến độ theo dõi qua: `received_qty` (Receipt Completed), `pending_qty` (Receipt
  Draft/Pending Approval/Approved), `remaining_qty` (computed) — đối xứng với
  exported_qty/pending_qty/remaining_qty của Quotation

### Quotation (Báo giá)
```
Draft → Confirmed → Expired (tự động)
                 → Cancelled (thủ công)
```
- **4 trạng thái** — không có Partial/Completed
- Tiến độ theo dõi qua: `exported_qty`, `pending_qty`, `remaining_qty`
- `remaining_qty = 0` → khoá, không tạo thêm DO
- Khi sửa Confirmed → về Draft: reserved giải phóng, không sửa SL đã xuất

### Delivery Order (Phiếu xuất kho)
```
Draft → Pending Approval → Approved → Completed
                        → Cancelled
```

### Receipt (Phiếu nhập kho)
```
Draft → Pending Approval → Approved → Completed
                        → Cancelled
```
- `receipts.po_id` / `receipt_lines.po_line_id` (cả hai nullable) — liên kết **tuỳ chọn** tới
  Purchase Order. Không phải mọi receipt purchase đều xuất phát từ 1 PO chính thức.
- Khi tạo Receipt có `po_id`: PO phải đang Confirmed, từng `po_line_id` phải thuộc đúng PO đó,
  variant phải khớp, và quantity không vượt remaining_qty của po_line — validate trong cùng
  transaction với forUpdate lock (xem mục 19).

### Transfer Order (Phiếu chuyển kho)
```
Draft → Pending Approval → Approved → Completed
                        → Cancelled
```

### Stocktake (Kiểm kê)
```
In Progress → Completed
           → Cancelled
```
- **Kho không bị khoá** — dùng snapshot qty_system
- Stocktake Result chỉ lưu trữ, không tự điều chỉnh tồn kho

---

## 8. Tồn kho & Reserved

```
qty_available = qty_on_hand - qty_reserved
```

**Cơ chế reserved (bảng reserved_items):**
- Khi Quotation Confirmed → tạo reserved_items cho dòng `is_reserved = true`
- Bundle → expand thành sản phẩm con để reserved
- Service → không reserved
- Khi tạo DO từ Quotation → chuyển một phần reserved_items sang DO
- Tổng qty_reserved không đổi khi chuyển
- Khi DO Completed → Quotation reserved -n, on_hand -n
- Khi Quotation Cancelled/Expired → giải phóng toàn bộ reserved

**is_reserved per line item:**
- Mặc định `true` cho storable và consumable
- Service luôn `false`, disabled
- User có thể bỏ tick nếu không cần giữ chỗ

**Lô hàng (receipt_lines = lô):**
- Không có bảng `stock_batches` riêng — **mỗi `receipt_line` chính là 1 lô nhập** (1 SKU
  trong 1 lần nhập), mang giá vốn (`cost_price`) và bảo hành (`warranty_months`) độc lập
  theo lô. `qty_remaining` được set = `quantity` lúc Receipt Complete, rồi bị FIFO consumer
  của Delivery trừ dần.
- FIFO order chuẩn (phải nhất quán ở MỌI nơi đọc theo thứ tự lô — xem mục 19):
  `receipts.completed_at ASC, receipt_lines.line_order ASC`.

---

## 9. Các loại nhập kho (import_type)

| Type | Mô tả | Document gốc | NCC/KH |
|---|---|---|---|
| purchase | Mua hàng mới từ NCC | Nhập thủ công, có thể link Purchase Order (`po_id`) | NCC bắt buộc |
| return_in | Khách trả lại (SN đã sold) | Quotation gốc | KH bắt buộc |
| adjustment | Điều chỉnh tồn kho thừa | Stocktake Result | Không cần |

> **warranty_in và demo_in KHÔNG phải Receipt** — là Transfer Order vì SN vẫn còn trong hệ thống, chỉ cần đổi warehouse_id.

---

## 10. Các loại xuất kho (export_type)

| Type | Mô tả | NCC/KH | storable SN | consumable |
|---|---|---|---|---|
| sale | Bán hàng — bắt buộc từ Quotation | KH bắt buộc | sold, wh=null | qty -n |
| internal | Xuất nội bộ | Không cần | sold, wh=null | qty -n |
| demo_out | Cho mượn demo | KH bắt buộc | active, wh=kho ảo Demo | qty -n |
| warranty_out | Gửi bảo hành | NCC tùy chọn | active, wh=kho ảo BH | qty -n |
| return_out | Trả về NCC | NCC bắt buộc | Hard delete | qty -n |
| dispose | Huỷ hàng hỏng | Không cần | disposed, wh=null | qty -n |
| adjustment | Điều chỉnh tồn kho thiếu | Không cần | — | qty -n |

---

## 11. Các loại chuyển kho (transfer_type)

| Type | Mô tả | Kho nguồn | Kho đích |
|---|---|---|---|
| transfer | Chuyển kho thông thường | Kho vật lý A | Kho vật lý B |
| warranty_in | Nhận lại sau bảo hành | Kho ảo Bảo hành | Kho vật lý |
| demo_in | Nhận lại sau demo | Kho ảo Demo | Kho vật lý |
| qc_pass | Hàng qua QC đạt | Kho ảo Chờ QC | Kho vật lý |
| sn_ready | Đã nhập SN xong | Kho ảo Chờ nhập SN | Kho vật lý |

---

## 12. Approve workflow

- **1 cấp duyệt** — Manager hoặc Admin
- Áp dụng cho: Receipt, Delivery Order, Transfer Order
- Nếu người tạo có quyền approve → tự approve cho mình
- Trạng thái: Draft → Pending Approval → Approved → Completed

---

## 13. Companies (KH + NCC)

- **1 bảng chung** `companies` thay vì tách customers/suppliers
- Phân loại qua `company_types`: customer / supplier / cả hai
- Fetch từ **Bitrix API** (Company và Contact)
- 1 company có thể vừa là KH vừa là NCC

```sql
-- Lấy tất cả NCC:
SELECT c.* FROM companies c
JOIN company_types ct ON ct.company_id = c.id
WHERE ct.type = 'supplier'
```

---

## 14. Tích hợp Bitrix CRM

**Mục đích:** Fetch thông tin từ Bitrix (chỉ đọc, không ghi ngược lại)

**Endpoints:**
```
GET /rest/1/{api_key}/crm.deal.get?id={deal_id}
GET /rest/1/{api_key}/crm.company.list
GET /rest/1/{api_key}/crm.contact.list
```

**Luồng Quotation:**
- User nhập Bitrix Deal ID → fetch → điền field theo mapping
- Bấm "Sync lại" → ghi đè toàn bộ field được map (không hỏi lại)
- Lưu `bitrix_synced_at` timestamp

**Bitrix Field Mapping:** Cấu hình trong Settings, admin tự map không cần dev.

---

## 15. Template Module (Xuất báo giá)

**Công nghệ:** Carbone.io

**Luồng:**
1. Admin upload file Excel template (đã chèn biến: `{d.customer_name}`,...)
2. Hệ thống detect biến trong template
3. Admin map biến với database field hoặc Bitrix field
4. Khi xuất: build JSON → Carbone điền → xuất `.xlsx` + `.pdf`

**Lưu ý:**
- Font, size, màu sắc định nghĩa trong file Excel — không cần code
- Thêm field mới: thêm biến vào Excel → upload lại → map trong Settings
- Một object có thể có nhiều template (VD: báo giá VN + EN)

---

## 16. RBAC (Phân quyền)

- **Tạo/sửa/xoá role** tùy ý
- **1 user chỉ có 1 role**
- Permissions gán cho role

**Role mặc định (không xoá được, có thể sửa quyền):**

| Role | Quyền chính |
|---|---|
| Admin | Toàn bộ quyền |
| Manager | Approve phiếu, xem báo cáo toàn bộ |
| Warehouse | Tạo phiếu nhập/xuất/chuyển kho, kiểm kê |
| Sale | Tạo báo giá, xem tồn kho |
| Accounting | Xem toàn bộ, xuất báo cáo |

**Danh sách permission keys:**
```
purchase_order.create / purchase_order.edit / purchase_order.confirm / purchase_order.view
quotation.create / quotation.edit / quotation.confirm / quotation.view
receipt.create / receipt.approve / receipt.complete / receipt.view
delivery.create / delivery.approve / delivery.complete / delivery.view
transfer.create / transfer.approve / transfer.complete / transfer.view
stocktake.create / stocktake.complete / stocktake.view
report.inventory / report.revenue / report.view
settings.roles / settings.users / settings.warehouse / settings.products
```

PO permission seed mặc định: Manager (confirm + view), Warehouse (create + edit + confirm +
view), Accounting (view).

---

## 17. Database Schema

### Danh sách bảng (37 bảng)

```
Users & RBAC          roles, permissions, role_permissions, users
Companies & Contacts  companies, company_types, contacts
Warehouses            warehouses
Product Catalog       categories, brands, products, variants,
                      bundle_items, variant_suppliers
Inventory             serial_numbers, inventory,
                      reserved_items, stock_movements
Purchase Orders       purchase_orders, purchase_order_lines
Receipts              receipts, receipt_lines
Delivery Orders       delivery_orders, delivery_order_lines
Transfer Orders       transfer_orders, transfer_order_lines
Quotations            quotations, quotation_sections,
                      quotation_line_items
Stocktake             stocktakes, stocktake_lines, stocktake_results
Template Module       document_templates, template_field_mappings
Bitrix Integration     bitrix_field_mappings
Custom Fields         custom_fields, field_values
Settings              import_types, export_types
```

> Không có bảng `stock_batches` — `receipt_lines` đóng luôn vai trò "lô hàng" (xem mục 8).

### Business Rules quan trọng

```javascript
// Tồn kho
qty_available = qty_on_hand - qty_reserved

// Báo giá
line_total = quantity * unit_price
vat_amount = line_total * (vat_percent / 100)
section.subtotal = SUM(line_items.line_total + line_items.vat_amount)
quotation.grand_total = subtotal + vat_total - discount
quotation.expired_at = created_at + valid_days

// Tiến độ xuất hàng (Quotation)
exported_qty = SUM(DO Completed qty)
pending_qty  = SUM(DO Draft/Approved qty)
remaining_qty = total_qty - exported_qty - pending_qty
// remaining_qty = 0 → khoá Quotation

// Tiến độ nhận hàng (Purchase Order) — đối xứng với Quotation, group theo po_line_id
received_qty  = SUM(receipt_line.quantity) WHERE receipt.status = 'completed'
pending_qty   = SUM(receipt_line.quantity) WHERE receipt.status IN (draft, pending_approval, approved)
remaining_qty = po_line.quantity - received_qty - pending_qty

// Lô hàng (receipt_line CHÍNH LÀ lô — không có bảng stock_batches riêng)
receipt_line.qty_remaining = quantity - SUM(xuất từ lô này) // set = quantity lúc Receipt Complete

// Inventory khi Receipt Completed:
inventory.qty_on_hand += receipt_line.quantity
inventory.avg_cost = (old_qty * old_avg + new_qty * new_cost) / (old_qty + new_qty)

// Bảo hành theo lô (storable), tính lúc Receipt Complete:
serial_numbers.warranty_end = completed_at + (receipt_line.warranty_months * interval '1 month')
// warranty_months = 0 là giá trị hợp lệ (tường minh "không bảo hành") — PHẢI so sánh
// `!= null`, không dùng truthy check, để không bị nhầm 0 thành "chưa khai báo"

// Inventory khi DO Completed:
inventory.qty_on_hand -= delivery_line.quantity
inventory.qty_reserved -= delivery_line.quantity

// Inventory khi Quotation Confirmed:
inventory.qty_reserved += quotation_line.quantity (nếu is_reserved = true)

// Inventory khi Quotation Cancelled/Expired:
inventory.qty_reserved -= quotation_line.quantity
```

---

## 18. Cấu trúc thư mục

```
/ (pnpm monorepo)
├── apps/
│   ├── backend/                 ← Fastify + TypeScript
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/        ← JWT, login, refresh token
│   │   │   │   ├── warehouse/
│   │   │   │   ├── inventory/
│   │   │   │   ├── receipt/
│   │   │   │   ├── purchaseorder/
│   │   │   │   ├── delivery/
│   │   │   │   ├── transfer/
│   │   │   │   ├── stocktake/
│   │   │   │   ├── quotation/
│   │   │   │   ├── product/
│   │   │   │   ├── company/
│   │   │   │   ├── template/
│   │   │   │   ├── bitrix/
│   │   │   │   └── settings/
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts      ← verify JWT
│   │   │   │   └── permission.ts ← check RBAC key
│   │   │   ├── plugins/
│   │   │   │   ├── knex.ts      ← DB connection
│   │   │   │   └── carbone.ts
│   │   │   └── app.ts
│   │   ├── migrations/          ← Knex migrations (SQL files)
│   │   ├── seeds/
│   │   └── package.json
│   │
│   ├── web/                     ← React + Vite + TypeScript
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   ├── components/
│   │   │   ├── hooks/           ← TanStack Query hooks
│   │   │   ├── store/           ← Zustand stores
│   │   │   └── utils/
│   │   └── package.json
│   │
│   └── mobile/                  ← React Native + Expo
│       ├── src/
│       │   ├── screens/
│       │   ├── components/
│       │   └── hooks/
│       └── package.json
│
├── packages/
│   ├── types/                   ← Shared TypeScript interfaces
│   │   └── src/
│   │       ├── models/          ← Product, Inventory, Quotation...
│   │       └── api/             ← Request/Response DTOs
│   └── utils/                   ← Shared validators, formatters
│
├── docs/
│   ├── BRD_Warehouse_v1.docx
│   ├── Business_Workflow_v3.docx
│   └── warehouse_v2.dbml
│
└── CLAUDE.md
```

---

## 19. Lộ trình triển khai

### Phase 1 — Core kho
- Danh mục: Product, Variant, Serial Number, Warehouse
- Receipt (phiếu nhập kho)
- Delivery Order (phiếu xuất kho)
- Transfer Order (phiếu chuyển kho)
- Inventory (tồn kho real-time)
- RBAC cơ bản
- Mobile app: nhập/xuất kho, quét SN

### Phase 2 — Nghiệp vụ
- Quotation (báo giá) + xuất PDF/Excel
- Purchase Order (PO) — gắn Receipt qua `po_id`/`po_line_id`, liên kết tuỳ chọn
- Bundle
- Tích hợp Bitrix CRM
- Companies/Contacts
- Approve workflow
- Template Module

### Phase 3 — Báo cáo & Mở rộng
- Dashboard + báo cáo tổng hợp
- Stocktake (kiểm kê)
- Custom Fields
- Settings đầy đủ (import_types, export_types)
- Carbone template manager

---

## 20. Lưu ý khi code

**Business logic:**
- Dùng UUID cho tất cả primary key
- Tất cả timestamp dùng UTC (`TIMESTAMPTZ` trong PostgreSQL)
- `ref_document_type` + `ref_document_id` là polymorphic relation — validate kỹ
- Khi Receipt/DO Completed → tự động tạo `stock_movements`
- Khi Quotation `expired_at` đến → job tự động → Expired, giải phóng reserved
- **warranty_in / demo_in → Transfer Order**, không phải Receipt
- **return_out → hard delete SN** khỏi database
- Bundle → expand sản phẩm con khi tạo reserved_items và DO lines
- FIFO/LIFO cấu hình trong Settings, mặc định FIFO — thứ tự chuẩn
  `receipts.completed_at ASC, receipt_lines.line_order ASC`; MỌI nơi đọc theo thứ tự lô
  (FIFO consumer của Delivery, breakdown lô ở Inventory,...) phải dùng đúng 2 cột này, chỉ
  `completed_at` không đủ làm tie-breaker vì nhiều `receipt_line` của cùng 1 receipt share
  đúng 1 `completed_at`.
- Approve: check permission `{object}.approve` trước khi cho duyệt
- `remaining_qty` là computed field — tính từ DO (Quotation) hoặc Receipt (Purchase Order),
  không lưu trong database
- Stocktake snapshot: lưu `qty_system` vào `stocktake_lines` tại thời điểm tạo
- Company fetch từ Bitrix: lưu `bitrix_company_id` để sync
- Purchase Order module mirror Quotation: state machine draft/confirmed/cancelled,
  `findLineProgress()` tính received_qty/pending_qty/remaining_qty per line (mục 17). Mọi
  state-transition (confirm/unconfirm/cancel) phải `forUpdate()` lock đúng dòng
  `purchase_orders` TRƯỚC KHI đọc lại progress của các dòng — nếu đọc progress (qua
  `findById()`/`findLineProgress()`) trước khi mở transaction hoặc trước khi lock thì sẽ có
  race: 1 request unconfirm/cancel và 1 request receipt.create() cùng đụng PO đó có thể đọc
  progress cũ rồi cùng pass validate. `receipt.service.ts::validatePurchaseOrder()` cũng phải
  `forUpdate()` lock đúng cùng dòng `purchase_orders`/`purchase_order_lines` đó, trong cùng
  transaction với insert receipt_lines, để 2 cơ chế khoá nhau và serialize đúng.
- Category/Brand bắt buộc khi tạo Product: enforce ở **API JSON schema** (`required` trong
  `createProductSchema`), KHÔNG enforce bằng `NOT NULL` ở DB — vì nhiều test fixture insert
  trực tiếp vào bảng `products` bỏ qua validate API. Đây là pattern chuẩn cho mọi business
  rule mới: ưu tiên enforce ở schema tầng API, chỉ thêm constraint DB khi chắc chắn không có
  code nào insert trực tiếp bỏ qua API.

**Kỹ thuật (stack đã chốt):**
- Mỗi module Fastify export 1 plugin: `fastify.register(receiptModule, { prefix: '/receipts' })`
- Repository layer chỉ dùng Knex — không viết raw SQL string trực tiếp trong service
- Shared types trong `packages/types` — import qua `@wms/types`, không duplicate interface
- Serial chọn trực tiếp trong request body lúc Complete (không qua bảng staged riêng); `serial_numbers.delivery_line_id` = audit (sau Complete)
- `stocktake_lines.difference` là generated column PostgreSQL — không update thủ công
- Migration dùng Knex migration (không chạy file SQL thủ công trong production)
- JWT payload chỉ chứa `{ sub: userId, roleId }` — permission check query DB mỗi request qua middleware

---

## 21. Môi trường phát triển

**PostgreSQL chạy trong Docker** — không cài trực tiếp trên host, không có `psql`/`pg_dump` trong PATH.
Container: `wms-postgres` (image `postgres:16-alpine`), port `5432:5432`, password `postgres`.

**Export database:**
```bash
docker exec wms-postgres pg_dump -U postgres wms_db > wms_db_export_$(date +%Y%m%d).sql
```

**Restore trên máy mới (Docker):**
```bash
# Khởi động container
docker run -d --name wms-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:16-alpine

# Copy dump vào container rồi restore
docker cp wms_db_export_YYYYMMDD.sql wms-postgres:/tmp/dump.sql
docker exec wms-postgres psql -U postgres -c "CREATE DATABASE wms_db;"
docker exec wms-postgres psql -U postgres wms_db -f /tmp/dump.sql
```

**Hai database:**
- `wms_db` — production / development thật
- `wms_test_db` — chạy test suite (`pnpm test` trong `apps/backend`)

Khi thêm migration mới phải apply cho **cả hai**:
```bash
docker exec wms-postgres psql -U postgres wms_db   -c "ALTER TABLE ..."
docker exec wms-postgres psql -U postgres wms_test_db -c "ALTER TABLE ..."
```
