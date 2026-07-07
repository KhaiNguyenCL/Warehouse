import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Form } from 'antd'
import { useNavigate, useSearchParams } from 'react-router-dom'
import dayjs from 'dayjs'
import { api } from '../lib/api'
import { useApiMutation } from './useApiMutation'
import { useEntityModal } from './useEntityModal'

export function useDeliveryOrders() {
  const [searchParams] = useSearchParams()
  const quotationIdFromQuery = searchParams.get('quotation_id') ?? undefined
  const { open, form, openCreate, close } = useEntityModal()
  const [quotationId, setQuotationId] = useState<string | undefined>(quotationIdFromQuery)
  const navigate = useNavigate()

  function closeAll() {
    close()
    setQuotationId(undefined)
  }

  useEffect(() => {
    if (quotationIdFromQuery) {
      setQuotationId(quotationIdFromQuery)
      openCreate()
      // openCreate() gọi resetFields() bên trong — phải set sau, không phải trước.
      form.setFieldValue('export_type', 'sale')
    }
  }, [quotationIdFromQuery])

  const { data, isLoading } = useQuery({
    queryKey: ['deliveries'],
    queryFn: async () => (await api.get('/deliveries')).data,
  })

  const { data: exportTypes } = useQuery({
    queryKey: ['export-types'],
    queryFn: async () => (await api.get('/settings/export-types')).data,
  })

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => (await api.get('/warehouses')).data,
  })

  const exportType: string | undefined = Form.useWatch('export_type', form)
  const activeExportType = exportTypes?.find((t: any) => t.key === exportType)
  const requiresCompanyType = activeExportType?.requires_company // 'customer' | 'supplier' | 'none'
  const requiresQuotation = !!activeExportType?.requires_quotation
  const isAdjustment = exportType === 'adjustment'

  const { data: companies } = useQuery({
    queryKey: ['companies', requiresCompanyType],
    queryFn: async () => (await api.get('/companies', { params: { type: requiresCompanyType, limit: 100 } })).data,
    enabled: requiresCompanyType === 'customer' || requiresCompanyType === 'supplier',
  })

  const companyId: string | undefined = Form.useWatch('company_id', form)
  const { data: companyDetail } = useQuery({
    queryKey: ['companies', companyId],
    queryFn: async () => (await api.get(`/companies/${companyId}`)).data,
    enabled: !!companyId,
  })

  // Quotation Confirmed để chọn (xuất theo báo giá) — chỉ cần khi export_type yêu cầu (sale).
  const { data: confirmedQuotations } = useQuery({
    queryKey: ['quotations', 'confirmed'],
    queryFn: async () => (await api.get('/quotations', { params: { status: 'confirmed', limit: 100 } })).data,
    enabled: requiresQuotation,
  })

  const { data: quotationDetail } = useQuery({
    queryKey: ['quotations', quotationId],
    queryFn: async () => (await api.get(`/quotations/${quotationId}`)).data,
    enabled: !!quotationId,
  })

  useEffect(() => {
    if (quotationDetail) {
      const lines = quotationDetail.sections
        .flatMap((s: any) => s.line_items)
        .filter((l: any) => l.variant_id && l.remaining_qty > 0)
        .map((l: any) => ({
          variant_id: l.variant_id,
          variant_label: `${l.variant_sku} — ${l.variant_name}`,
          quotation_line_item_id: l.id,
          quantity: l.remaining_qty,
        }))
      form.setFieldsValue({
        quotation_id: quotationDetail.id,
        company_id: quotationDetail.company_id,
        warehouse_id: quotationDetail.warehouse_id,
        lines,
      })
    }
  }, [quotationDetail])

  const createMutation = useApiMutation(
    (values: any) => {
      const lines = values.lines.map((l: any) => ({
        variant_id: l.variant_id,
        quantity: l.quantity,
        quotation_line_item_id: l.quotation_line_item_id,
        customer_warranty_start: l.customer_warranty_start
          ? (dayjs.isDayjs(l.customer_warranty_start)
              ? l.customer_warranty_start.toISOString()
              : dayjs(l.customer_warranty_start).toISOString())
          : undefined,
        note: l.note,
      }))
      const body: any = { ...values, lines }
      if (isAdjustment) {
        body.ref_document_type = 'stocktake_result'
        body.ref_document_id = values.ref_document_id
      }
      return api.post('/deliveries', body)
    },
    { successMessage: 'Tạo Delivery Order thành công (Draft)', invalidateKey: ['deliveries'], onSuccess: closeAll },
  )

  return {
    open, form, openCreate, closeAll,
    quotationId, setQuotationId, quotationIdFromQuery,
    navigate,
    data, isLoading,
    exportTypes, warehouses,
    exportType, activeExportType, requiresCompanyType, requiresQuotation, isAdjustment,
    companies, companyDetail, companyId,
    confirmedQuotations,
    createMutation,
  }
}
