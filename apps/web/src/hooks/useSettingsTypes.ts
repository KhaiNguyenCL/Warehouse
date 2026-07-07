// Hai hook độc lập cho 2 section của SettingsTypesPage.
// Sub-components ImportTypesSection và ExportTypesSection giữ nguyên trong page file —
// chỉ chuyển stateful logic vào đây.
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useApiMutation } from './useApiMutation'
import { useEntityModal } from './useEntityModal'

export function useImportTypes() {
  const { open, editing, form, openCreate, openEdit, close } = useEntityModal()

  const { data, isLoading } = useQuery({
    queryKey: ['import-types'],
    queryFn: async () => (await api.get('/settings/import-types')).data,
  })

  const createMutation = useApiMutation((values: any) => api.post('/settings/import-types', values), {
    successMessage: 'Tạo loại nhập thành công',
    invalidateKey: ['import-types'],
    onSuccess: close,
  })
  const updateMutation = useApiMutation(
    (values: any) => api.patch(`/settings/import-types/${editing.id}`, values),
    { successMessage: 'Cập nhật thành công', invalidateKey: ['import-types'], onSuccess: close },
  )
  const deleteMutation = useApiMutation(
    (typeId: string) => api.delete(`/settings/import-types/${typeId}`),
    { successMessage: 'Đã xoá', invalidateKey: ['import-types'] },
  )

  return { open, editing, form, openCreate, openEdit, close, data, isLoading, createMutation, updateMutation, deleteMutation }
}

export function useExportTypes() {
  const { open, editing, form, openCreate, openEdit, close } = useEntityModal()

  const { data, isLoading } = useQuery({
    queryKey: ['export-types'],
    queryFn: async () => (await api.get('/settings/export-types')).data,
  })

  const createMutation = useApiMutation((values: any) => api.post('/settings/export-types', values), {
    successMessage: 'Tạo loại xuất thành công',
    invalidateKey: ['export-types'],
    onSuccess: close,
  })
  const updateMutation = useApiMutation(
    (values: any) => api.patch(`/settings/export-types/${editing.id}`, values),
    { successMessage: 'Cập nhật thành công', invalidateKey: ['export-types'], onSuccess: close },
  )
  const deleteMutation = useApiMutation(
    (typeId: string) => api.delete(`/settings/export-types/${typeId}`),
    { successMessage: 'Đã xoá', invalidateKey: ['export-types'] },
  )

  return { open, editing, form, openCreate, openEdit, close, data, isLoading, createMutation, updateMutation, deleteMutation }
}
