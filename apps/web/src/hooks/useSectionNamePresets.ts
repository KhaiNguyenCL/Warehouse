import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

export function useSectionNamePresets() {
  return useQuery({
    queryKey: ['section-name-presets'],
    queryFn: async () => (await api.get('/settings/section-name-presets')).data as Array<{ id: string; name: string; sort_order: number }>,
    staleTime: 60_000,
  })
}
