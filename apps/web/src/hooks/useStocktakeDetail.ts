import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { message } from 'antd'
import { api } from '../lib/api'
import { useApiMutation } from './useApiMutation'

export function useStocktakeDetail(id: string) {
  // qtyActual[line_id] = số lượng thực tế nhập tay; serialsText[line_id] = serial quét được (storable)
  const [qtyActual, setQtyActual] = useState<Record<string, number>>({})
  const [serialsText, setSerialsText] = useState<Record<string, string>>({})

  const { data, isLoading } = useQuery({
    queryKey: ['stocktakes', id],
    queryFn: async () => (await api.get(`/stocktakes/${id}`)).data,
  })

  const actionOptions = { successMessage: 'Thành công', invalidateKey: [['stocktakes', id], ['stocktakes']] }
  const cancelMutation = useApiMutation(() => api.patch(`/stocktakes/${id}/cancel`), actionOptions)
  const completeMutation = useApiMutation((body: any) => api.patch(`/stocktakes/${id}/complete`, body), actionOptions)

  function submitComplete() {
    const lines = data.lines
      .filter((l: any) => qtyActual[l.id] !== undefined)
      .map((l: any) => ({
        line_id: l.id,
        qty_actual: qtyActual[l.id],
        found_serials:
          l.product_type === 'storable'
            ? (serialsText[l.id] ?? '').split('\n').map((s: string) => s.trim()).filter(Boolean)
            : undefined,
      }))
    if (lines.length !== data.lines.length) {
      message.error('Phải nhập số lượng thực tế cho tất cả dòng trước khi Complete')
      return
    }
    completeMutation.mutate({ lines })
  }

  return {
    data, isLoading,
    qtyActual, setQtyActual,
    serialsText, setSerialsText,
    cancelMutation, completeMutation,
    submitComplete,
  }
}
