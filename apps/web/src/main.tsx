// Entry point thật của web app — index.html load file này qua <script type="module">.
import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider } from 'antd'
import viVN from 'antd/locale/vi_VN'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from 'sonner'
import App from './App'
import { antdTheme } from './theme'
import './index.css'

// QueryClient = "bộ nhớ cache" trung tâm của TanStack Query — mọi API call qua useQuery()
// sau này đều lưu/lấy cache từ đây.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,            // call API lỗi thì tự thử lại 1 lần (network chập chờn) rồi mới báo lỗi
      staleTime: 30_000,   // data coi là "còn mới" trong 30s — trong khoảng này, chuyển trang qua lại
                            // KHÔNG gọi lại API, dùng cache luôn (giảm tải server, UI phản hồi nhanh)
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* QueryClientProvider phải bọc NGOÀI App để mọi component con dùng được useQuery/useMutation */}
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={antdTheme} locale={viVN}>
        <TooltipProvider delayDuration={300}>
          <App />
          <Toaster richColors position="top-right" />
        </TooltipProvider>
      </ConfigProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
