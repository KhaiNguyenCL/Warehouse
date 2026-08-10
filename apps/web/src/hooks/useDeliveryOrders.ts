import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Form, message } from 'antd'
import { useNavigate, useSearchParams } from 'react-router-dom'
import dayjs from 'dayjs'
import { api } from '../lib/api'
import { useEntityModal } from './useEntityModal'
import { useDebounce } from './useDebounce'

export function useDeliveryOrders() {
  const [searchParams] = useSearchParams()
  const quotationIdFromQuery = searchParams.get('quotation_id') ?? undefined
  const { open, form, openCreate, close } = useEntityModal()
  const [quotationId, setQuotationId] = useState<string | undefined>(quotationIdFromQuery)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const goToDetailRef = useRef(false)

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

  const [page, setPage] = useState(1)
  const [_searchInput, _setSearchInput] = useState('')
  const [sortBy, setSortBy] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null)
  const search = useDebounce(_searchInput)

  const searchInput = _searchInput
  function setSearchInput(v: string) { _setSearchInput(v); setPage(1) }
  function setSort(field: string | null, order: 'asc' | 'desc' | null) {
    setSortBy(field); setSortOrder(order); setPage(1)
  }

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['deliveries', page, search, sortBy, sortOrder],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const params: Record<string, any> = { page, limit: 20 }
      if (search.trim()) params.search = search.trim()
      if (sortBy) { params.sort_by = sortBy; params.sort_order = sortOrder ?? 'asc' }
      return (await api.get('/deliveries', { params })).data
    },
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

  const createMutation = useMutation({
    mutationFn: (values: any) => {
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
    onSuccess: (res: any) => {
      message.success('Tạo Delivery Order thành công')
      qc.invalidateQueries({ queryKey: ['deliveries'] })
      if (goToDetailRef.current) {
        goToDetailRef.current = false
        navigate(`/deliveries/${res.data.id}`)
      } else {
        closeAll()
      }
    },
    onError: (err: any) => message.error(err.response?.data?.error ?? 'Lỗi'),
  })

  function createAndGoToDetail() {
    goToDetailRef.current = true
    form.submit()
  }

  function openCreateDefault() {
    const whs = warehouses as any[] | undefined
    const defaultWh = whs?.find((w) => w.is_default)?.id ?? whs?.[0]?.id
    openCreate(defaultWh ? { warehouse_id: defaultWh } : undefined)
  }

  return {
    open, form, openCreate: openCreateDefault, closeAll,
    quotationId, setQuotationId, quotationIdFromQuery,
    navigate,
    page, setPage,
    searchInput, setSearchInput, sortBy, sortOrder, setSort,
    data, isLoading, isFetching,
    exportTypes, warehouses,
    exportType, activeExportType, requiresCompanyType, requiresQuotation, isAdjustment,
    companies, companyDetail, companyId,
    confirmedQuotations,
    createMutation, createAndGoToDetail,
  }
}
