// Cấu hình Vite — dev server + build cho web app.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],   // bật hỗ trợ JSX/Fast Refresh cho React

  // Vite (esbuild) không tự hiểu workspace alias @wms/types như TypeScript paths —
  // phải khai báo lại alias ở đây để import '@wms/types' resolve đúng vào source thật
  // trong packages/types (không phải dist build sẵn — tiện cho dev, sửa types thấy ngay).
  resolve: {
    alias: {
      '@wms/types': path.resolve(__dirname, '../../packages/types/src/index.ts'),
      '@wms/utils': path.resolve(__dirname, '../../packages/utils/src/index.ts'),
    },
  },

  server: {
    port: 5173,
    // Proxy: khi code gọi fetch('/api/v1/...'), Vite dev server tự chuyển tiếp request
    // sang backend ở localhost:3000 — nhờ vậy KHÔNG bị lỗi CORS lúc dev (browser thấy
    // request cùng origin 5173, Vite âm thầm forward ra 3000 ở phía server).
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
