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
| **shadcn/ui + Tailwind CSS v4** | Component UI chính — layout, table, dialog, button... |
| Ant Design | Chỉ còn dùng cho form phức tạp: DatePicker, EntityFormModal, StocktakeSkuPicker |
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
| purchase | Mua hàng mới từ NCC | **Bắt buộc** `shipment_id` trỏ tới 1 Shipment (Phiếu nhận hàng) đã ở trạng thái "Đã nhận hàng" — có thể kèm link Purchase Order (`po_id`) tuỳ chọn | NCC bắt buộc |
| return_in | Khách trả lại (SN đã sold) | **Delivery Order gốc** (`ref_document_type='delivery_order'`) — không phải Quotation, vì 1 Quotation có thể sinh nhiều DO, cần biết đúng DO/lô/serial nào đã giao mới xử lý trả hàng đúng | KH bắt buộc |
| adjustment | Điều chỉnh tồn kho thừa | Stocktake Result | Không cần |

> **purchase bắt buộc qua Shipment**: quy trình chuẩn là hàng mua từ NCC phải đi qua Phiếu nhận hàng (Shipment) trước — người nhận xác nhận hàng vật lý về (status='received') rồi mới tạo Receipt để nhập kho chính thức (xem `receipt.service.ts::validateShipment`). Quan hệ PO 1-N Shipment 1-N Receipt.
>
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
│   │   ├── migrations/          ← 1 file duy nhất (squashed), load SQL từ /backend/migrations/
│   │   ├── seeds/
│   │   └── package.json
│   │
│   ├── web/                     ← React + Vite + TypeScript
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   ├── components/
│   │   │   │   └── ui/          ← shadcn/ui components (button, dialog, input...)
│   │   │   ├── hooks/           ← TanStack Query hooks
│   │   │   ├── lib/             ← utils (cn, shadcn helpers)
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
├── backend/
│   └── migrations/
│       └── 001_initial_schema.sql  ← Schema SQL final (re-dump từ DB khi squash)
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
├── CLAUDE.md
└── README.md
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
- Migration: hiện tại chỉ có **1 file duy nhất** (`20260618000000_initial_schema.ts`) load
  `backend/migrations/001_initial_schema.sql`. Khi cần thêm schema mới → tạo file migration
  .ts mới (timestamp mới) như bình thường; khi muốn squash → re-dump DB bằng `pg_dump
  --schema-only` rồi ghi đè `001_initial_schema.sql`, xoá file .ts cũ, reset `knex_migrations`
  về 1 row. Không chạy file SQL thủ công trong production.
- JWT payload chỉ chứa `{ sub: userId, roleId }` — permission check query DB mỗi request qua middleware

---

## 21. Môi trường phát triển

**PostgreSQL chạy trong Docker** — không cài trực tiếp trên host, không có `psql`/`pg_dump` trong PATH.
Container: `wms-postgres` (image `postgres:16-alpine`), port host `5435` → container `5432`, password `postgres`.

**Ports:**
- Backend API: **3002** (tránh conflict với SSH local port forward trên 3000)
- Frontend Vite dev: **5173** (proxy `/api` → `http://localhost:3002`)
- PostgreSQL: **5432**

**Export database (schema + data):**
```bash
docker exec wms-postgres pg_dump -U postgres wms_db > wms_db_export_$(date +%Y%m%d).sql
```

**Export schema-only (để cập nhật 001_initial_schema.sql khi squash migration):**
```bash
docker exec wms-postgres pg_dump -U postgres --schema-only --no-owner --no-acl \
  --exclude-table=knex_migrations --exclude-table=knex_migrations_lock \
  wms_db > backend/migrations/001_initial_schema.sql
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
- `wms_db` — development thật (có data thật)
- `wms_test_db` — chạy test suite (`pnpm test` trong `apps/backend`)

Khi thêm migration mới phải apply cho **cả hai**:
```bash
# Chạy migrate (áp dụng file .ts mới nhất)
cd apps/backend && pnpm migrate

# Hoặc apply thủ công ALTER TABLE cho cả hai DB:
docker exec wms-postgres psql -U postgres wms_db   -c "ALTER TABLE ..."
docker exec wms-postgres psql -U postgres wms_test_db -c "ALTER TABLE ..."
```

**Reset knex_migrations khi squash:**
```bash
# Sau khi squash tất cả migration về initial_schema.ts:
docker exec wms-postgres psql -U postgres wms_db \
  -c "DELETE FROM knex_migrations WHERE name != '20260618000000_initial_schema.ts';"
docker exec wms-postgres psql -U postgres wms_test_db \
  -c "DELETE FROM knex_migrations WHERE name != '20260618000000_initial_schema.ts';"
```

---

## 22. UI Standards — chuẩn giao diện (frontend)

> Đang trong quá trình redesign toàn bộ `apps/web` theo thứ tự: **List page (✅ xong) → Detail/
> Form page (đang làm) → Settings đơn lẻ**. Mục này là nguồn sự thật duy nhất cho quy tắc UI —
> cập nhật ngay khi có quyết định thiết kế mới, đừng để lệch giữa các trang.

### Design tokens (đã đổi so với bản đầu)

- **Font**: 1 họ duy nhất **Tahoma** (fallback `Segoe UI`, `Verdana`) cho cả heading lẫn body
  (`apps/web/src/index.css`, `styles/tokens.css`, `theme.ts` cho Ant Design) — đổi từ Public Sans
  Variable vì app có nhiều bảng dữ liệu dày đặc, cần font rõ nét ở size nhỏ hơn là đẹp; Tahoma
  thiết kế riêng cho màn hình độ phân giải thấp, không cần tải font file (đã gỡ dependency
  `@fontsource-variable/public-sans`). KHÔNG dùng cặp 2 font khác nhau cho heading/body — trộn
  nhiều font cùng lúc là 1 trong các dấu hiệu "thiết kế AI" điển hình cần tránh; phân cấp chỉ
  bằng size/weight.
- **Mật độ hiển thị (density)**: ưu tiên gọn/nhiều dữ liệu trên màn hình hơn là khoảng trống
  rộng rãi — app nghiệp vụ nhiều bảng/danh sách, không phải trang marketing. Root font-size ở
  `apps/web/src/index.css` set `90%` (không phải 100%) — vì hầu hết spacing/kích thước component
  của Tailwind đều tính theo `rem` (padding, gap, height nút/input...), hạ root font-size là đòn
  bẩy rẻ nhất để co đồng loạt cỡ chữ + khoảng trống + kích thước component toàn app. Dùng
  font-size (không phải CSS `zoom`) để tránh bug Chromium tính sai `scrollHeight` ở container
  overflow-auto lồng flex sâu (sidebar) — xem comment tại chỗ set giá trị. Dòng roster/list-item
  trong layout master-detail dùng `py-1.5` (không phải `py-2`) cho gọn.
- **Type scale cho theme "2a"** (`InventoryPage`, `ProductsPage`, `ProductDetailPage`,
  `VariantDetailPage` — các trang dùng class `.theme-2a`, xem mục "UI Standards" bên dưới):
  6 biến `--t2-caption/label/body/strong/title/heading` (11/12/13/14/17/22px) khai báo trong
  `tokens.css` bên trong block `.theme-2a`. MỌI text ở các trang này phải dùng đúng 1 trong 6
  biến này (`style={{ fontSize: 'var(--t2-body)' }}` hoặc class Tailwind tương ứng cỡ px đó),
  KHÔNG viết số px tay (`fontSize: 13`, `text-base`...) — lý do ra đời quy tắc này: qua nhiều
  vòng chỉnh sửa theo phản hồi ("tăng font size", "giảm density") mỗi trang bị lệch nhau (label
  chỗ 11px chỗ 12px chỗ 17px cho cùng vai trò, `InventoryPage` từng bị đẩy lên `text-base`
  ~16px trong khi `ProductDetailPage`/`VariantDetailPage` lại ở 12-13px). Hướng đã chốt là
  **dày/nhỏ** (khớp tinh thần "ưu tiên density" ở mục Mật độ hiển thị ngay dưới đây), không
  phải hướng to/thoáng — nếu cần tăng cỡ chữ toàn app sau này, sửa NGAY TẠI 6 biến này, không
  sửa rải rác từng trang. Số nổi bật kiểu "28px điểm đặt lại gợi ý" (`VariantDetailPage`) là
  ngoại lệ cố ý (số liệu nhấn mạnh, không phải text thường) nên không nằm trong scale.
- **Accent**: xanh dương đậm `#0B5FAE` (đổi từ sky-blue nhạt `#29ABE2` cũ) — nếu thấy code còn
  hardcode `#29ABE2` hoặc `rgba(41,171,226,...)` là sót, phải đổi sang `var(--accent)`/`var(--accent-bg)`.
- **Màu trạng thái** (`--s-draft/pending/approved/completed/cancelled/confirmed/expired-color/bg`
  trong `tokens.css`) dùng cho `StatusBadge`, `ActiveBadge`, switch/toggle is_active — KHÔNG
  hardcode `emerald-500`, `blue-700`... trực tiếp trong component.
- **Label vs value trong InfoRow**: label `text-xs text-muted-foreground` (không bold), value
  `text-sm font-medium text-foreground` — mức chênh vừa phải (không quá nhạt tới mức khó đọc,
  không quá đậm tới mức gắt). Đây là điểm đã thử qua 2-3 mức trước khi chốt, đừng đổi lại nếu
  không có lý do rõ.
- **Page header tiết kiệm không gian**: KHÔNG tách tiêu đề trang và subtitle thành 2 dòng
  riêng (h1 lớn + `<p>` bên dưới) — tốn chiều cao không cần thiết. Gộp thành **1 dòng**: h1
  `flex items-baseline gap-2 text-xl font-bold tracking-tight`, subtitle nằm trong `<span
  className="text-sm font-normal text-muted-foreground">` ngay trong h1. Áp dụng cho mọi trang
  (List, Settings...), xem `BrandsPage.tsx`/`ProductsPage.tsx` làm mẫu. Trang không có subtitle
  chỉ cần `text-xl font-bold tracking-tight` (bỏ luôn phần flex/span).

- **Tiêu đề trang đẩy thẳng lên topbar (`usePageHeader`)** — ĐÃ nhân rộng cho toàn bộ trang
  List/Settings/Dashboard (không đụng tới Detail/Form page còn AntD, xem bảng trạng thái bên
  dưới). Thay vì tự vẽ 1 hàng tiêu đề riêng bên dưới topbar, trang gọi `usePageHeader(<jsx>)`
  (từ `@/layout/PageHeaderSlot`) ngay trước `return` — nội dung được "đẩy" vào topbar dùng
  chung ở `AppLayout.tsx`, gộp còn 1 hàng duy nhất (tiết kiệm ~48px mỗi trang). Nội dung truyền
  vào dùng size nhỏ hơn tiêu đề cũ: `text-sm font-semibold` (không phải `text-xl`), subtitle
  `text-xs`, button `size="sm"` — vì topbar chỉ cao 48px trên desktop, không phải cả 1 hàng
  riêng thoải mái như trước. `usePageHeader` là hook — PHẢI gọi vô điều kiện, không được đặt
  sau 1 early return (`if (isLoading) return null`) hay trong nhánh if/else, nếu không sẽ vỡ
  rules-of-hooks khi điều kiện đó đổi giữa các lần render (xem `SettingsBitrixPage.tsx` — từng
  bị lỗi này lúc migrate, phải dời `usePageHeader` lên trước dòng `if (isLoading) return null`).
  **Nút hành động trong header PHẢI đi qua `PageActions`** (`@/components/ui/PageActions`),
  không tự viết `<Button onClick={...}>` tay — lý do: `PageActions` tự gom mọi nút phụ vào 1
  nút "···" dropdown nên topbar không bao giờ tràn dù sau này thêm bao nhiêu action, và nó đã
  tự chuẩn hoá `size="sm"`/`icon-sm` cho nút primary/"···" nên mọi trang có cùng chiều cao nút
  — tự viết `<Button>` tay rất dễ quên set `size="sm"` và bị lệch cỡ so với các trang khác
  (từng bị vậy ở `ProductsPage` trước khi sửa `PageActions` mặc định thành `size="sm"`). Trang
  chỉ có 1 title, không có action nào thì gọi `usePageHeader(<h1>...</h1>)` — không cần bọc
  trong `<div className="flex items-center justify-between">` nếu không có gì bên phải.
  **Bài học mobile quan trọng**: lần đầu áp cho `CompaniesPage` (header phức tạp: tiêu đề +
  switch-tab + nút) đã làm topbar vỡ layout hoàn toàn trên điện thoại (chữ chồng lên nhau) vì
  header cũ h-12 cố định không đủ chỗ nhét icon sidebar + tiêu đề + nút + chuông + avatar trên
  cùng 1 hàng ở màn hẹp. Đã sửa ở tầng `AppLayout.tsx`: header dùng `flex-wrap` + CSS `order`
  để dưới `md` tự tách thành 2 hàng (hàng 1: icon sidebar + chuông/avatar; hàng 2: pageHeader
  full-width), từ `md` trở lên gộp lại đúng 1 hàng như thiết kế gốc — fix này đã có sẵn ở tầng
  layout, trang mới dùng `usePageHeader` không cần tự lo trách nhiệm này. Đã test lại toàn bộ
  danh sách trang ở bảng dưới trên cả desktop (1280px) và mobile (375px) sau khi nhân rộng.

### Nguyên tắc phân loại "trạng thái" khi làm UI

- **Component state** (mở/đóng sidebar, hover, focus, dropdown/modal đang mở): xử lý ngay
  trong component dùng chung, KHÔNG thiết kế riêng cho từng trang — component đúng 1 lần thì
  mọi trang dùng nó đều đúng theo.
- **Page/data state** (Loading, Empty, Error, Có dữ liệu, khác nhau theo quyền RBAC, khác nhau
  theo status nghiệp vụ của entity): đây là nội dung thực sự đổi ý nghĩa với người dùng — PHẢI
  thiết kế/code rõ ràng cho từng trường hợp, không bỏ sót. Mọi trang List tối thiểu phải có đủ
  4 trạng thái: Loading / Empty / Error / Có dữ liệu.

### Layout chuẩn cho trang List — Master-detail (chỉ khi phù hợp)

Trang danh sách (List page) dùng layout **master-detail**: roster (danh sách rút gọn) bên
trái + panel chi tiết bên phải. Xem `CompaniesPage.tsx`, `WarehousesPage.tsx`, `BrandsPage.tsx`
làm mẫu tham chiếu.

```
┌─────────────────────────────────────────────────────────┐
│ h1 (text-xl font-bold, subtitle inline cùng dòng) · actions│
├───────────────────┬───────────────────────────────────────┤
│ Roster (380-400px)│ Detail panel (1fr)                    │
│ ┌───────────────┐ │ ┌───────────────────────────────────┐ │
│ │ Search + filter│ │ │ Header: icon + tên + actions       │ │
│ ├───────────────┤ │ ├───────────────────────────────────┤ │
│ │ scroll list    │ │ │ SectionCard "Thông tin" (InfoRow)  │ │
│ │ (item = border │ │ ├───────────────────────────────────┤ │
│ │  rounded-lg,   │ │ │ SectionCard khác (con, liên quan…) │ │
│ │  active =      │ │ └───────────────────────────────────┘ │
│ │  accent-bg)    │ │                                       │
│ ├───────────────┤ │                                       │
│ │ pagination nhỏ │ │                                       │
│ └───────────────┘ │                                       │
└───────────────────┴───────────────────────────────────────┘
```

Container: `grid grid-cols-[380px_1fr] items-stretch gap-4 min-h-0` (KHÔNG dùng `items-start`
— xem lý do bên dưới). Roster tự chọn dòng đầu tiên khi đổi trang/lọc/tìm kiếm (`useEffect`
theo `rows`) để panel phải luôn có nội dung — không để trắng khi mới vào trang.

**Chiều cao roster/detail — layout tự khớp, KHÔNG dùng magic number `calc(100vh - Npx)`:**
Bản đầu dùng `style={{ maxHeight: 'calc(100vh - 320px)' }}` (số N đoán tay, khác nhau tuỳ trang:
280 hay 320) để giới hạn chiều cao `<ul>` roster — số N này không tự cập nhật khi header/search
đổi chiều cao (VD sau khi đổi root font-size để tăng mật độ, N cũ bị lệch, roster ngắn hơn mức
có thể hiển thị). Đã bỏ hẳn kỹ thuật này, thay bằng chuỗi flex tự khớp chiều cao thật của
container cha (không cần biết trước bất kỳ con số px nào):
```
<div className="flex h-full min-h-0 flex-col gap-4">          {/* root trang */}
  <div className="flex items-center justify-between">...</div> {/* header, cao tự nhiên */}
  <div className="grid flex-1 grid-cols-[380px_1fr] items-stretch gap-4 min-h-0">
    <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border ...">  {/* roster */}
      <div className="...">search + filter</div>                {/* cao tự nhiên */}
      <ul className="min-h-0 flex-1 overflow-y-auto p-1.5">...</ul>  {/* chiếm phần còn lại */}
      <div className="border-t ...">footer đếm</div>             {/* cao tự nhiên */}
    </div>
    <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">  {/* detail panel */}
      ...SectionCard...
    </div>
  </div>
</div>
```
Quy tắc: mọi tổ tiên trên đường dẫn tới phần tử cần scroll PHẢI có `min-h-0` (mặc định flex
item có `min-height: auto` khiến nó không chịu co nhỏ hơn nội dung, làm hỏng toàn bộ chuỗi
`flex-1` bên trong) — thiếu 1 chỗ `min-h-0` là chuỗi tự khớp này gãy. Cách này hoạt động đúng
nhờ `AppLayout` (`apps/web/src/layout/AppLayout.tsx`) đã có sẵn chuỗi flex cao đúng viewport
(`html,body,#root{height:100%}` → `SidebarInset` → content wrapper `flex-1 overflow-y-auto`) —
trang chỉ cần nối tiếp đúng chuỗi `flex-1 min-h-0`, không cần tính lại từ `100vh`. Nếu tạo trang
master-detail mới, copy nguyên khung này thay vì tự đoán số `calc(100vh - N)`.

**KHÔNG áp master-detail khi không phù hợp** — bài học rút ra khi làm thật:
- **Dữ liệu dạng bảng nhiều cột** (Products, Inventory — giá vốn/giá bán/VAT/tồn kho/giữ chỗ
  theo từng kho...): giữ bảng full-width, roster hẹp 380px sẽ phá mất khả năng quét nhiều cột
  cùng lúc mà tính năng này cần.
- **Entity có trang chi tiết đầy đủ riêng, nặng nghiệp vụ** (Receipt/PO/Quotation/Delivery/
  Transfer/Shipment/Stocktake — có dòng hàng, duyệt/huỷ, timeline...): panel tóm tắt bên phải
  dễ thành "nửa vời" — roster bị cắt chữ, panel thiếu thông tin, cuối cùng vẫn phải bấm sang
  trang khác. Với nhóm này giữ **bảng full-width + bấm dòng điều hướng sang trang chi tiết**
  (pattern cũ), KHÔNG cố ép master-detail chỉ vì các trang khác đang dùng nó.
  → Áp dụng cho: `PurchaseOrdersPage`, `ReceiptsPage`, `QuotationsPage`, `DeliveryOrdersPage`,
  `TransferOrdersPage`, `ShipmentsPage`, `StocktakesPage`, `ProductsPage`, `InventoryPage`.

**Nhiều field trong 1 panel chi tiết — tránh khó kiểm soát khi form dài:**
- KHÔNG nhồi hết field vào 1 `SectionCard` duy nhất — tách theo nhóm nội dung logic thành
  nhiều `SectionCard` riêng (VD PO: "Thông tin phiếu" / "Thông tin Bitrix" / "Ghi chú"), mỗi
  card có ranh giới rõ, dễ định vị khi cuộn.
- Field ngắn (mã, ngày, số lượng, trạng thái): giữ `grid-cols-2`, hoặc tăng lên 3-4 cột nếu
  1 card có nhiều field ngắn cùng loại — tránh card kéo dài quá mức theo chiều dọc.
- Field dài (địa chỉ, ghi chú, tên dự án dài): dùng prop `full` trên `InfoRow` để chiếm trọn
  hàng, tránh kéo dãn cột bên cạnh.
- **Field ngắn KHÔNG để `width: '100%'` trong ô grid đồng đều** (Select đơn vị, tiền tệ, ô số
  cân nặng/điểm đặt lại/BH hãng...) — sẽ bị kéo giãn hết bề rộng ô dù giá trị chỉ vài ký tự,
  trông rất mất cân đối khi đứng cạnh field dài (tên, giá tiền). Cap bằng 1 trong 3 mức chuẩn
  ở `apps/web/src/styles/fieldWidths.ts::fieldTier` (`short` ~120px, `medium` ~180px, `long`
  ~260px — phân loại theo ĐỘ DÀI GIÁ TRỊ THỰC TẾ, xem comment trong file để biết field nào vào
  mức nào), thay vì tự chọn con số px tùy tiện mỗi trang — đã từng bị lệch nhau giữa các trang
  (VariantDetailPage/VariantCreatePage dùng 120/140/160/180 khác nhau, QuotationDetailPage
  dùng 130/180/220/260) trước khi gộp về 3 mức này. Field không giới hạn được (tên, mô tả,
  ghi chú) thì không dùng tier nào — để full 100% ô hoặc dùng `full` để chiếm trọn hàng.

**Component dùng chung** (`apps/web/src/components/ui/`):
- `SegmentedControl` — switch giữa vài lựa chọn loại trừ nhau (tab, filter loại). Active state
  dùng nền `bg-primary` đặc (không phải chỉ đổ bóng nhẹ — dễ bị chê "không thấy khác gì" nếu
  làm mờ). KHÔNG viết lại local trong từng trang.
- `SectionCard` + `InfoRow` — khối card + cặp label/value chuẩn cho detail panel.
- `StatusToggle` — control bật/tắt `is_active` dạng **2 nút chọn** ("Hoạt động" / "Ngừng"),
  KHÔNG dùng switch gạt nhỏ đơn thuần — quyết định vì switch khó nhận ra khác biệt khi nhìn
  ảnh tĩnh/không tương tác. Dùng trong panel chi tiết (Brand/Category/Warehouse/User...); trong
  Sheet tạo/sửa (form) vẫn dùng `Switch` bình thường vì đó là 1 field trong form dài, không
  phải điểm nhấn cần nổi bật.
- `Input` bo góc `rounded-lg` (không phải `rounded-3xl` pill) để khớp tông với button/card.
- `TableCard` (`TableCard.tsx`, legacy) — không còn trang nào dùng, có thể xoá khi dọn dẹp.
- `PageActions` — vùng nút hành động chuẩn ở header mọi trang, thay cho việc tự xếp `<Button>`
  thẳng hàng (dễ vỡ layout khi thêm nút mới). Quy tắc: `primary` (1 nút chính, luôn hiện rõ,
  VD "Tạo mới") + `secondary` (mảng nút phụ — export/import/đồng bộ..., tự gom vào 1 nút "···"
  dropdown, thêm bao nhiêu nút phụ cũng không đụng layout hàng trên) + `selection` (hành động
  hàng loạt khi tick chọn nhiều dòng — khi `selection.count > 0` cả thanh đổi thành "N đã chọn"
  + action, THAY THẾ hẳn primary/secondary, không trộn chung 1 hàng — giống Gmail). Dùng
  `<PageActions primary={{...}} secondary={[...]} />` thay vì viết tay nhiều `<Button>` cạnh
  nhau. Xem `ProductsPage.tsx` làm mẫu (nút "Tạo sản phẩm" = primary, "Import Excel" = secondary).
- `Button` (`button.tsx`) PHẢI dùng `React.forwardRef` — khi làm `PageActions` phát hiện bug:
  `<DropdownMenuTrigger asChild><Button>...` không mở được menu vì Radix cần gắn `ref` vào
  child, mà `Button` trước đó là function component thường (không forwardRef) nên ref rơi mất
  silently (chỉ thấy warning console, không lỗi rõ ràng). Đã sửa 1 lần ở gốc component, không
  cần sửa lại — nhưng nếu sau này thấy `asChild` + component tự viết khác không mở được
  Dropdown/Popover/Tooltip, kiểm tra đúng nguyên nhân này trước.

**Màu sắc:** luôn dùng token WMS (`var(--accent)`, `text-foreground`, `text-muted-foreground`,
`border-border-md`, `bg-[var(--accent-bg)]`, `var(--s-*-color)`...) — KHÔNG copy nguyên bảng
màu cứng (Tailwind slate/rose/emerald-500/blue-700 mặc định...) từ template ngoài, kể cả khi
đang thử nghiệm 1 layout mới. Nếu thấy code có class `bg-white`, `text-slate-900`,
`border-slate-200`, `text-emerald-700`... trong 1 trang app — đó là dấu hiệu chưa quy về
token, cần sửa.

**`bg-background` (nền trang) vs `bg-card` (nền khối nội dung) — KHÔNG dùng lẫn:**
`--background` map thẳng tới `--bg-page` (xám nhạt `#f2f4f9`), còn `--card` map tới `--bg-card`
(trắng `#ffffff`) — 2 token khác nhau có chủ đích để phân biệt "nền trang" và "nền khối nổi
trên trang". Mọi card/panel/popover có `shadow-md` trở lên (`SectionCard`, roster container,
`Select`/`DropdownMenu` content, tooltip...) PHẢI dùng `bg-card`, không phải `bg-background` —
dùng nhầm `bg-background` sẽ làm card hoà lẫn màu với nền trang, nhìn không phân biệt được
ranh giới (đã từng bị sót ở 27 file khi mới dựng master-detail, xem lịch sử sửa). Ngược lại,
`Input`/`Select`/`Textarea` cố tình giữ `bg-background` (không phải `bg-card`) để tạo tương
phản nhẹ giữa ô nhập liệu và khối card trắng bao quanh nó — đây là điểm khác biệt có chủ đích,
không phải sót.

**KHÔNG lồng 2 lớp card/border vào nhau:** nếu 1 component (VD `ContactsPanel` bảng con) được
đặt bên trong `SectionCard`, component con KHÔNG được tự vẽ thêm `rounded-2xl border shadow`
riêng — sẽ tạo hiệu ứng "viền đôi" (viền ngoài của SectionCard + viền trong của component con
cách nhau vài px, nhìn như lỗi). Component con nằm trong 1 card khác chỉ nên có tối đa 1 lớp
viền nhẹ (`rounded-xl border border-border`, không thêm `shadow`) hoặc không viền gì cả nếu
padding của SectionCard cha đã đủ tách bạch.

**Tiêu đề `SectionCard` là nhãn phụ, không phải heading:** dùng `text-xs font-semibold
uppercase tracking-wide text-muted-foreground` (không phải `text-sm font-semibold
text-foreground` cỡ lớn) — tiêu đề này chỉ có vai trò gắn nhãn cho khối bên dưới, không nên
cạnh tranh thị giác với nội dung thật trong card. `font-serif` KHÔNG còn xuất hiện ở bất kỳ
heading nào trong app thật (dù biến `--font-serif` đã trỏ về Public Sans nên không đổi font,
class `font-serif` vẫn là code chết cần dọn nếu thấy sót).

### Trạng thái redesign theo trang (theo route, xem `router.tsx`)

| Trang | Route | Trạng thái |
|---|---|---|
| Đối tác (2 tab) | `/companies` | ✅ master-detail |
| Kho hàng | `/warehouses` | ✅ master-detail |
| Thương hiệu | `/brands` | ✅ master-detail |
| Danh mục SP | `/categories` | ✅ master-detail (roster có cây phân cấp) |
| Người dùng | `/settings/users` | ✅ master-detail |
| Vai trò & Quyền | `/settings/roles` | ✅ master-detail |
| Nhóm người dùng | `/settings/groups` | ✅ master-detail |
| Sản phẩm (2 tab) | `/products` | ✅ Bảng full-width (cố ý — nhiều cột dữ liệu), đã gỡ antd |
| Tồn kho | `/inventory` | ✅ Bảng full-width (cố ý), đã gỡ antd (`SnDetailSheet` dùng Sheet) |
| Phiếu mua hàng | `/purchase-orders` | ✅ Bảng full-width (cố ý — trang chi tiết riêng còn antd) |
| Phiếu nhận hàng | `/shipments` | ✅ Bảng full-width (cố ý) |
| Phiếu nhập kho | `/receipts` | ✅ Bảng full-width (cố ý) |
| Báo giá | `/quotations` | ✅ Bảng full-width (cố ý) |
| Phiếu xuất kho | `/deliveries` | ✅ Bảng full-width (cố ý) |
| Chuyển kho | `/transfers` | ✅ Bảng full-width (cố ý) |
| Kiểm kê | `/stocktakes` | ✅ Bảng full-width (cố ý) |
| Loại nhập/xuất | `/settings/types` | ✅ Đã dọn màu/font, không phải master-detail (config list) |
| Đồng bộ Bitrix | `/settings/bitrix` | ✅ Đã gỡ hoàn toàn antd (Form.List → `useFieldArray`) |
| Trường tùy chỉnh | `/settings/custom-fields` | ✅ Đã dọn màu/font |
| Cài đặt báo giá | `/settings/templates` | ✅ Đã dọn màu/font |
| Hành động (dashboard) | `/actions` | ✅ Xong (trước đợt redesign này) |
| Báo cáo (dashboard) | `/reports` | ✅ Xong (trước đợt redesign này) |

**Còn lại — Detail/Form page (chưa làm, còn nguyên Ant Design):** `ReceiptDetailPage`,
`ReceiptFormPage`, `PurchaseOrderDetailPage`, `PurchaseOrderCreatePage`, `QuotationDetailPage`,
`DeliveryOrderDetailPage`, `DeliveryOrderCreatePage`, `TransferOrderDetailPage`,
`TransferOrderCreatePage`, `ShipmentFormPage`, `StocktakeDetailPage`, `ProductDetailPage`,
`VariantDetailPage`, `VariantCreatePage` — và các component dòng hàng dùng chung
(`EntityFormModal`, `POLineItem`, `QuotationLineItem`, `QuotationSectionItem`,
`DeliveryLineItem`, `BundleItemsPanel`) cũng cần dựng lại trước vì nhiều trang phụ thuộc chung.

**2 trang mồ côi không có route** (không nằm trong `router.tsx`, cần hỏi lại trước khi đụng):
`QuotationCreatePage.tsx`, `SettingsVariantAttributesPage.tsx`.

### Responsive mobile — 2 lỗi thực tế đã gặp và cách chuẩn

**Master-detail trên mobile — KHÔNG để 2 cột `grid-cols-[380px_1fr]` cùng hiện:** ở màn hình hẹp,
grid 2 cột cố định làm panel chi tiết bị đẩy tràn ra ngoài màn hình, chỉ thấy được roster, không
cách nào xem/sửa chi tiết được trên điện thoại. Chuẩn bắt buộc cho mọi trang master-detail:
- Grid: `grid-cols-1 md:grid-cols-[380px_1fr]` (1 cột dưới `md`, 2 cột từ `md` trở lên).
- Thêm state `const [mobileDetail, setMobileDetail] = useState(false)` — dưới `md` chỉ hiện
  ĐÚNG 1 trong 2 khối (roster hoặc detail) tại 1 thời điểm dựa vào state này; từ `md` trở lên
  luôn hiện cả 2, bỏ qua state (dùng class `hidden md:flex`).
- Roster wrapper: `cn(..., mobileDetail && 'hidden md:flex')`.
- Detail wrapper (cả nhánh "chưa chọn gì" và nhánh "đã chọn"): `cn(..., !mobileDetail && 'hidden md:flex')`.
- Row `onClick` trong roster: set cả `selectedId` LẪN `setMobileDetail(true)`.
- Đầu khối detail thêm nút quay lại chỉ hiện trên mobile: `<button onClick={() =>
  setMobileDetail(false)} className="... md:hidden"><ChevronLeft .../>Quay lại danh sách</button>`.
- Nếu trang chi tiết là 1 component riêng (VD `CompanyDetailPanel`, `ContactDetailPanel` ở
  `CompaniesPage.tsx`) — bọc nó trong 1 wrapper div ở nơi gọi để gắn class ẩn/hiện + nút quay
  lại, không cần sửa bên trong component con.

**Bảng full-width trên mobile — PHẢI bọc `overflow-x-auto` + `min-w`:** bảng nhiều cột
(`table-fixed` hoặc không) tự co bóp/wrap chữ xấu khi màn hình hẹp thay vì cho cuộn ngang. Chuẩn
bắt buộc cho mọi bảng dữ liệu (PurchaseOrders, Receipts, Quotations, Deliveries, Transfers,
Shipments, Stocktakes, Products, Inventory...):
```
<div className="overflow-x-auto">
  <table className="w-full min-w-[880px] table-fixed">...</table>
</div>
```
`min-w` chọn theo tổng chiều rộng hợp lý của các cột (không để chữ bị bóp quá mức) — 880px cho
bảng 7 cột kiểu "phiếu/đơn từ", 900-1000px cho bảng nhiều cột hơn (Products, Inventory serial).
