import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

export function usePurchaseOrders() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders', page],
    queryFn: async () => (await api.get('/purchase-orders', { params: { page, limit: 20 } })).data,
  })

  return { navigate, page, setPage, data, isLoading }
}
