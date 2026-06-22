// Component gốc — nơi đặt các Provider toàn cục (theme, locale) và Router.
import { ConfigProvider } from 'antd'
import viVN from 'antd/locale/vi_VN'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'

export default function App() {
  return (
    // ConfigProvider của Ant Design — set locale tiếng Việt (đổi text mặc định trong
    // component như DatePicker, Pagination,...) và màu chủ đạo (colorPrimary) dùng chung
    // cho toàn bộ component Ant Design trong app, không cần set lẻ từng component.
    <ConfigProvider locale={viVN} theme={{ token: { colorPrimary: '#1677ff' } }}>
      <RouterProvider router={router} />
    </ConfigProvider>
  )
}
