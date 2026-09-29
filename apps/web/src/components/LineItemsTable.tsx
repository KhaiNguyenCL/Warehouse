import { Fragment } from 'react'

// Bảng "Danh sách sản phẩm" dùng chung cho MỌI trang xem (view/detail) phiếu — PO, Receipt,
// Delivery, Transfer, Shipment, Quotation — để không lặp lại cols-loop + JSX table ở từng trang.
// Trích xuất nguyên công thức đã có ở PurchaseOrderCreatePage.tsx::ViewLinesTable (đã được duyệt
// làm chuẩn — ảnh PO-2026-0040 chính là bảng này) — chỉ generic hoá kiểu dữ liệu, KHÔNG đổi
// hành vi/style. Dùng class `kv-table` (kv.css, chỉ resolve trong `.theme-2a`).
//
// KHÔNG dùng cho bảng NHẬP LIỆU (create/edit) — các trang đó cần input/nút xoá/dòng thêm mới
// trong <tr>, tự bọc <table className="kv-table kv-lines"> riêng theo mẫu
// ReceiptFormPage.tsx::CreateLinesTable (xem comment ở đó).

export interface LineItemsColumn<T> {
  key: string
  label: string
  align?: 'left' | 'right' | 'center'
  width?: number | string
  render: (row: T, index: number) => React.ReactNode
}

interface LineItemsTableProps<T> {
  cols: LineItemsColumn<T>[]
  rows: T[]
  rowKey?: (row: T, index: number) => React.Key
  emptyMessage?: string
  minWidth?: number
  // Chặn bảng kéo full-width khi ít cột + table-layout:fixed — không có maxWidth, cột không
  // khai width (VD "Sản phẩm") sẽ nuốt hết phần trống còn lại của container do kv-table mặc
  // định width:100%, trông "bè" hẳn ra dù nội dung chỉ vài chữ (VD ReceiptFormPage view mode).
  maxWidth?: number
  // Style viền bo góc dưới khi bảng này nằm lồng trong 1 khối khác (VD sub-section của Quotation)
  // — thay cho việc mỗi nơi tự viết `style={{ border: '1px solid #b0c4e8', ... }}` hardcode hex.
  nested?: boolean
  // Dòng chi tiết mở rộng theo từng dòng (VD "Chi tiết" BH hãng/BH cty ở ReceiptFormPage) — component
  // CHỈ render, việc bật/tắt (state `expanded`) vẫn do trang gọi tự quản lý qua `isExpanded`.
  renderExpanded?: (row: T, index: number) => React.ReactNode
  isExpanded?: (row: T, index: number) => boolean
  // Dòng tổng cộng cuối bảng (tfoot) — trang gọi tự tính, component chỉ chèn nguyên JSX vào.
  footer?: React.ReactNode
  // Bật table-layout:fixed + <colgroup> khi cần khoá độ rộng cột (không dùng `cols[].width` thì bỏ qua).
  fixedLayout?: boolean
}

export function LineItemsTable<T>({
  cols, rows, rowKey, emptyMessage = 'Không có sản phẩm', minWidth, maxWidth, nested,
  renderExpanded, isExpanded, footer, fixedLayout,
}: LineItemsTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table
        className="kv-table"
        style={{
          minWidth,
          maxWidth,
          width: maxWidth != null ? 'auto' : undefined,
          tableLayout: fixedLayout ? 'fixed' : undefined,
          ...(nested ? { border: '1px solid color-mix(in srgb, var(--accent) 35%, transparent)', borderTop: 'none', borderRadius: '0 0 6px 6px' } : undefined),
        }}
      >
        {fixedLayout && (
          <colgroup>
            {cols.map((c) => <col key={c.key} style={c.width != null ? { width: c.width } : undefined} />)}
          </colgroup>
        )}
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c.key} className={c.align === 'right' ? 'num' : c.align === 'center' ? 'text-center' : 'text-left'}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const expanded = isExpanded?.(row, i)
            return (
              <Fragment key={rowKey ? rowKey(row, i) : i}>
                <tr>
                  {cols.map((c) => (
                    <td key={c.key} className={c.align === 'right' ? 'num mono' : c.align === 'center' ? 'text-center' : ''}>{c.render(row, i)}</td>
                  ))}
                </tr>
                {expanded && renderExpanded && (
                  <tr>
                    <td colSpan={cols.length} style={{ background: 'var(--bg-subtle)' }}>{renderExpanded(row, i)}</td>
                  </tr>
                )}
              </Fragment>
            )
          })}
          {rows.length === 0 && (
            <tr><td colSpan={cols.length} className="kv-muted" style={{ textAlign: 'center', padding: '32px 0' }}>{emptyMessage}</td></tr>
          )}
        </tbody>
        {rows.length > 0 && footer}
      </table>
    </div>
  )
}
