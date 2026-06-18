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

## 5. Item Status (Serial Number)

Chỉ áp dụng cho **storable**. Vị trí xác định qua `warehouse_id`.

| Status | warehouse_id | Mô tả |
|---|---|---|
| active | ID kho | Đang trong hệ thống, xem warehouse_id để biết vị trí |
| sold | null | Đã bán / xuất nội bộ |
| disposed | null | Đã huỷ |
| (hard delete) | — | Khi return_out — xoá khỏi database |

---

## 6. Trạng thái các đối tượng

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

## 7. Tồn kho & Reserved

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

---

## 8. Các loại nhập kho (import_type)

| Type | Mô tả | Document gốc | NCC/KH |
|---|---|---|---|
| purchase | Mua hàng mới từ NCC | Nhập thủ công | NCC bắt buộc |
| return_in | Khách trả lại (SN đã sold) | Quotation gốc | KH bắt buộc |
| adjustment | Điều chỉnh tồn kho thừa | Stocktake Result | Không cần |

> **warranty_in và demo_in KHÔNG phải Receipt** — là Transfer Order vì SN vẫn còn trong hệ thống, chỉ cần đổi warehouse_id.

---

## 9. Các loại xuất kho (export_type)

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

## 10. Các loại chuyển kho (transfer_type)

| Type | Mô tả | Kho nguồn | Kho đích |
|---|---|---|---|
| transfer | Chuyển kho thông thường | Kho vật lý A | Kho vật lý B |
| warranty_in | Nhận lại sau bảo hành | Kho ảo Bảo hành | Kho vật lý |
| demo_in | Nhận lại sau demo | Kho ảo Demo | Kho vật lý |
| qc_pass | Hàng qua QC đạt | Kho ảo Chờ QC | Kho vật lý |
| sn_ready | Đã nhập SN xong | Kho ảo Chờ nhập SN | Kho vật lý |

---

## 11. Approve workflow

- **1 cấp duyệt** — Manager hoặc Admin
- Áp dụng cho: Receipt, Delivery Order, Transfer Order
- Nếu người tạo có quyền approve → tự approve cho mình
- Trạng thái: Draft → Pending Approval → Approved → Completed

---

## 12. Companies (KH + NCC)

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

## 13. Tích hợp Bitrix CRM

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

## 14. Template Module (Xuất báo giá)

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

## 15. RBAC (Phân quyền)

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
quotation.create / quotation.edit / quotation.confirm / quotation.view
receipt.create / receipt.approve / receipt.complete / receipt.view
delivery.create / delivery.approve / delivery.complete / delivery.view
transfer.create / transfer.approve / transfer.complete / transfer.view
stocktake.create / stocktake.complete / stocktake.view
report.inventory / report.revenue / report.view
settings.roles / settings.users / settings.warehouse / settings.products
```

---

## 16. Database Schema

### Danh sách bảng (34 bảng)

```
Users & RBAC          roles, permissions, role_permissions, users
Companies & Contacts  companies, company_types, contacts
Warehouses            warehouses
Product Catalog       categories, products, variants,
                      bundle_items, variant_suppliers
Inventory             serial_numbers, stock_batches, inventory,
                      reserved_items, stock_movements
Receipts              receipts, receipt_lines
Delivery Orders       delivery_orders, delivery_order_lines
Transfer Orders       transfer_orders, transfer_order_lines
Quotations            quotations, quotation_sections,
                      quotation_line_items
Stocktake             stocktakes, stocktake_lines, stocktake_results
Template Module       document_templates, template_field_mappings
Custom Fields         custom_fields, field_values
Settings              import_types, export_types
```

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

// Tiến độ xuất hàng
exported_qty = SUM(DO Completed qty)
pending_qty  = SUM(DO Draft/Approved qty)
remaining_qty = total_qty - exported_qty - pending_qty
// remaining_qty = 0 → khoá Quotation

// Stock batch
stock_batch.qty_remaining = qty_total - SUM(xuất từ batch này)

// Inventory khi Receipt Completed:
inventory.qty_on_hand += receipt_line.quantity
inventory.avg_cost = (old_qty * old_avg + new_qty * new_cost) / (old_qty + new_qty)

// Inventory khi DO Completed:
inventory.qty_on_hand -= delivery_line.quantity
inventory.qty_reserved -= delivery_line.quantity

// Inventory khi Quotation Confirmed:
inventory.qty_reserved += quotation_line.quantity (nếu is_reserved = true)

// Inventory khi Quotation Cancelled/Expired:
inventory.qty_reserved -= quotation_line.quantity
```

---

## 17. Cấu trúc thư mục

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

## 18. Lộ trình triển khai

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

## 19. Lưu ý khi code

**Business logic:**
- Dùng UUID cho tất cả primary key
- Tất cả timestamp dùng UTC (`TIMESTAMPTZ` trong PostgreSQL)
- `ref_document_type` + `ref_document_id` là polymorphic relation — validate kỹ
- Khi Receipt/DO Completed → tự động tạo `stock_movements`
- Khi Quotation `expired_at` đến → job tự động → Expired, giải phóng reserved
- **warranty_in / demo_in → Transfer Order**, không phải Receipt
- **return_out → hard delete SN** khỏi database
- Bundle → expand sản phẩm con khi tạo reserved_items và DO lines
- FIFO/LIFO cấu hình trong Settings, mặc định FIFO
- Approve: check permission `{object}.approve` trước khi cho duyệt
- `remaining_qty` là computed field — tính từ DO, không lưu trong database
- Stocktake snapshot: lưu `qty_system` vào `stocktake_lines` tại thời điểm tạo
- Company fetch từ Bitrix: lưu `bitrix_company_id` để sync

**Kỹ thuật (stack đã chốt):**
- Mỗi module Fastify export 1 plugin: `fastify.register(receiptModule, { prefix: '/receipts' })`
- Repository layer chỉ dùng Knex — không viết raw SQL string trực tiếp trong service
- Shared types trong `packages/types` — import qua `@wms/types`, không duplicate interface
- Serial chọn trực tiếp trong request body lúc Complete (không qua bảng staged riêng); `serial_numbers.delivery_line_id` = audit (sau Complete)
- `stocktake_lines.difference` là generated column PostgreSQL — không update thủ công
- Migration dùng Knex migration (không chạy file SQL thủ công trong production)
- JWT payload chỉ chứa `{ sub: userId, roleId }` — permission check query DB mỗi request qua middleware
