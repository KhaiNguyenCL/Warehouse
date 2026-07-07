import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { message } from 'antd'
import { api } from '../lib/api'
import { useApiMutation } from './useApiMutation'
import { useEntityModal } from './useEntityModal'

export function useQuotationDetail(id: string) {
  const navigate = useNavigate()
  const [templateId, setTemplateId] = useState<string | undefined>()
  const [exporting, setExporting] = useState(false)
  const [dealId, setDealId] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['quotations', id],
    queryFn: async () => (await api.get(`/quotations/${id}`)).data,
  })

  const { data: templates } = useQuery({
    queryKey: ['templates', 'quotation'],
    queryFn: async () => (await api.get('/templates', { params: { object_type: 'quotation', limit: 50 } })).data,
  })

  const actionOptions = { successMessage: 'Thành công', invalidateKey: [['quotations', id], ['quotations']] }
  const confirmMutation = useApiMutation(() => api.patch(`/quotations/${id}/confirm`), actionOptions)
  const unconfirmMutation = useApiMutation(() => api.patch(`/quotations/${id}/unconfirm`), actionOptions)
  const cancelMutation = useApiMutation(() => api.patch(`/quotations/${id}/cancel`), actionOptions)
  const editModal = useEntityModal()
  const updateMutation = useApiMutation((values: any) => api.patch(`/quotations/${id}`, values), {
    successMessage: 'Cập nhật thành công',
    invalidateKey: ['quotations', id],
    onSuccess: editModal.close,
  })
  const expireMutation = useApiMutation(() => api.patch(`/quotations/${id}/expire`), actionOptions)

  // CLAUDE.md mục 13: "Bấm Sync lại → ghi đè toàn bộ field được map (không hỏi lại)" — chỉ
  // cho phép khi Draft (BitrixService chặn ở backend), deal_id để trống = sync lại deal cũ.
  const syncMutation = useApiMutation(
    () => api.post(`/bitrix/quotations/${id}/sync`, dealId ? { deal_id: dealId } : {}),
    { ...actionOptions, successMessage: 'Đồng bộ Bitrix thành công', onSuccess: () => setDealId('') },
  )

  async function handleExport(format: 'xlsx' | 'pdf') {
    if (!templateId) {
      message.error('Chọn 1 template trước')
      return
    }
    setExporting(true)
    try {
      const res = await api.post(
        `/templates/${templateId}/export`,
        { object_id: id, format },
        { responseType: 'blob' },
      )
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `${data?.code ?? 'quotation'}.${format}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      message.error(err.response?.data?.message ?? 'Xuất file thất bại')
    } finally {
      setExporting(false)
    }
  }

  return {
    navigate,
    data, isLoading,
    templates,
    templateId, setTemplateId,
    exporting,
    dealId, setDealId,
    editModal,
    confirmMutation, unconfirmMutation, cancelMutation, updateMutation, expireMutation, syncMutation,
    handleExport,
  }
}
