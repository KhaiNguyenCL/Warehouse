import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useDebounce } from './useDebounce'

export function useInventory() {
  const [searchInput, setSearchInput] = useState('')
  const [snSearchInput, setSnSearchInput] = useState('')
  const [warehouseId, setWarehouseId] = useState<string | undefined>()

  const search = useDebounce(searchInput)
  const snSearch = useDebounce(snSearchInput)

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', 'by-variant', search, warehouseId],
    queryFn: async () =>
      (await api.get('/inventory/by-variant', { params: { search: search || undefined, warehouse_id: warehouseId, limit: 100 } })).data,
    refetchInterval: 5000,
  })

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => (await api.get('/warehouses')).data,
  })

  return {
    searchInput, setSearchInput,
    snSearchInput, setSnSearchInput,
    snSearch,
    warehouseId, setWarehouseId,
    data, isLoading,
    warehouses,
  }
}
