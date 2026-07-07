import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useApiMutation } from './useApiMutation'
import { useEntityModal } from './useEntityModal'

export function useRoles() {
  const { open, editing, form, openCreate, openEdit, close } = useEntityModal()

  const { data, isLoading } = useQuery({
    queryKey: ['settings', 'roles'],
    queryFn: async () => (await api.get('/settings/roles')).data,
  })

  const createMutation = useApiMutation((values: any) => api.post('/settings/roles', values), {
    successMessage: 'Tạo role thành công',
    invalidateKey: ['settings', 'roles'],
    onSuccess: close,
  })

  const updateMutation = useApiMutation((values: any) => api.patch(`/settings/roles/${editing.id}`, values), {
    successMessage: 'Cập nhật thành công',
    invalidateKey: ['settings', 'roles'],
    onSuccess: close,
  })

  const deleteMutation = useApiMutation((roleId: string) => api.delete(`/settings/roles/${roleId}`), {
    successMessage: 'Đã xoá role',
    invalidateKey: ['settings', 'roles'],
  })

  return { open, editing, form, openCreate, openEdit, close, data, isLoading, createMutation, updateMutation, deleteMutation }
}
