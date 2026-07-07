import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useApiMutation } from './useApiMutation'
import { useEntityModal } from './useEntityModal'

export function useReceiptDetail(id: string) {
  const [completeOpen, setCompleteOpen] = useState(false)
  // serialsText[line_id] = textarea content (mỗi dòng text = 1 serial number)
  const [serialsText, setSerialsText] = useState<Record<string, string>>({})
  const [serialsFor, setSerialsFor] = useState<{ line_id: string; label: string } | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['receipts', id],
    queryFn: async () => (await api.get(`/receipts/${id}`)).data,
  })

  // Chi tiết SN đã nhập cho 1 dòng (chỉ có sau khi Complete).
  const { data: serials, isLoading: serialsLoading } = useQuery({
    queryKey: ['inventory', 'serials', serialsFor?.line_id],
    queryFn: async () =>
      (await api.get('/inventory/serials', { params: { receipt_line_id: serialsFor!.line_id } })).data,
    enabled: !!serialsFor,
  })

  const actionOptions = {
    successMessage: 'Thành công',
    invalidateKey: [['receipts', id], ['receipts'], ['inventory']],
  }
  const submitMutation = useApiMutation(() => api.patch(`/receipts/${id}/submit`), actionOptions)
  const approveMutation = useApiMutation(() => api.patch(`/receipts/${id}/approve`), actionOptions)
  const cancelMutation = useApiMutation(() => api.patch(`/receipts/${id}/cancel`), actionOptions)
  const editModal = useEntityModal()
  const updateMutation = useApiMutation((values: any) => api.patch(`/receipts/${id}`, values), {
    successMessage: 'Cập nhật thành công',
    invalidateKey: ['receipts', id],
    onSuccess: editModal.close,
  })
  const completeMutation = useApiMutation((body: any) => api.patch(`/receipts/${id}/complete`, body), {
    ...actionOptions,
    onSuccess: () => setCompleteOpen(false),
  })

  function submitComplete() {
    const lines = data.lines
      .filter((l: any) => l.product_type === 'storable')
      .map((l: any) => ({
        line_id: l.id,
        serials: (serialsText[l.id] ?? '')
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
      }))
    completeMutation.mutate({ lines })
  }

  return {
    data, isLoading,
    serials, serialsLoading,
    completeOpen, setCompleteOpen,
    serialsText, setSerialsText,
    serialsFor, setSerialsFor,
    editModal,
    submitMutation, approveMutation, cancelMutation, updateMutation, completeMutation,
    submitComplete,
  }
}
