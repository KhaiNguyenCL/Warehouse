// Axios instance dùng chung toàn app — baseURL '/api/v1' được Vite dev proxy chuyển
// tiếp sang backend (xem vite.config.ts), nên không cần config CORS/host riêng.
import axios from 'axios'
import { useAuthStore } from '../store/auth'

export const api = axios.create({ baseURL: '/api/v1' })

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// 401 (token hết hạn/sai) → tự logout, đá về /login. Không xử lý 403 ở đây — đó là
// lỗi thiếu quyền hợp lệ, để từng page tự hiển thị message từ response.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  },
)
