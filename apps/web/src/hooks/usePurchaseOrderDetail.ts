import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useApiMutation } from './useApiMutation'
import { useEntityModal } from './useEntityModal'

export function usePurchaseOrderDetail(id: string) {
  const navigate = useNavigate()
  const editModal = useEntityModal()

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders', id],
    queryFn: async () => (await api.get(`/purchase-orders/${id}`)).data,
  })

  const actionOptions = { successMessage: 'Thành công', invalidateKey: [['purchase-orders', id], ['purchase-orders']] }
  const confirmMutation = useApiMutation(() => api.patch(`/purchase-orders/${id}/confirm`), actionOptions)
  const unconfirmMutation = useApiMutation(() => api.patch(`/purchase-orders/${id}/unconfirm`), actionOptions)
  const cancelMutation = useApiMutation(() => api.patch(`/purchase-orders/${id}/cancel`), actionOptions)
  const updateMutation = useApiMutation((values: any) => api.patch(`/purchase-orders/${id}`, values), {
    successMessage: 'Cập nhật thành công',
    invalidateKey: ['purchase-orders', id],
    onSuccess: editModal.close,
  })

  return { navigate, editModal, data, isLoading, confirmMutation, unconfirmMutation, cancelMutation, updateMutation }
}
