import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useApiMutation } from './useApiMutation'
import { useEntityModal } from './useEntityModal'

interface AvailableSN {
  id: string
  serial_no: string
  receipt_code: string | null
  received_at: string | null
  cost_price: number | null
  manufacturer_warranty_months: number | null
  customer_warranty_months: number | null
  manufacturer_warranty_end: string | null
  customer_warranty_end: string | null
  mac_address: string | null
  po_code: string | null
}

export function useDeliveryOrderDetail(id: string) {
  const [completeOpen, setCompleteOpen] = useState(false)
  // lineId → serial_no[] đã chọn
  const [selectedSNs, setSelectedSNs] = useState<Record<string, string[]>>({})
  // lineId → AvailableSN[] (fetch khi mở modal)
  const [lineSNs, setLineSNs] = useState<Record<string, AvailableSN[]>>({})
  const [loadingSNs, setLoadingSNs] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['deliveries', id],
    queryFn: async () => (await api.get(`/deliveries/${id}`)).data,
  })

  const actionOptions = {
    successMessage: 'Thành công',
    invalidateKey: [['deliveries', id], ['deliveries'], ['inventory']] as any,
  }
  const submitMutation   = useApiMutation(() => api.patch(`/deliveries/${id}/submit`), actionOptions)
  const approveMutation  = useApiMutation(() => api.patch(`/deliveries/${id}/approve`), actionOptions)
  const cancelMutation   = useApiMutation(() => api.patch(`/deliveries/${id}/cancel`), actionOptions)
  const editModal = useEntityModal()
  const updateMutation = useApiMutation((values: any) => api.patch(`/deliveries/${id}`, values), {
    successMessage: 'Cập nhật thành công',
    invalidateKey: ['deliveries', id],
    onSuccess: editModal.close,
  })
  const completeMutation = useApiMutation((body: any) => api.patch(`/deliveries/${id}/complete`, body), {
    ...actionOptions,
    onSuccess: () => setCompleteOpen(false),
  })

  async function openComplete() {
    setCompleteOpen(true)
    setSelectedSNs({})
    setLoadingSNs(true)

    const storableLines = (data.lines as any[]).filter((l) => l.product_type === 'storable')
    const snMap: Record<string, AvailableSN[]> = {}

    await Promise.all(
      storableLines.map(async (line) => {
        try {
          const res = await api.get(
            `/inventory/serials?variant_id=${line.variant_id}&warehouse_id=${data.warehouse_id}`,
          )
          snMap[line.id] = res.data as AvailableSN[]
        } catch {
          snMap[line.id] = []
        }
      }),
    )

    setLineSNs(snMap)
    setLoadingSNs(false)
  }

  function submitComplete() {
    const lines = (data.lines as any[])
      .filter((l) => l.product_type === 'storable')
      .map((l) => ({ line_id: l.id, serials: selectedSNs[l.id] ?? [] }))
    completeMutation.mutate({ lines })
  }

  return {
    data, isLoading,
    completeOpen, setCompleteOpen,
    selectedSNs, setSelectedSNs,
    lineSNs, loadingSNs,
    editModal,
    submitMutation, approveMutation, cancelMutation, updateMutation, completeMutation,
    openComplete, submitComplete,
  }
}
