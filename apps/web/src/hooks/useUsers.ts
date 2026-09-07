import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useApiMutation } from './useApiMutation'

export function useUsers() {
  const { data, isLoading } = useQuery({
    queryKey: ['settings', 'users'],
    queryFn: async () => (await api.get('/settings/users')).data,
  })

  const { data: groups } = useQuery({
    queryKey: ['settings', 'groups'],
    queryFn: async () => (await api.get('/settings/groups')).data,
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

  // Hard delete — chỉ thành công nếu user chưa từng tạo/duyệt phiếu gì (xem
  // settings.service.ts::hardDeleteUser); nếu vướng FK, backend trả lỗi rõ ràng.
  const deleteMutation = useApiMutation(
    (id: string) => api.delete(`/settings/users/${id}/hard`),
    { successMessage: 'Đã xoá user', invalidateKey: ['settings', 'users'] },
  )

  return { data, isLoading, groups, createMutation, updateMutation, deleteMutation }
}
