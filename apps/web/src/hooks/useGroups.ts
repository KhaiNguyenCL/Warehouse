import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useApiMutation } from './useApiMutation'

export function useGroups() {
  const { data, isLoading } = useQuery({
    queryKey: ['settings', 'groups'],
    queryFn: async () => (await api.get('/settings/groups')).data,
  })

  const { data: roles } = useQuery({
    queryKey: ['settings', 'roles'],
    queryFn: async () => (await api.get('/settings/roles')).data,
  })

  const createMutation = useApiMutation((values: any) => api.post('/settings/groups', values), {
    successMessage: 'Tạo nhóm thành công',
    invalidateKey: ['settings', 'groups'],
  })

  const updateMutation = useApiMutation(
    ({ id, ...values }: { id: string; [key: string]: any }) => api.patch(`/settings/groups/${id}`, values),
    { successMessage: 'Cập nhật thành công', invalidateKey: ['settings', 'groups'] },
  )

  const deleteMutation = useApiMutation((id: string) => api.delete(`/settings/groups/${id}`), {
    successMessage: 'Đã xoá nhóm',
    invalidateKey: ['settings', 'groups'],
  })

  return { data, isLoading, roles, createMutation, updateMutation, deleteMutation }
}
