import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Form } from 'antd'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useApiMutation } from './useApiMutation'
import { useEntityModal } from './useEntityModal'

export function useStocktakes() {
  const { open, form, openCreate, close } = useEntityModal()
  const navigate = useNavigate()

  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['stocktakes', page],
    queryFn: async () => (await api.get('/stocktakes', { params: { page, limit: 20 } })).data,
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

  return { open, form, openCreate, close, navigate, page, setPage, data, isLoading, warehouses, categories, scopeType, createMutation }
}
