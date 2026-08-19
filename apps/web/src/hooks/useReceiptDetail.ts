import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useApiMutation } from './useApiMutation'
import { useEntityModal } from './useEntityModal'
import type { SnRow } from '../components/SnScanGrid'

export function useReceiptDetail(id: string) {
  const [completeOpen, setCompleteOpen] = useState(false)
  // serialsRows[line_id] = array of { serial_no, mac_address, note } per unit
  const [serialsRows, setSerialsRows] = useState<Record<string, SnRow[]>>({})
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
  const cancelMutation = useApiMutation(() => api.patch(`/receipts/${id}/cancel`), actionOptions)
  const editModal = useEntityModal()
  const updateMutation = useApiMutation((values: any) => {
    const lines = values.lines?.map((l: any) => ({
      id: l.id,
      cost_price: l.cost_price,
      manufacturer_warranty_months: l.manufacturer_warranty_months ?? null,
      manufacturer_warranty_start: l.manufacturer_warranty_start ?? null,
      customer_warranty_months: l.customer_warranty_months ?? null,
    }))
    return api.patch(`/receipts/${id}`, { note: values.note, lines })
  }, {
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
        serials: (serialsRows[l.id] ?? []).filter((r) => r.serial_no.trim()),
      }))
    completeMutation.mutate({ lines })
  }

  return {
    data, isLoading,
    serials, serialsLoading,
    completeOpen, setCompleteOpen,
    serialsRows, setSerialsRows,
    serialsFor, setSerialsFor,
    editModal,
    cancelMutation, updateMutation, completeMutation,
    submitComplete,
  }
}
