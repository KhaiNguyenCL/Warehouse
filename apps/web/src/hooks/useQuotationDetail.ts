import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Form, message } from 'antd'
import dayjs from 'dayjs'
import { api } from '../lib/api'
import { useApiMutation } from './useApiMutation'

export function useQuotationDetail(id: string) {
  const isNew = id === 'new'
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [isEditing, setIsEditing] = useState(isNew)
  const [templateId, setTemplateId] = useState<string | undefined>()
  const [exporting, setExporting] = useState(false)
  const [dealId, setDealId] = useState('')
  const [bitrixLoading, setBitrixLoading] = useState(false)
  const [bitrixError, setBitrixError]  = useState<string | null>(null)
  const [bitrixInfo,  setBitrixInfo]   = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['quotations', id],
    queryFn: async () => (await api.get(`/quotations/${id}`)).data,
    enabled: !isNew,
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

  // ── Fetch từ Bitrix để điền form (dùng cho cả create và edit) ──────────────
  async function fetchFromBitrix() {
    if (!dealId.trim()) return
    setBitrixLoading(true)
    setBitrixError(null)
    setBitrixInfo(null)
    try {
      const [resolveRes, previewRes] = await Promise.all([
        api.get(`/bitrix/deals/${dealId}/resolve`),
        api.get(`/bitrix/deals/${dealId}/preview-sync`).catch(() => null),
      ])
      const d = resolveRes.data
      const patch: Record<string, any> = { bitrix_deal_id: dealId }
      if (d.company?.id)       patch.company_id = d.company.id
      if (d.contact?.id)       patch.contact_id = d.contact.id
      if (d.deal_title)        patch.project_name = d.deal_title
      if (d.delivery_location) patch.delivery_location = d.delivery_location
      if (previewRes?.data?.rows) {
        for (const row of previewRes.data.rows) {
          if (!row.skipped && row.form_value != null && row.form_value !== '') {
            patch[row.quotation_field] = row.form_value
          }
        }
      }
      form.setFieldsValue(patch)
      const filled = Object.entries(patch).filter(([k, v]) => k !== 'bitrix_deal_id' && v != null).length
      setBitrixInfo(filled ? `Đã điền ${filled} field` : 'Fetch thành công — không có field nào match')
    } catch (err: any) {
      setBitrixError(err?.response?.data?.message ?? 'Không fetch được Deal')
    } finally {
      setBitrixLoading(false)
    }
  }

  // ── Mutations ──────────────────────────────────────────────────────────────
  const actionOptions = { successMessage: 'Thành công', invalidateKey: [['quotations', id], ['quotations']] as any }

  const createMutation = useApiMutation(
    (values: any) => api.post('/quotations', values),
    {
      successMessage: 'Tạo báo giá thành công',
      invalidateKey: ['quotations'],
      onSuccess: (res: any) => navigate(`/quotations/${res.data.id}`),
    },
  )

  const updateMutation = useApiMutation(
    (values: any) => api.patch(`/quotations/${id}`, values),
    {
      successMessage: 'Cập nhật thành công',
      invalidateKey: [['quotations', id], ['quotations']],
      onSuccess: () => setIsEditing(false),
    },
  )

  const confirmMutation   = useApiMutation(() => api.patch(`/quotations/${id}/confirm`),   actionOptions)
  const unconfirmMutation = useApiMutation(() => api.patch(`/quotations/${id}/unconfirm`), actionOptions)
  const cancelMutation    = useApiMutation(() => api.patch(`/quotations/${id}/cancel`),    actionOptions)
  const expireMutation    = useApiMutation(() => api.patch(`/quotations/${id}/expire`),    actionOptions)

  const syncMutation = useApiMutation(
    () => api.post(`/bitrix/quotations/${id}/sync`, dealId ? { deal_id: dealId } : {}),
    { ...actionOptions, successMessage: 'Đồng bộ Bitrix thành công', onSuccess: () => setDealId('') },
  )

  // ── Form actions ───────────────────────────────────────────────────────────
  function mapLineItem(li: any) {
    return {
      variant_id:  li.variant_id  ?? undefined,
      bundle_id:   li.bundle_id   ?? undefined,
      description: li.description,
      quantity:    li.quantity,
      unit_price:  li.unit_price,
      vat_percent: li.vat_percent,
      warranty:    li.warranty,
      is_reserved: li.is_reserved,
      note:        li.note,
    }
  }

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
      terms:             data.terms,
      note:              data.note,
      bitrix_deal_id:    data.bitrix_deal_id,
      sections: (data.sections ?? []).map((s: any) => ({
        name: s.name,
        sub_sections: (s.sub_sections ?? []).map((ss: any) => ({
          name:       ss.name,
          product_id: ss.product_id,
          line_items: (ss.line_items ?? []).map((li: any) => mapLineItem(li)),
        })),
        line_items: (s.line_items ?? []).map((li: any) => mapLineItem(li)),
      })),
    })
    setIsEditing(true)
  }

  async function saveEdit() {
    const values = await form.validateFields()
    const quote_date = values.quote_date ? dayjs(values.quote_date).format('YYYY-MM-DD') : null
    const payload = { ...values, quote_date }
    if (isNew) {
      createMutation.mutate(payload)
    } else {
      updateMutation.mutate(payload)
    }
  }

  function cancelEdit() {
    if (isNew) {
      navigate('/quotations')
    } else {
      form.resetFields()
      setIsEditing(false)
    }
  }

  async function handlePdfExport() {
    setExporting(true)
    try {
      const res = await api.get(`/quotations/${id}/pdf`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `${data?.code ?? 'quotation'}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      message.error(err.response?.data?.message ?? 'Xuất PDF thất bại')
    } finally {
      setExporting(false)
    }
  }

  async function handlePdfPreview() {
    setExporting(true)
    try {
      const res = await api.get(`/quotations/${id}/pdf`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      window.open(url, '_blank')
      // revoke sau 60s để không leak memory
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (err: any) {
      message.error(err.response?.data?.message ?? 'Không thể xem trước PDF')
    } finally {
      setExporting(false)
    }
  }

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

  const savePending = isNew ? createMutation.isPending : updateMutation.isPending

  return {
    isNew,
    navigate,
    data, isLoading,
    form, isEditing, startEdit, saveEdit, cancelEdit, savePending,
    companies, companyId, companyDetail, warehouses,
    templates, templateId, setTemplateId,
    exporting,
    dealId, setDealId, fetchFromBitrix, bitrixLoading, bitrixError, bitrixInfo,
    updateMutation,
    confirmMutation, unconfirmMutation, cancelMutation, expireMutation, syncMutation,
    handleExport, handlePdfExport, handlePdfPreview,
  }
}
