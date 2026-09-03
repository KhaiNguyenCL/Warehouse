import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthGroup {
  id: string
  name: string
  role_name: string
}

interface AuthUser {
  id: string
  email: string
  full_name: string
  groups: AuthGroup[]
  permissions: string[]
}

interface AuthState {
  token: string | null
  user: AuthUser | null
  setAuth: (token: string, user: AuthUser) => void
  logout: () => void
  hasPermission: (key: string) => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
      hasPermission: (key: string) => {
        const perms = get().user?.permissions ?? []
        return perms.includes(key)
      },
    }),
    { name: 'wms-auth' },
  ),
)
