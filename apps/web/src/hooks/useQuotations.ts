import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useDebounce } from './useDebounce'
import { Form } from 'antd'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useApiMutation } from './useApiMutation'
import { useEntityModal } from './useEntityModal'

export function useQuotations() {
  const { open, form, openCreate, close } = useEntityModal()
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
    page, setPage,
    data, isLoading,
    companies, companyId, companyDetail,
    warehouses,
    createMutation,
  }
}
