import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

export function useInventory() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [snSearchInput, setSnSearchInput] = useState('')
  const [snSearch, setSnSearch] = useState('')
  const [warehouseId, setWarehouseId] = useState<string | undefined>()

  // Debounce nhẹ để gõ tới đâu lọc tới đó mà không bắn request mỗi lần nhấn phím.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    const t = setTimeout(() => setSnSearch(snSearchInput), 300)
    return () => clearTimeout(t)
  }, [snSearchInput])

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
