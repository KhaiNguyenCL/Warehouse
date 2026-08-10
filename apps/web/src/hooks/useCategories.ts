import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useApiMutation } from './useApiMutation'

export function useCategories() {
  const { data, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await api.get('/products/categories')).data,
  })

  const createMutation = useApiMutation(
    (values: any) => api.post('/products/categories', values),
    { successMessage: 'Tạo category thành công', invalidateKey: ['categories'] },
  )

  const updateMutation = useApiMutation(
    ({ id, ...values }: any) => api.patch(`/products/categories/${id}`, values),
    { successMessage: 'Cập nhật thành công', invalidateKey: ['categories'] },
  )

  const deleteMutation = useApiMutation(
    (id: string) => api.delete(`/products/categories/${id}`),
    { successMessage: 'Đã xoá category', invalidateKey: ['categories'] },
  )

  // Builds flat options for a parent_id <Select>. Excludes the given ID and its direct
  // children so a category cannot be set as its own parent.
  function buildParentOptions(flat: any[], excludeId?: string): { value: string; label: string }[] {
    if (!flat?.length) return []
    const allowed = excludeId
      ? flat.filter((c) => c.id !== excludeId && c.parent_id !== excludeId)
      : flat

    const map: Record<string, any & { children: any[] }> = {}
    allowed.forEach((c) => (map[c.id] = { ...c, children: [] }))
    const roots: any[] = []
    allowed.forEach((c) => {
      if (c.parent_id && map[c.parent_id]) {
        map[c.parent_id].children.push(map[c.id])
      } else {
        roots.push(map[c.id])
      }
    })

    const options: { value: string; label: string }[] = []
    function traverse(nodes: any[], depth: number) {
      for (const node of nodes) {
        const prefix = depth > 0 ? '── '.repeat(depth) : ''
        options.push({ value: node.id, label: prefix + node.name })
        if (node.children.length) traverse(node.children, depth + 1)
      }
    }
    traverse(roots, 0)
    return options
  }

  return { data, isLoading, createMutation, updateMutation, deleteMutation, buildParentOptions }
}
