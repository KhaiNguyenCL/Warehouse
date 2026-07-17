# Quyết định thiết kế — WMS DNS Technology

Ghi lại các câu hỏi và quyết định thiết kế trong quá trình xây dựng hệ thống.
https://erp.dnsvn.com/rest/78/75k0rdhvu4qawlwe/
---

## Sản phẩm & Danh mục

**Q: Consumable (dây mạng, nút mạng) có cần SKU không?**
Có. SKU là cách duy nhất phân biệt "dây CAT6 305m" vs "dây CAT5e 100m" trong kho. Không có SKU thì không thể theo dõi tồn kho riêng từng loại.

**Q: Nếu SKU là dây mạng CAT5 100m, khi xuất kho chỉ xuất 50m thì làm thế nào?**
Định nghĩa đơn vị tính (UOM) của SKU là đơn vị nhỏ nhất có thể xuất — tức là **mét**. Nhập 1 cuộn 305m → qty = 305. Xuất 50m → trừ 50. Không cần tạo SKU mới hay tách cuộn.

**Q: Tồn kho phải hiển thị đơn vị để tránh nhầm lẫn?**
Đúng. Các cột Tồn kho / Đang giữ / Khả dụng hiển thị kèm đơn vị: `305 m`, `100 cái`.

**Q: Category của License là gì — "License" hay "License Microsoft"?**
Dùng **"License" làm category cha, Brand = Cisco/Fortinet/Microsoft** để phân biệt. Không cần category con vì Brand đã đóng vai trò đó, tránh trùng lặp thông tin.

**Q: Field "Mã dòng sản phẩm" có dư thừa không?**
Không. SKU = mã ngắn trên chứng từ (PO/phiếu kho). Tên = mô tả đầy đủ cho khách đọc trên báo giá. Mã dòng sản phẩm giúp ghép thành product code: `SW-CSC-SG110`. Nếu Cisco có thêm SG350 thì chỉ Category+Brand sẽ bị trùng mã.

**Q: Khi chọn SKU vào phiếu nhập thì chọn từ SKU hay tên?**
Kết hợp cả hai — hiển thị dạng `SKU — Tên` trong dropdown. Ví dụ: `SW-CSC-SG110 — Cisco SG110 8-Port Gigabit Switch`. Hiện tại hệ thống đã làm đúng pattern này.

**Q: Category và Brand có bắt buộc khi tạo sản phẩm không?**
- **Category: bắt buộc** — cần để phân nhóm, gợi ý mã, lọc báo cáo.
- **Brand: tùy chọn** — dây mạng, phụ kiện generic thường không có hãng. Bắt buộc brand sẽ buộc team tạo brand giả "No Brand".

---

## License

**Q: License có SN không?**
Tuỳ loại:
- **License key (file/email)** — không có SN, dùng `service` hoặc `consumable`
- **License gắn thiết bị** (Cisco SmartNet, FortiCare) — dùng `service`, gắn với SN của thiết bị
- **Dongle/USB** — có SN vật lý, dùng `storable`

Với DNS Tech bán thiết bị mạng, license thường là `service` đi kèm thiết bị.

**Q: License MS có thời hạn (2 năm từ khi active), router có license — WMS có quản lý được không?**
Hệ thống hiện tại **không quản lý được** vòng đời license chính xác:
- License MS: ngày hết hạn tính từ lúc khách active, WMS không biết thời điểm đó
- License gắn router: có thể dùng custom field `license_end` trên serial number, nhưng phải nhập tay, không tự cảnh báo

**Quyết định:** License renewal do sales theo dõi qua Bitrix CRM. WMS chỉ cần biết "đã bán license X cho khách Y" qua DO. Nếu sau này cần cảnh báo renewal thì build module riêng, tránh over-engineer giai đoạn này.

---

## UI / UX`

**Q: Tab Tồn kho — nên tổ chức theo SKU → Kho → SN hay SKU → SN?**
**SKU → SN** (phẳng hơn). Field kho đi với từng SN, không cần tầng kho trung gian. Mỗi dòng SN hiển thị: Serial No, Trạng thái, Kho, MAC, Phiếu nhập · Ngày. Click dòng SN → mở drawer chi tiết + lịch sử di chuyển.

**Q: Khi tạo SKU mới, có điền sẵn thông tin từ sản phẩm không?**
Có — tự điền:
- SKU ← `product.code`
- Tên ← `product.name`
- Đơn vị, giá nhập/bán, bảo hành, cân nặng, reorder point ← kế thừa từ SKU đầu tiên của sản phẩm (nếu có)
