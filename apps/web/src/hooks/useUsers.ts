import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useApiMutation } from './useApiMutation'

export function useUsers() {
  const { data, isLoading } = useQuery({
    queryKey: ['settings', 'users'],
    queryFn: async () => (await api.get('/settings/users')).data,
  })

  const { data: roles } = useQuery({
    queryKey: ['settings', 'roles'],
    queryFn: async () => (await api.get('/settings/roles')).data,
  })

  const createMutation = useApiMutation((values: any) => api.post('/settings/users', values), {
    successMessage: 'Tạo user thành công',
    invalidateKey: ['settings', 'users'],
  })

  const updateMutation = useApiMutation(
    ({ id, ...values }: { id: string; [key: string]: any }) => {
      // password để trống = không đổi password — không gửi field rỗng lên API
      const body = { ...values }
      if (!body.password) delete body.password
      return api.patch(`/settings/users/${id}`, body)
    },
    { successMessage: 'Cập nhật thành công', invalidateKey: ['settings', 'users'] },
  )

  return { data, isLoading, roles, createMutation, updateMutation }
}
