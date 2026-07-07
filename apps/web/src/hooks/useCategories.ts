import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useApiMutation } from './useApiMutation'
import { useEntityModal } from './useEntityModal'

export function useCategories() {
  const { open, editing, form, openCreate, openEdit, close } = useEntityModal()

  const { data, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await api.get('/products/categories')).data,
  })

  const createMutation = useApiMutation((values: any) => api.post('/products/categories', values), {
    successMessage: 'Tạo category thành công',
    invalidateKey: ['categories'],
    onSuccess: close,
  })

  const updateMutation = useApiMutation((values: any) => api.patch(`/products/categories/${editing.id}`, values), {
    successMessage: 'Cập nhật thành công',
    invalidateKey: ['categories'],
    onSuccess: close,
  })

  // Category cha — loại bỏ chính nó khỏi danh sách chọn (không tự làm cha của mình).
  const parentOptions = data?.filter((c: any) => c.id !== editing?.id).map((c: any) => ({ value: c.id, label: c.name }))

  const deleteMutation = useApiMutation((id: string) => api.delete(`/products/categories/${id}`), {
    successMessage: 'Đã xoá category',
    invalidateKey: ['categories'],
  })

  return { open, editing, form, openCreate, openEdit, close, data, isLoading, createMutation, updateMutation, deleteMutation, parentOptions }
}
