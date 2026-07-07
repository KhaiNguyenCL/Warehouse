import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useApiMutation } from './useApiMutation'
import { useEntityModal } from './useEntityModal'

export function useBrands() {
  const { open, editing, form, openCreate, openEdit, close } = useEntityModal()

  const { data, isLoading } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => (await api.get('/products/brands')).data,
  })

  const createMutation = useApiMutation((values: any) => api.post('/products/brands', values), {
    successMessage: 'Tạo hãng thành công',
    invalidateKey: ['brands'],
    onSuccess: close,
  })

  const updateMutation = useApiMutation((values: any) => api.patch(`/products/brands/${editing.id}`, values), {
    successMessage: 'Cập nhật thành công',
    invalidateKey: ['brands'],
    onSuccess: close,
  })

  const deleteMutation = useApiMutation((id: string) => api.delete(`/products/brands/${id}`), {
    successMessage: 'Đã xoá hãng',
    invalidateKey: ['brands'],
  })

  return { open, editing, form, openCreate, openEdit, close, data, isLoading, createMutation, updateMutation, deleteMutation }
}
