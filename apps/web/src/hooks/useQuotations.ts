import { useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useDebounce } from './useDebounce'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

export function useQuotations() {
  const navigate = useNavigate()

  const [searchInput, _setSearchInput] = useState('')
  const [status, _setStatus] = useState<string | undefined>()
  const [page, setPage] = useState(1)
  const [limit, _setLimit] = useState(50)
  const [sortBy, setSortBy] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null)
  const search = useDebounce(searchInput)

  function setSearchInput(v: string) { _setSearchInput(v); setPage(1) }
  function setStatus(v: string | undefined) { _setStatus(v); setPage(1) }
  function setLimit(v: number) { _setLimit(v); setPage(1) }
  function setSort(field: string | null, order: 'asc' | 'desc' | null) {
    setSortBy(field); setSortOrder(order); setPage(1)
  }

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['quotations', search, status, page, limit, sortBy, sortOrder],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const params: Record<string, any> = { page, limit }
      if (search.trim()) params.search = search.trim()
      if (status) params.status = status
      if (sortBy) { params.sort_by = sortBy; params.sort_order = sortOrder ?? 'asc' }
      return (await api.get('/quotations', { params })).data
    },
  })

  return {
    navigate,
    searchInput, setSearchInput,
    status, setStatus,
    page, setPage,
    limit, setLimit,
    sortBy, sortOrder, setSort,
    data, isLoading, isFetching,
  }
}
