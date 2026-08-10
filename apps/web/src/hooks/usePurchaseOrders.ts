import { useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useDebounce } from './useDebounce'

export function usePurchaseOrders() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [_searchInput, _setSearchInput] = useState('')
  const [sortBy, setSortBy] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null)
  const search = useDebounce(_searchInput)

  const searchInput = _searchInput
  function setSearchInput(v: string) { _setSearchInput(v); setPage(1) }
  function setSort(field: string | null, order: 'asc' | 'desc' | null) {
    setSortBy(field); setSortOrder(order); setPage(1)
  }

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['purchase-orders', page, search, sortBy, sortOrder],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const params: Record<string, any> = { page, limit: 20 }
      if (search.trim()) params.search = search.trim()
      if (sortBy) { params.sort_by = sortBy; params.sort_order = sortOrder ?? 'asc' }
      return (await api.get('/purchase-orders', { params })).data
    },
  })

  return { navigate, page, setPage, searchInput, setSearchInput, sortBy, sortOrder, setSort, data, isLoading, isFetching }
}
