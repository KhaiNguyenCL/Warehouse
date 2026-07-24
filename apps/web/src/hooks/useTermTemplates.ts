import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

export function useTermTemplates() {
  return useQuery({
    queryKey: ['term-templates'],
    queryFn: async () => (await api.get('/settings/term-templates')).data as Array<{ id: string; name: string; content: string }>,
    staleTime: 60_000,
  })
}
