import { useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { Form } from 'antd'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useDebounce } from './useDebounce'
import { useApiMutation } from './useApiMutation'
import { useEntityModal } from './useEntityModal'

export function useStocktakes() {
  const { open, form, openCreate, close } = useEntityModal()
  const navigate = useNavigate()

  const [page, setPage] = useState(1)
  const [limit, _setLimit] = useState(50)
  const [_searchInput, _setSearchInput] = useState('')
  const [status, _setStatus] = useState<string | undefined>()
  const [sortBy, setSortBy] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null)
  const search = useDebounce(_searchInput)

  const searchInput = _searchInput
  function setSearchInput(v: string) { _setSearchInput(v); setPage(1) }
  function setStatus(v: string | undefined) { _setStatus(v); setPage(1) }
  function setLimit(v: number) { _setLimit(v); setPage(1) }
  function setSort(field: string | null, order: 'asc' | 'desc' | null) {
    setSortBy(field); setSortOrder(order); setPage(1)
  }

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['stocktakes', page, limit, search, status, sortBy, sortOrder],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const params: Record<string, any> = { page, limit }
      if (search.trim()) params.search = search.trim()
      if (status) params.status = status
      if (sortBy) { params.sort_by = sortBy; params.sort_order = sortOrder ?? 'asc' }
      return (await api.get('/stocktakes', { params })).data
    },
  })

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => (await api.get('/warehouses')).data,
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await api.get('/products/categories')).data,
  })

  const scopeType: string = Form.useWatch('scope_type', form) ?? 'all'

  const createMutation = useApiMutation((values: any) => api.post('/stocktakes', values), {
    successMessage: 'Tạo kiểm kê thành công (In Progress)',
    invalidateKey: ['stocktakes'],
    onSuccess: close,
  })

  return {
    open, form, openCreate, close, navigate, page, setPage,
    limit, setLimit,
    data, isLoading, isFetching,
    searchInput, setSearchInput, status, setStatus,
    sortBy, sortOrder, setSort,
    warehouses, categories, scopeType, createMutation,
  }
}
