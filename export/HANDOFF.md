# Kho — UI handoff (dành cho AI/dev áp vào code thật)

## File
- `broadsheet.css` — token gốc của design system (màu, spacing, radius, component classes `.btn/.tag/.table…`). **Không sửa trực tiếp** trừ khi muốn đổi toàn hệ thống.
- `app.css` — lớp class riêng của app, prefix `.kv-*`. File được viết theo kiểu "append": các khối ở CUỐI file ghi đè khối trước. Khi port sang code thật, **gộp lại theo giá trị cuối cùng** (xem mục "Giá trị cuối cùng").
- `inventory.html` — trang Tồn kho (bản chốt, v2).
- `products.html` — danh sách Sản phẩm.
- `product-detail.html` — chi tiết Sản phẩm + bảng SKU con + dòng thêm SKU inline + panel "Thêm SKU" (hiển thị tĩnh bên dưới; trong code thật là drawer trượt từ phải).
- `sku-serials.html` — chi tiết SKU, tab **Serial**: header thông tin chung của SKU (facts), tab ngang, lọc trạng thái dạng segmented có đếm, bảng serial.

- `warehouses.html` — Kho hàng: master–detail (danh sách trái + chi tiết phải).
- `purchase-new.html` — Tạo phiếu mua hàng từ deal Bitrix.
- `import-new.html` — Tạo phiếu nhập: form nguồn hàng + bảng dòng hàng + thanh hành động dính đáy + panel nhập serial (drawer, hiển thị tĩnh bên dưới).

## ⚠ app.css đã được gộp
`app.css` giờ là **một file sạch, không còn lớp override**. Mọi kích thước/màu là biến `--kv-*` ở mục 1 của file. HTML **không** chứa size/màu inline (chỉ còn `width` cho cột bảng).

## Quy tắc density (bắt buộc cho mọi trang/tab)
| Thứ | Giá trị | Biến |
|---|---|---|
| Độ rộng trang | 1440px cố định | `--kv-page-w` |
| Lề trái/phải | 24px | `--kv-gutter` |
| Control (input/select/button/segmented/bulk bar) | cao 36px, padding ngang 12px | `--kv-ctrl-h`, `--kv-ctrl-px` |
| Control nhỏ (trong bảng, pager, nav search) | cao 32px | `--kv-ctrl-h-sm` |
| Ô bảng | padding 10px dọc × 10px ngang → dòng ≈44px (1 dòng) / ≈56px (có subtext) | `--kv-cell-py/px` |
| Khoảng cách | 4 · 8 · 12 · 16 · 24 · 32 px | `--kv-gap-xs…2xl` |
| Giữa control trong 1 hàng | 8px | `--kv-gap-sm` |
| Giữa field trong form | 12px | `--kv-gap-md` |
| Giữa các vùng (head → tabs → toolbar → bảng) | 24px / 16px | `--kv-gap-xl` / `--kv-gap-lg` |
| Icon | 18px (trong ô search 16px) | `--kv-icon` |

**Type scale — chỉ 5 size:** 12 (subtext, label, header bảng, tag) · 13 (pager, hint, control nhỏ) · 14 (body, ô bảng, control) · 18 (tiêu đề section) · 28 (tiêu đề trang, mọi trang giống nhau).

**Thứ tự vùng cố định cho mọi trang dạng danh sách / tab:**
`nav → head (crumb + title + actions) → [facts] → [tabs] → toolbar → [bulk bar khi có chọn] → bảng → pager`

**Một kiểu tab duy nhất** (`.kv-tabs`: gạch chân teal 2px, kẻ dưới toàn hàng). Lọc trạng thái trong toolbar dùng `.kv-seg` (cao bằng control 36px) — không dùng tab thứ hai.

## Giá trị cuối cùng (đã override design system gốc)
| Token | Giá trị |
|---|---|
| Font heading + body | `Be Vietnam Pro` 400/500/600/700 (Google Fonts), fallback `system-ui, sans-serif` |
| Nền trang, nền ô nhập (`--color-bg`, `--color-surface`) | `#ffffff` |
| Chữ chính (`--color-text`) | `#111111` |
| Chữ phụ (subtext, nav, tab, pager, hint, "Đủ tồn") | `#4a4a4a` |
| Header bảng, label ô nhập | `#333333`, weight 500–600 |
| Icon phụ, caret | `#5c5c5c` |
| Accent (nút chính, tab active, focus) | `--color-accent` `#0088b0`; hover `--color-accent-600` |
| Link | `--color-accent-800` |
| Accent phụ (cảnh báo: Sắp hết / Hết hàng / Cận hạn) | `--color-accent-2` `#d6006c` + ramp |
| Viền ô nhập / nút | `--color-neutral-400`; hover `--color-neutral-600` |
| Kẻ dòng bảng | `--color-neutral-200`; kẻ dưới header `--color-neutral-400` |
| Hover dòng bảng | `--color-accent-100` |
| Bo góc | `--radius-md` = 2px (gần vuông); tag bo 1.5px — **không dùng pill tròn** |
| Focus | `outline: 2px solid var(--color-accent); outline-offset: 2px` |

## Nguyên tắc layout (giữ khi làm trang mới)
1. **Không card nổi khối** — bảng/form nằm phẳng trên nền trắng, không box-shadow, không khung bo góc bao ngoài.
2. **Desktop cố định 1440px** (`.kv-sheet { width:1440px; min-width:1440px }`) — màn hẹp thì cuộn ngang, không reflow. Nút/nav/tab/filter `white-space: nowrap`.
3. **Control cao 36px** (nhỏ 32px), padding ngang 10–14px.
4. **Toolbar 1 hàng**: search (320px) → các select lọc co theo nội dung → spacer → Cột / Xuất Excel (ghost) bên phải.
5. **Nút header trang**: secondary viền (Quét mã, Nhập kho, Xuất kho) + 1 primary teal (Thêm…) ở ngoài cùng phải.
6. **Form**: kiểu nhóm-nhãn-bên-trái (`.kv-form-grid` 170px | 1fr, body max 520px). Mặc định **1 field / dòng**. Chỉ ghép 2–3 field cùng dòng khi là một ý (Giá nhập + Giá bán; Kho → Kệ → Tầng; Model + Part number).
7. **Số liệu**: căn phải, `font-variant-numeric: tabular-nums`. Mã (SKU, part number, số lô) cũng tabular.
8. **Không cắt mã SKU** — cột SKU đủ rộng (≈200px).
9. **Trạng thái tồn — chỉ tô màu ngoại lệ**:
   - Đủ tồn → `.kv-tag--ok` (chữ xám, không nền)
   - Sắp hết → `.kv-tag--low` (nền magenta nhạt) + dòng có `.kv-row--alert` (vạch magenta 2px mép trái)
   - Hết hàng → `.kv-tag--out` (nền magenta đặc, chữ trắng) + `.kv-row--alert`
   - Cận hạn → `.kv-tag--exp` (viền magenta)
10. **Loại sản phẩm** (4 màu): Thiết bị `.kv-tag--device` (teal nhạt) · Vật tư `.kv-tag--supply` (neutral) · Dịch vụ `.kv-tag--service` (viền teal) · Gói sản phẩm `.kv-tag--bundle` (magenta nhạt).
11. **Lô/HSD**: hàng không theo lô → một dòng "Không theo lô" (xám); có lô → 2 dòng (số lô / HSD dd.mm.yyyy).
12. **Chọn nhiều dòng** → hiện `.kv-bulk` (nền teal nhạt) phía trên bảng: Nhập nhanh · Xuất nhanh · In tem · Chuyển kho · Bỏ chọn.
13. Mọi dòng bảng có caret ">" và click cả dòng để mở chi tiết.
14. **Icon**: Phosphor, weight **duotone** thống nhất (`ph-duotone ph-*`).
15. **Nav**: tối đa ~5 mục + 2 dropdown ("Giao dịch", "Thêm"); mục active = gạch chân teal 2px, không pill.

## Định dạng dữ liệu
- Tiền: `1.850.000` (dấu chấm ngăn nghìn, không ký hiệu trong ô; ghi "(₫)" ở label).
- Ngày: `dd.mm.yyyy`.
- Tồn / tối thiểu: `**7** / 5` — số tồn đậm, tối thiểu xám. Nếu chưa đặt tối thiểu → hiện `—` (đừng hiện 0).

## Việc còn lại khi port
- Gộp các khối override trong `app.css` thành một bộ CSS sạch (hoặc map sang Tailwind/theme của framework).
- Nếu giữ Be Vietnam Pro lâu dài: đổi luôn `--font-heading/--font-body` trong `broadsheet.css` (hiện đang override ở `app.css`).
- Thay logo chữ "DNS" trên nav bằng logo thật.
- Hover state đang là CSS thuần; drawer "Thêm SKU", dropdown nav, bulk bar cần JS thật.
- Dữ liệu trong HTML là mẫu.

## Tab Serial (sku-serials.html)
- Thông tin **giống nhau cho mọi serial** (kho nhập, phiếu nhập gốc, số tháng BH) đưa lên dải facts đầu trang, **không lặp lại** trong bảng.
- Cột: Serial (đậm, mono) + MAC ở subtext; thiếu MAC → link "+ Thêm MAC" thay vì "—".
- Trạng thái vòng đời: Trong kho `.kv-tag--instock` · Đã xuất `.kv-tag--sold` · Bảo hành/RMA `.kv-tag--rma`.
- "Vị trí / khách hàng": trong kho → Kho · Kệ; đã xuất → tên khách; RMA → "Gửi hãng · mã RMA".
- BH hãng hiện ngày hết hạn + "còn N tháng"; BH công ty tính từ ngày xuất (chưa xuất → "Tính từ ngày xuất").
- Bỏ cột "#". Bulk: Xuất kho · In tem serial · Chuyển vị trí · Tạo phiếu bảo hành.

## Phiếu nhập (import-new.html) — áp tương tự cho Phiếu xuất
- **Loại nhập** là segmented (`.kv-seg`), quyết định trường phụ: Mua hàng → Nhà cung cấp + Số/ngày hoá đơn; Khách trả → Khách hàng + phiếu xuất gốc; Chuyển kho → Kho nguồn.
- Nhóm form: "Nguồn hàng" / "Nhập vào". Mỗi dòng 1 field; chỉ ghép Kho + Ngày, Số HĐ + Ngày HĐ.
- Mọi input/textarea nền **trắng** có viền — nền xám chỉ dành cho `disabled`.
- Dòng hàng: # · Sản phẩm (tên đậm + SKU·đơn vị) · Tồn hiện tại · Số lượng (mặc định 1) · Giá nhập (tự điền giá vốn gần nhất) · Thành tiền · Serial · xoá.
- Cột Serial: hàng theo serial → nút "x / n serial" (magenta khi thiếu, xám khi đủ) mở drawer; hàng không theo serial → chữ "Không theo serial". Bảo hành lấy tự động theo SKU, không nhập theo dòng.
- Nút xoá dòng = icon thùng rác, chỉ hiện khi hover/focus dòng.
- **Không** có dòng trống sẵn và nút "+ Thêm dòng" full-width. Thêm dòng bằng một ô "Quét mã / tìm hàng" cuối bảng; quét trùng SKU → cộng dồn SL.
- Thanh `.kv-footer-bar` sticky đáy: số dòng · tổng SL · tổng tiền · cảnh báo thiếu serial · Huỷ / Lưu nháp / Tạo phiếu (disabled + title lý do khi thiếu serial).
- Drawer serial 480px: tiến độ x/n, ô quét liên tục (Enter = 1 serial), dán hàng loạt, báo trùng.

## Phiếu mua hàng (purchase-new.html)
- **Dữ liệu đọc-chỉ (lấy từ Bitrix) hiển thị bằng chữ, KHÔNG dùng input.** Dùng `<dl class="kv-dl">` lưới 3 cột: nhãn 12px xám + giá trị 14px đậm vừa. Giá trị trống → `.kv-empty` "Chưa có trên deal" (không dùng "—" trong ô).
- Khối Deal: ô Deal ID (240px) + nút "Lấy dữ liệu" + trạng thái đồng bộ; bên dưới là tên deal (18px) kèm link "Mở trên Bitrix ↗" (thay cho ô Link deal).
- Input chỉ dành cho thứ người dùng thật sự nhập: Kho nhận, Ngày dự kiến về, Ghi chú.
- Bảng hàng: # · Sản phẩm (tên + SKU·đơn vị) · SL · Đơn giá · VAT (select 0/5/8/10%, mặc định theo SKU) · Thành tiền (text, không phải input) · ghi chú (icon, teal khi có nội dung) · xoá (hover).
- **Không** có cột BH hãng / BH công ty — lấy theo SKU.
- 3 dòng tổng: Trước thuế · VAT · Tổng thanh toán (đậm), căn phải thẳng cột Thành tiền.
- Nút "Lấy sản phẩm từ deal" để đổ dòng hàng từ Bitrix.

## Master–detail (warehouses.html) — dùng cho các danh mục ít bản ghi (kho, đơn vị, danh mục…)
- Cột trái 340px, phẳng, kẻ phải 1px — **không card, không bóng, không bo lớn**. Lọc trạng thái = `.kv-seg--sm` (không dùng tab).
- Item: tên (đậm, chữ chính) trên, mã (mono, subtext) dưới — tên luôn nổi hơn mã. Tag bên phải: Mặc định (teal nhạt), Ảo (viền xám).
- Item đang chọn: nền `--color-accent-100` + vạch teal 3px mép trái.
- Chi tiết: tiêu đề 22px + tag, hàng dưới "mã · loại"; nút Sửa / Xoá có chữ (không chỉ icon).
- Thông tin dạng `.kv-dl` 3 cột, đọc-chỉ. **Trạng thái hiển thị bằng chấm + chữ, không phải toggle** — đổi trạng thái trong form Sửa.
- Trường trống: "Chưa nhập" + link thêm nhanh.
- Không dùng xanh lá; trạng thái bật = teal, tắt = neutral.
