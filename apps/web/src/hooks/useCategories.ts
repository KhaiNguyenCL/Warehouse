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

  // Build tree cho TreeSelect — loại bỏ chính nó và các con của nó (không tự làm cha của mình).
  function buildParentTree(flat: any[], excludeId?: string): any[] {
    if (!flat) return []
    const allowed = excludeId
      ? flat.filter((c) => c.id !== excludeId && c.parent_id !== excludeId)
      : flat
    const map: Record<string, any> = {}
    allowed.forEach((c) => (map[c.id] = { value: c.id, title: c.name }))
    const roots: any[] = []
    allowed.forEach((c) => {
      if (c.parent_id && map[c.parent_id]) {
        map[c.parent_id].children = [...(map[c.parent_id].children ?? []), map[c.id]]
      } else {
        roots.push(map[c.id])
      }
    })
    return roots
  }
  const parentTreeData = buildParentTree(data, editing?.id)

  const deleteMutation = useApiMutation((id: string) => api.delete(`/products/categories/${id}`), {
    successMessage: 'Đã xoá category',
    invalidateKey: ['categories'],
  })

  return { open, editing, form, openCreate, openEdit, close, data, isLoading, createMutation, updateMutation, deleteMutation, parentTreeData }
}
