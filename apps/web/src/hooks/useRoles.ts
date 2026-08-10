import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useApiMutation } from './useApiMutation'

export function useRoles() {
  const { data, isLoading } = useQuery({
    queryKey: ['settings', 'roles'],
    queryFn: async () => (await api.get('/settings/roles')).data,
  })

  const createMutation = useApiMutation((values: any) => api.post('/settings/roles', values), {
    successMessage: 'Tạo role thành công',
    invalidateKey: ['settings', 'roles'],
  })

  const updateMutation = useApiMutation(
    ({ id, ...values }: { id: string; [key: string]: any }) =>
      api.patch(`/settings/roles/${id}`, values),
    { successMessage: 'Cập nhật thành công', invalidateKey: ['settings', 'roles'] },
  )

  const deleteMutation = useApiMutation((roleId: string) => api.delete(`/settings/roles/${roleId}`), {
    successMessage: 'Đã xoá role',
    invalidateKey: ['settings', 'roles'],
  })

  return { data, isLoading, createMutation, updateMutation, deleteMutation }
}
