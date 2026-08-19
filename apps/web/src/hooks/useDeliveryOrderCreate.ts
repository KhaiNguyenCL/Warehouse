import { useEffect, useRef, useState } from 'react'
import { Form, message } from 'antd'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import dayjs from 'dayjs'
import { api } from '../lib/api'

export function useDeliveryOrderCreate() {
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [searchParams] = useSearchParams()
  const quotationIdFromQuery = searchParams.get('quotation_id') ?? undefined
  const [quotationId, setQuotationId] = useState<string | undefined>(quotationIdFromQuery)

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
  const requiresCompanyType: string | undefined = activeExportType?.requires_company
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
    if (quotationIdFromQuery) {
      form.setFieldValue('export_type', 'sale')
      setQuotationId(quotationIdFromQuery)
    }
  }, [quotationIdFromQuery])

  useEffect(() => {
    if (quotationDetail) {
      const lines = quotationDetail.sections
        .flatMap((s: any) => [
          ...(s.sub_sections ?? []).flatMap((ss: any) => ss.line_items ?? []),
          ...(s.line_items ?? []),
        ])
        .filter((l: any) => l.variant_id && l.remaining_qty > 0)
        .map((l: any) => ({
          variant_id: l.variant_id,
          variant_label: `${l.variant_sku} — ${l.variant_name}`,
          quotation_line_item_id: l.id,
          quantity: l.remaining_qty,
        }))
      form.setFieldsValue({ quotation_id: quotationDetail.id, company_id: quotationDetail.company_id, warehouse_id: quotationDetail.warehouse_id, lines })
    }
  }, [quotationDetail])

  const goToDetailRef = useRef(false)

  const createMutation = useMutation({
    mutationFn: (values: any) => {
      const lines = values.lines.map((l: any) => ({
        variant_id: l.variant_id,
        quantity: l.quantity,
        quotation_line_item_id: l.quotation_line_item_id,
        customer_warranty_start: l.customer_warranty_start
          ? (dayjs.isDayjs(l.customer_warranty_start) ? l.customer_warranty_start.toISOString() : dayjs(l.customer_warranty_start).toISOString())
          : undefined,
        note: l.note,
      }))
      const body: any = { ...values, lines }
      if (isAdjustment) { body.ref_document_type = 'stocktake_result'; body.ref_document_id = values.ref_document_id }
      return api.post('/deliveries', body)
    },
    onSuccess: (res: any) => {
      message.success('Tạo phiếu xuất thành công')
      qc.invalidateQueries({ queryKey: ['deliveries'] })
      navigate(goToDetailRef.current ? `/deliveries/${res.data.id}` : '/deliveries')
      goToDetailRef.current = false
    },
    onError: (err: any) => message.error(err.response?.data?.error ?? 'Lỗi'),
  })

  function submit() { form.submit() }
  function submitAndComplete() { goToDetailRef.current = true; form.submit() }

  useEffect(() => {
    const whs = warehouses as any[] | undefined
    const defaultWh = whs?.find((w: any) => w.is_default)?.id ?? whs?.[0]?.id
    if (defaultWh) form.setFieldValue('warehouse_id', defaultWh)
  }, [warehouses])

  return {
    form, navigate,
    exportTypes, warehouses, exportType, requiresCompanyType, requiresQuotation, isAdjustment,
    companies, companyDetail, companyId,
    confirmedQuotations, quotationId, setQuotationId,
    createMutation, submit, submitAndComplete,
  }
}
