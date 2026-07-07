import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useApiMutation } from './useApiMutation'
import { useEntityModal } from './useEntityModal'

export function useWarehouses() {
  const { open, editing, form, openCreate, openEdit, close } = useEntityModal()

  const { data, isLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => (await api.get('/warehouses')).data,
  })

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get('/settings/users')).data,
  })

  // openCreate() gọi resetFields() bên trong useEntityModal — phải set lại default type
  // SAU khi gọi, không phải trước.
  function create() {
    openCreate()
    form.setFieldValue('type', 'physical')
  }

  const createMutation = useApiMutation((values: any) => api.post('/warehouses', values), {
    successMessage: 'Tạo kho thành công',
    invalidateKey: ['warehouses'],
    onSuccess: close,
  })

  const updateMutation = useApiMutation((values: any) => api.patch(`/warehouses/${editing.id}`, values), {
    successMessage: 'Cập nhật thành công',
    invalidateKey: ['warehouses'],
    onSuccess: close,
  })

  const deleteMutation = useApiMutation((id: string) => api.delete(`/warehouses/${id}`), {
    successMessage: 'Đã xoá kho',
    invalidateKey: ['warehouses'],
  })

  return { open, editing, form, create, openEdit, close, data, isLoading, users, createMutation, updateMutation, deleteMutation }
}
