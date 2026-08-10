import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useApiMutation } from './useApiMutation'

export function useBrands() {
  const { data, isLoading } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => (await api.get('/products/brands')).data,
  })

  const createMutation = useApiMutation(
    (values: any) => api.post('/products/brands', values),
    { successMessage: 'Tạo hãng thành công', invalidateKey: ['brands'] },
  )

  const updateMutation = useApiMutation(
    ({ id, ...values }: any) => api.patch(`/products/brands/${id}`, values),
    { successMessage: 'Cập nhật thành công', invalidateKey: ['brands'] },
  )

  const deleteMutation = useApiMutation(
    (id: string) => api.delete(`/products/brands/${id}`),
    { successMessage: 'Đã xoá hãng', invalidateKey: ['brands'] },
  )

  return { data, isLoading, createMutation, updateMutation, deleteMutation }
}
