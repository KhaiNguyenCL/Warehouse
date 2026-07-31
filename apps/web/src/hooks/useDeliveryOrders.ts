import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

export function useDeliveryOrders() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<string | undefined>()
  const [searchInput, setSearchInput] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['deliveries', page, status, searchInput],
    queryFn: async () =>
      (await api.get('/deliveries', { params: { page, limit: 20, status: status || undefined, search: searchInput || undefined } })).data,
  })

  return { navigate, page, setPage, status, setStatus, searchInput, setSearchInput, data, isLoading }
}
