import { useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Form, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useEntityModal } from './useEntityModal'

export function useTransferOrders() {
  const { open, form, openCreate, close } = useEntityModal()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const goToDetailRef = useRef(false)

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

  const createMutation = useMutation({
    mutationFn: (values: any) => api.post('/transfers', values),
    onSuccess: (res: any) => {
      message.success('Tạo Transfer Order thành công')
      qc.invalidateQueries({ queryKey: ['transfers'] })
      if (goToDetailRef.current) {
        goToDetailRef.current = false
        navigate(`/transfers/${res.data.id}`)
      } else {
        close()
      }
    },
    onError: (err: any) => message.error(err.response?.data?.error ?? 'Lỗi'),
  })

  function createAndGoToDetail() {
    goToDetailRef.current = true
    form.submit()
  }

  return { open, form, openCreate, close, navigate, data, isLoading, warehouses, transferType, needsFromWarehouse, createMutation, createAndGoToDetail }
}
