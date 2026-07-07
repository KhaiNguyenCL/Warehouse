import { useQuery } from '@tanstack/react-query'
import { Form } from 'antd'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useApiMutation } from './useApiMutation'
import { useEntityModal } from './useEntityModal'

export function useTransferOrders() {
  const { open, form, openCreate, close } = useEntityModal()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['transfers'],
    queryFn: async () => (await api.get('/transfers')).data,
  })

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => (await api.get('/warehouses')).data,
  })

  const transferType: string | undefined = Form.useWatch('transfer_type', form)
  const needsFromWarehouse = transferType === 'transfer'

  const createMutation = useApiMutation((values: any) => api.post('/transfers', values), {
    successMessage: 'Tạo Transfer Order thành công (Draft)',
    invalidateKey: ['transfers'],
    onSuccess: close,
  })

  return { open, form, openCreate, close, navigate, data, isLoading, warehouses, transferType, needsFromWarehouse, createMutation }
}
