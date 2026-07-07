import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Form } from 'antd'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useApiMutation } from './useApiMutation'
import { useEntityModal } from './useEntityModal'

export function useQuotations() {
  const { open, form, openCreate, close } = useEntityModal()
  const navigate = useNavigate()

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string | undefined>()

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const { data, isLoading } = useQuery({
    queryKey: ['quotations', search, status],
    queryFn: async () => (await api.get('/quotations', { params: { search: search || undefined, status, limit: 100 } })).data,
  })

  const { data: companies } = useQuery({
    queryKey: ['companies', 'customer'],
    queryFn: async () => (await api.get('/companies', { params: { type: 'customer', limit: 100 } })).data,
  })

  const companyId: string | undefined = Form.useWatch('company_id', form)
  const { data: companyDetail } = useQuery({
    queryKey: ['companies', companyId],
    queryFn: async () => (await api.get(`/companies/${companyId}`)).data,
    enabled: !!companyId,
  })

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => (await api.get('/warehouses')).data,
  })

  const createMutation = useApiMutation((values: any) => api.post('/quotations', values), {
    successMessage: 'Tạo báo giá thành công (Draft)',
    invalidateKey: ['quotations'],
    onSuccess: close,
  })

  return {
    open, form, openCreate, close,
    navigate,
    searchInput, setSearchInput,
    status, setStatus,
    data, isLoading,
    companies, companyId, companyDetail,
    warehouses,
    createMutation,
  }
}
