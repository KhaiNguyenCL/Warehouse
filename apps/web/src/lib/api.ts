// Axios instance dùng chung toàn app — baseURL '/api/v1' được Vite dev proxy chuyển
// tiếp sang backend (xem vite.config.ts), nên không cần config CORS/host riêng.
import axios from 'axios'
import { useAuthStore } from '../store/auth'

// Ant Design form gửi "" cho optional fields bị bỏ trống — xóa khỏi payload ở tầng
// Axios để áp dụng cho MỌI API call, không chỉ những call qua useApiMutation.
function stripEmptyStrings(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripEmptyStrings)
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== '')
        .map(([k, v]) => [k, stripEmptyStrings(v)]),
    )
  }
  return value
}

export const api = axios.create({ baseURL: '/api/v1' })

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  if (config.data && typeof config.data === 'object' && !(config.data instanceof FormData)) {
    config.data = stripEmptyStrings(config.data)
  }
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
