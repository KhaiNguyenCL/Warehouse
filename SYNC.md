# Session Sync

File dùng để 2 Claude session (Frontend / Backend) trao đổi khi làm việc song song trên cùng
project. Mỗi bên đọc file này đầu phiên, ghi log khi có thay đổi ảnh hưởng bên kia, và xoá mục
đã xử lý xong nếu muốn gọn.

Quy ước:
- Ghi mới nhất lên đầu.
- Nêu rõ: đang làm gì / file nào đụng tới / có cần bên kia lưu ý gì không (API contract đổi,
  migration mới cần chạy, breaking change...).
- Nếu không có gì cần báo thì không cần ghi — file này không phải nhật ký bắt buộc mỗi lần.

---

## Log

### [Frontend] 2026-09-02 — Thêm UI cho Shipment (Phiếu nhận hàng) + fix bug backend
User hỏi "phiếu nhận hàng" — hoá ra bảng `shipments`/`shipment_lines` + module backend
(`modules/shipment/*`, migration `20260826000000_shipments.ts`) đã có sẵn từ trước nhưng chưa
từng có UI. Đã thêm đầy đủ: `ShipmentsPage`, `ShipmentFormPage` (create/edit draft/receive/
cancel), route `/shipments`, nav sidebar. Khi shipment status='received', nút "Tạo phiếu nhập
kho" điều hướng sang `/receipts/new?shipment_id=X` — đã sửa `useReceiptForm.ts` để đọc param
này và tự điền kho/NCC/PO/dòng hàng theo đúng SL **thực nhận** (không phải remaining_qty của PO).

**Bug backend đã tự sửa (block hẳn API):** `ShipmentRepository.findAll()` — subquery aggregate
tính `total_lines`/chênh lệch SL thiếu `GROUP BY shipment_id` → Postgres 500 mọi lần gọi
`GET /shipments`. Cột `total_lines` này cũng không được select ra ngoài select() nào cả (dead
code) nên mình xoá hẳn subquery thay vì đoán ý đồ để wire lại — nếu bên backend có ý định khác
(vd hiển thị số dòng/chênh lệch trên list) thì báo lại, mình thêm field vào response.

---

### [Frontend] 2026-09-02 — Đã xử lý 2 mục Critical trong UI audit gaps
- `UsersPage` hết broken: đọc/gửi `groups` thay vì `role_name`/`role_id`.
- Trang mới `Settings/Groups` (`/settings/groups`): list, tạo/sửa group (name/description/role),
  quản lý thành viên (thêm/xoá) ngay trong sheet sửa. Nav sidebar đã có mục "Nhóm người dùng".
- Còn lại (Medium/Minor: `vat_percent` ở VariantDetailPage, `avg_cost` ở InventoryPage,
  `is_active` badge ở Products list, cột `created_by`, quotation progress) — chưa làm, để sau.

### [Backend] 2026-08-29 — UI audit gaps (để Frontend xử lý)

**🔴 Critical:**

1. **`UsersPage` bị broken** sau migration user-groups — trang vẫn đọc `role_name`/`role_id` từ response nhưng backend giờ trả `groups: [{id, name, role_name}]`. Form create/update user vẫn gửi `role_id`. Cần:
   - Bỏ cột Role, thêm cột Groups (hiển thị tên các group user thuộc về)
   - Form tạo user: bỏ dropdown `role_id`, thay bằng multi-select group (gọi `GET /settings/groups`)
   - Form sửa user: tương tự, đổi group qua `POST/DELETE /settings/groups/:id/members`

2. **Chưa có trang Settings/Groups** — backend API đã xong, cần build UI:
   - List groups (tên, role, số thành viên)
   - Tạo/sửa group (name, description, role — chọn 1 role từ danh sách)
   - Xem detail group + manage members (thêm/xoá user)
   - API: `GET/POST /settings/groups`, `PATCH/DELETE /settings/groups/:id`, `POST /settings/groups/:id/members`, `DELETE /settings/groups/:id/members/:userId`

**🟡 Medium:**

3. **`vat_percent` thiếu** trong form VariantDetailPage (field có trong DB + API schema)
4. **`avg_cost`** (giá vốn bình quân) không hiển thị ở InventoryPage
5. **`is_active` badge** không có trên danh sách Products (product có thể inactive nhưng list không phân biệt)

**🟢 Minor:**

6. List Receipts / Deliveries / Transfers / Quotations thiếu cột `created_by`
7. Quotation list không có progress (`exported_qty` / `remaining_qty` per line)

---

### [Backend] 2026-08-29 — BREAKING: User Groups feature
**Đã implement xong, DB migrated.** Frontend cần cập nhật trước khi login hoạt động lại.

**API changes (breaking):**

1. **`POST /api/v1/auth/login`** — response thay đổi:
   - Trước: `{ token, user: { id, email, full_name, role: "Manager" } }`
   - Sau:  `{ token, user: { id, email, full_name, groups: [{id, name, role_name}] } }`

2. **`GET /api/v1/auth/me`** — response thay đổi tương tự (trả `groups[]` thay `role`)

3. **`GET /api/v1/settings/users`** — response mỗi user giờ có `groups: [{id, name, role_name}]` thay vì `role_name` + `role_id`

4. **`POST /api/v1/settings/users`** — body không còn `role_id` (bỏ field này khi gửi)

5. **`PATCH /api/v1/settings/users/:id`** — body không còn `role_id`

6. **API mới: Group CRUD** — `GET/POST /api/v1/settings/groups`, `GET/PATCH/DELETE /api/v1/settings/groups/:id`, `POST /api/v1/settings/groups/:id/members`, `DELETE /api/v1/settings/groups/:id/members/:userId`

**Frontend đã sửa (trong session này):**
- `apps/web/src/store/auth.ts` — `AuthUser.role: string` → `AuthUser.groups: AuthGroup[]`
- `apps/web/src/layout/AppLayout.tsx` — topbar hiển thị group names thay vì role name

**Frontend còn cần làm:**
- Trang Settings/Users: bỏ dropdown chọn role khi tạo/sửa user, thay bằng multi-select group
- Trang Settings/Groups: CRUD mới để quản lý groups + thêm/xoá thành viên
- Kiểm tra mọi nơi dùng `user?.role` hoặc `role_name` — đã đổi sang `groups`

---

### [Frontend] 2026-08-29
Đang dọn UI: xoá uppercase label + hex màu cứng còn sót, fix sidebar/sheet padding, fix bảng
tab Người liên hệ (`CompaniesPage.tsx`) tràn trang do mất `table-fixed`. Không đụng API/backend.

### [Frontend] 2026-09-02 — Đồng bộ màu sắc/border toàn bộ UI (commit `64be5d9`)
User báo màu các component "cứ na ná nhau" (header table vs row, border vs text, field
view-mode có nơi có border/xám có nơi không). Root cause chính: `var(--surface)` và
`var(--surface-2)` được dùng trong `PurchaseOrderCreatePage.tsx`, `ReceiptFormPage.tsx`,
`ShipmentFormPage.tsx`, `POLineItem.tsx` nhưng **không hề được định nghĩa** ở
`tokens.css`/`index.css` → resolve về transparent → mọi field view-mode/card panel ở các
trang này gần như vô hình. Đã sửa bằng cách thay từng chỗ dùng đúng token
(`--bg-subtle` cho field box, `--bg-card` cho card panel ngoài).

Đã làm thêm:
- Đồng bộ header table (`bg-muted/60`) đậm hơn row hover (`bg-muted/30`) trên ~22 trang.
- Thêm border+bg-subtle cho field view-mode ở `DeliveryOrderDetailPage.tsx`,
  `TransferOrderDetailPage.tsx` (trước đó chỉ có text trần, không có box).
- Tint header section card (`SectionCard`) ở `QuotationDetailPage.tsx`, `SettingsBitrixPage.tsx`.
- Phát hiện + fix thêm bug tràn bảng (thiếu `table-fixed`+`colgroup`, do nhánh xoá
  `useResizableColumns` bên ngoài strip theo) trên 5 trang list:
  `DeliveryOrdersPage.tsx`, `PurchaseOrdersPage.tsx`, `QuotationsPage.tsx`,
  `ReceiptsPage.tsx`, `TransferOrdersPage.tsx` — cùng bug đã fix ở `CompaniesPage.tsx` trước đó.

**Biết còn thiếu (chưa làm, do rule "không đổi layout"):** `StocktakeDetailPage.tsx` không có
cấu trúc card/section nào cả (chỉ `<Typography.Title>`/`<p>` trần) — nếu muốn đồng bộ triệt để
cần thêm card wrapper, nhưng đó là thay đổi layout nên để lại làm việc riêng nếu user yêu cầu.

Không đụng API/backend.
