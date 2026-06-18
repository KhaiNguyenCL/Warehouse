// Component gốc — nơi đặt các Provider toàn cục (theme, locale) và sau này là Router.
import { ConfigProvider } from 'antd'
import viVN from 'antd/locale/vi_VN'

export default function App() {
  return (
    // ConfigProvider của Ant Design — set locale tiếng Việt (đổi text mặc định trong
    // component như DatePicker, Pagination,...) và màu chủ đạo (colorPrimary) dùng chung
    // cho toàn bộ component Ant Design trong app, không cần set lẻ từng component.
    <ConfigProvider locale={viVN} theme={{ token: { colorPrimary: '#1677ff' } }}>
      <div style={{ padding: 24 }}>
        <h1>WMS — DNS Technology</h1>
        <p>Warehouse Management System</p>
        {/* TODO: thêm React Router + layout (sidebar, header) khi bắt đầu code page thật */}
      </div>
    </ConfigProvider>
  )
}
