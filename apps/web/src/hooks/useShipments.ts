import { useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useDebounce } from './useDebounce'

export function useShipments() {
  const [page, setPage] = useState(1)
  const [limit, _setLimit] = useState(50)
  const [_searchInput, _setSearchInput] = useState('')
  const [status, _setStatus] = useState<string | undefined>()
  const [warehouseIdFilter, _setWarehouseIdFilter] = useState<string | undefined>()
  const search = useDebounce(_searchInput)

  const searchInput = _searchInput
  function setSearchInput(v: string) { _setSearchInput(v); setPage(1) }
  function setStatus(v: string | undefined) { _setStatus(v); setPage(1) }
  function setWarehouseIdFilter(v: string | undefined) { _setWarehouseIdFilter(v); setPage(1) }
  function setLimit(v: number) { _setLimit(v); setPage(1) }

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['shipments', page, limit, search, status, warehouseIdFilter],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const params: Record<string, any> = { page, limit }
      if (search.trim()) params.search = search.trim()
      if (status) params.status = status
      if (warehouseIdFilter) params.warehouse_id = warehouseIdFilter
      return (await api.get('/shipments', { params })).data
    },
  })

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => (await api.get('/warehouses')).data,
  })

  return {
    page, setPage,
    limit, setLimit,
    searchInput, setSearchInput,
    status, setStatus,
    warehouseIdFilter, setWarehouseIdFilter,
    data, isLoading, isFetching,
    warehouses,
  }
}
