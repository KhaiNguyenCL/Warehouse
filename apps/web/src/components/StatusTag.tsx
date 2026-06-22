// Tag màu theo status — lặp lại ở mọi trang detail có state machine (Receipt/PO/
// Delivery/Transfer...). Mỗi object tự định nghĩa colorMap riêng (số lượng & tên status
// khác nhau giữa các object) và truyền vào, component không tự đoán màu.
import { Tag } from 'antd'

export function StatusTag({ status, colorMap }: { status: string; colorMap: Record<string, string> }) {
  return <Tag color={colorMap[status] ?? 'default'}>{status}</Tag>
}
