import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useDebounce } from './useDebounce'

export function useInventory() {
  const [searchInput, _setSearchInput] = useState('')
  const [snSearchInput, setSnSearchInput] = useState('')
  const [warehouseId, _setWarehouseId] = useState<string | undefined>()
  const [page, setPage] = useState(1)

  const search = useDebounce(searchInput)
  const snSearch = useDebounce(snSearchInput)

  function setSearchInput(v: string) { _setSearchInput(v); setPage(1) }
  function setWarehouseId(v: string | undefined) { _setWarehouseId(v); setPage(1) }

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', 'by-variant', search, warehouseId, page],
    queryFn: async () =>
      (await api.get('/inventory/by-variant', { params: { search: search || undefined, warehouse_id: warehouseId, page, limit: 20 } })).data,
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
    page, setPage,
    data, isLoading,
    warehouses,
  }
}
