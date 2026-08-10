// Cấu hình Vite — dev server + build cho web app.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [tailwindcss(), react()],   // bật hỗ trợ JSX/Fast Refresh cho React

  // Vite (esbuild) không tự hiểu workspace alias @wms/types như TypeScript paths —
  // phải khai báo lại alias ở đây để import '@wms/types' resolve đúng vào source thật
  // trong packages/types (không phải dist build sẵn — tiện cho dev, sửa types thấy ngay).
  resolve: {
    alias: {
      '@wms/types': path.resolve(__dirname, '../../packages/types/src/index.ts'),
      '@wms/utils': path.resolve(__dirname, '../../packages/utils/src/index.ts'),
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    port: 5173,
    // host: true = bind 0.0.0.0 thay vì chỉ 127.0.0.1 — máy khác trong LAN truy cập được
    // qua http://<LAN-IP>:5173. Request /api/v1/* từ máy đó vẫn đi qua proxy bên dưới
    // (chạy trên CHÍNH máy này, gọi localhost:3000) nên không cần mở port 3000 ra LAN.
    host: true,
    // Proxy: khi code gọi fetch('/api/v1/...'), Vite dev server tự chuyển tiếp request
    // sang backend ở localhost:3000 — nhờ vậy KHÔNG bị lỗi CORS lúc dev (browser thấy
    // request cùng origin 5173, Vite âm thầm forward ra 3000 ở phía server).
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
    },
  },
})
