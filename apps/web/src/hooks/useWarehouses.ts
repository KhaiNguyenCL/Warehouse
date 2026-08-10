import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useApiMutation } from './useApiMutation'

export function useWarehouses() {
  const { data, isLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => (await api.get('/warehouses')).data,
  })

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get('/settings/users')).data,
  })

  const createMutation = useApiMutation(
    (values: any) => api.post('/warehouses', values),
    { successMessage: 'Tạo kho thành công', invalidateKey: ['warehouses'] },
  )

  const updateMutation = useApiMutation(
    ({ id, ...values }: any) => api.patch(`/warehouses/${id}`, values),
    { successMessage: 'Cập nhật thành công', invalidateKey: ['warehouses'] },
  )

  const deleteMutation = useApiMutation(
    (id: string) => api.delete(`/warehouses/${id}`),
    { successMessage: 'Đã xoá kho', invalidateKey: ['warehouses'] },
  )

  return { data, isLoading, users, createMutation, updateMutation, deleteMutation }
}
