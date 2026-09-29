import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from 'react'

// Cơ chế cho phép trang (bên trong <Outlet/>) "đẩy" tiêu đề + nút hành động của nó lên
// topbar dùng chung ở AppLayout, thay vì mỗi trang tự vẽ 1 hàng tiêu đề riêng bên dưới
// topbar — gộp lại còn 1 hàng cố định duy nhất, tiết kiệm ~48px chiều cao mỗi trang.
const PageHeaderContext = createContext<((node: ReactNode) => void) | null>(null)

export function PageHeaderProvider({ children }: { children: (header: ReactNode) => ReactNode }) {
  const [header, setHeader] = useState<ReactNode>(null)
  return (
    <PageHeaderContext.Provider value={setHeader}>
      {children(header)}
    </PageHeaderContext.Provider>
  )
}

// Gọi ở đầu component trang: usePageHeader(<div>...</div>). Dùng useLayoutEffect (chạy đồng bộ
// trước khi vẽ) chứ không phải useEffect thường — tránh nháy trắng 1 khung hình giữa lúc dọn
// header cũ (cleanup) và set header mới khi chuyển trang.
export function usePageHeader(node: ReactNode) {
  const setHeader = useContext(PageHeaderContext)
  useLayoutEffect(() => {
    setHeader?.(node)
    return () => setHeader?.(null)
  })
}

// Cơ chế tương tự usePageHeader, nhưng cho phép trang (WarehousesPage/CompaniesPage — 2 trang
// đầu tiên dùng layout .kv-md* tràn viền theo mockup export/warehouses.html) báo cho AppLayout
// bỏ hẳn padding p-6 mặc định quanh <Outlet/> — nếu không, phần đệm xám của layout khung ngoài
// vẫn lộ ra quanh khối trắng .theme-2a (dù .theme-2a tự vẽ nền trắng, nó vẫn bị AppLayout đệm
// vào giữa 1 khung xám --bg-page). KHÔNG dùng cách trừ margin âm (-m-6) như các trang bảng
// full-width cũ (ProductsPage/InventoryPage) — vì các trang đó không có chuỗi flex tự khớp
// chiều cao `h-full min-h-0` mà WarehousesPage/CompaniesPage cần cho phần roster cuộn riêng;
// margin âm trên 1 box height:100% sẽ làm box cao/rộng lệch khỏi vùng cha đúng bằng 2 lần
// margin, phá chuỗi tự khớp đó. Báo trực tiếp cho AppLayout đổi hẳn class wrapper (p-6 → p-0)
// tránh toàn bộ vấn đề toán margin/height này.
const PageNoPaddingContext = createContext<((flag: boolean) => void) | null>(null)

export function PageNoPaddingProvider({ children }: { children: (noPadding: boolean) => ReactNode }) {
  const [noPadding, setNoPadding] = useState(false)
  return (
    <PageNoPaddingContext.Provider value={setNoPadding}>
      {children(noPadding)}
    </PageNoPaddingContext.Provider>
  )
}

// Gọi ở đầu component trang: usePageNoPadding(). Cũng dùng useLayoutEffect như usePageHeader để
// tránh nháy khung viền xám 1 frame khi chuyển trang.
export function usePageNoPadding() {
  const setNoPadding = useContext(PageNoPaddingContext)
  useLayoutEffect(() => {
    setNoPadding?.(true)
    return () => setNoPadding?.(false)
  })
}
