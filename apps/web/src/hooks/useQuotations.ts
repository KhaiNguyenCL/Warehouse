import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useDebounce } from './useDebounce'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

export function useQuotations() {
  const navigate = useNavigate()

  const [searchInput, _setSearchInput] = useState('')
  const [status, _setStatus] = useState<string | undefined>()
  const [page, setPage] = useState(1)
  const search = useDebounce(searchInput)

  function setSearchInput(v: string) { _setSearchInput(v); setPage(1) }
  function setStatus(v: string | undefined) { _setStatus(v); setPage(1) }

  const { data, isLoading } = useQuery({
    queryKey: ['quotations', search, status, page],
    queryFn: async () => (await api.get('/quotations', { params: { search: search || undefined, status, page, limit: 20 } })).data,
  })

  return {
    navigate,
    searchInput, setSearchInput,
    status, setStatus,
    page, setPage,
    data, isLoading,
  }
}
