import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Form, message } from 'antd'
import dayjs from 'dayjs'
import { api } from '../lib/api'
import { useApiMutation } from './useApiMutation'

export function useQuotationDetail(id: string) {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [isEditing, setIsEditing] = useState(false)
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

  const { data: companies } = useQuery({
    queryKey: ['companies', 'customer'],
    queryFn: async () => (await api.get('/companies', { params: { type: 'customer', limit: 100 } })).data,
    enabled: isEditing,
  })

  const companyId: string | undefined = Form.useWatch('company_id', form)
  const { data: companyDetail } = useQuery({
    queryKey: ['companies', companyId],
    queryFn: async () => (await api.get(`/companies/${companyId}`)).data,
    enabled: !!companyId && isEditing,
  })

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => (await api.get('/warehouses')).data,
    enabled: isEditing,
  })

  function startEdit() {
    if (!data) return
    form.setFieldsValue({
      company_id:        data.company_id,
      contact_id:        data.contact_id,
      quote_number:      data.quote_number,
      quote_date:        data.quote_date ? dayjs(data.quote_date) : undefined,
      project_name:      data.project_name,
      delivery_location: data.delivery_location,
      warehouse_id:      data.warehouse_id,
      valid_days:        data.valid_days,
      discount:          data.discount,
      terms:             data.terms,
      note:              data.note,
    })
    setIsEditing(true)
  }

  const actionOptions = { successMessage: 'Thành công', invalidateKey: [['quotations', id], ['quotations']] as any }

  const updateMutation = useApiMutation(
    (values: any) => api.patch(`/quotations/${id}`, values),
    {
      successMessage: 'Cập nhật thành công',
      invalidateKey: [['quotations', id], ['quotations']],
      onSuccess: () => setIsEditing(false),
    },
  )

  async function saveEdit() {
    const values = await form.validateFields()
    const quote_date = values.quote_date ? dayjs(values.quote_date).format('YYYY-MM-DD') : null
    updateMutation.mutate({ ...values, quote_date })
  }

  const confirmMutation   = useApiMutation(() => api.patch(`/quotations/${id}/confirm`), actionOptions)
  const unconfirmMutation = useApiMutation(() => api.patch(`/quotations/${id}/unconfirm`), actionOptions)
  const cancelMutation    = useApiMutation(() => api.patch(`/quotations/${id}/cancel`), actionOptions)
  const expireMutation    = useApiMutation(() => api.patch(`/quotations/${id}/expire`), actionOptions)

  const syncMutation = useApiMutation(
    () => api.post(`/bitrix/quotations/${id}/sync`, dealId ? { deal_id: dealId } : {}),
    { ...actionOptions, successMessage: 'Đồng bộ Bitrix thành công', onSuccess: () => setDealId('') },
  )

  async function handleExport(format: 'xlsx' | 'pdf') {
    if (!templateId) { message.error('Chọn 1 template trước'); return }
    setExporting(true)
    try {
      const res = await api.post(`/templates/${templateId}/export`, { object_id: id, format }, { responseType: 'blob' })
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

  function cancelEdit() {
    form.resetFields()
    setIsEditing(false)
  }

  return {
    navigate,
    data, isLoading,
    form, isEditing, startEdit, saveEdit, cancelEdit,
    companies, companyId, companyDetail, warehouses,
    templates, templateId, setTemplateId,
    exporting,
    dealId, setDealId,
    updateMutation,
    confirmMutation, unconfirmMutation, cancelMutation, expireMutation, syncMutation,
    handleExport,
  }
}
