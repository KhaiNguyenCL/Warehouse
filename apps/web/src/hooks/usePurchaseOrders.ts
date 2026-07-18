import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Form } from 'antd'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useApiMutation } from './useApiMutation'
import { useEntityModal } from './useEntityModal'

export function usePurchaseOrders() {
  const { open, form, openCreate, close } = useEntityModal()
  const navigate = useNavigate()

  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders', page],
    queryFn: async () => (await api.get('/purchase-orders', { params: { page, limit: 20 } })).data,
  })

  const { data: companies } = useQuery({
    queryKey: ['companies', 'all'],
    queryFn: async () => (await api.get('/companies', { params: { type: 'supplier', limit: 100 } })).data,
  })

  // Contact phụ thuộc company đang chọn — company.contacts trả kèm trong GET /companies/:id.
  const companyId: string | undefined = Form.useWatch('company_id', form)
  const { data: companyDetail } = useQuery({
    queryKey: ['companies', companyId],
    queryFn: async () => (await api.get(`/companies/${companyId}`)).data,
    enabled: !!companyId,
  })

  const createMutation = useApiMutation((values: any) => api.post('/purchase-orders', values), {
    successMessage: 'Tạo PO thành công (Draft)',
    invalidateKey: ['purchase-orders'],
    onSuccess: close,
  })

  return { open, form, openCreate, close, navigate, page, setPage, data, isLoading, companies, companyId, companyDetail, createMutation }
}
