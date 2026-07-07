import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useApiMutation } from './useApiMutation'
import { useEntityModal } from './useEntityModal'

export function useTransferOrderDetail(id: string) {
  const [completeOpen, setCompleteOpen] = useState(false)
  const [serialsText, setSerialsText] = useState<Record<string, string>>({})

  const { data, isLoading } = useQuery({
    queryKey: ['transfers', id],
    queryFn: async () => (await api.get(`/transfers/${id}`)).data,
  })

  const actionOptions = {
    successMessage: 'Thành công',
    invalidateKey: [['transfers', id], ['transfers'], ['inventory']],
  }
  const cancelMutation = useApiMutation(() => api.patch(`/transfers/${id}/cancel`), actionOptions)
  const editModal = useEntityModal()
  const updateMutation = useApiMutation((values: any) => api.patch(`/transfers/${id}`, values), {
    successMessage: 'Cập nhật thành công',
    invalidateKey: ['transfers', id],
    onSuccess: editModal.close,
  })
  const completeMutation = useApiMutation((body: any) => api.patch(`/transfers/${id}/complete`, body), {
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
          .map((s: string) => s.trim())
          .filter(Boolean),
      }))
    completeMutation.mutate({ lines })
  }

  return {
    data, isLoading,
    completeOpen, setCompleteOpen,
    serialsText, setSerialsText,
    editModal,
    cancelMutation, updateMutation, completeMutation,
    submitComplete,
  }
}
