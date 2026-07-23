import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Form } from 'antd'
import dayjs from 'dayjs'
import { api } from '../lib/api'
import { useApiMutation } from './useApiMutation'
import type { SnRow } from '../components/SnScanGrid'

export type ReceiptFormMode = 'create' | 'edit' | 'view'

export function useReceiptForm(options?: { onUpdateSuccess?: () => void }) {
  const { id } = useParams<{ id?: string }>()
  const [searchParams] = useSearchParams()
  const poIdFromQuery = searchParams.get('po_id') ?? undefined
  const [form] = Form.useForm()
  const navigate = useNavigate()

  // create-mode: PO selector state
  const [poId, setPoId] = useState<string | undefined>(poIdFromQuery)

  // variant search (no-PO create mode)
  const [variantSearch, setVariantSearch] = useState('')

  // complete mode: inline SN entry section
  const [completeMode, setCompleteMode] = useState(false)
  const [serialsRows, setSerialsRows] = useState<Record<string, SnRow[]>>({})

  // SN view state (for completed receipts)
  const [serialsFor, setSerialsFor] = useState<{ line_id: string; label: string } | null>(null)

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: receipt, isLoading } = useQuery({
    queryKey: ['receipts', id],
    queryFn: async () => (await api.get(`/receipts/${id}`)).data,
    enabled: !!id,
  })

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => (await api.get('/warehouses')).data,
  })

  const { data: importTypes } = useQuery({
    queryKey: ['import-types'],
    queryFn: async () => (await api.get('/settings/import-types')).data,
  })

  const { data: confirmedPOs } = useQuery({
    queryKey: ['purchase-orders', 'confirmed'],
    queryFn: async () => (await api.get('/purchase-orders', { params: { status: 'confirmed', limit: 100 } })).data,
  })

  const { data: poDetail } = useQuery({
    queryKey: ['purchase-orders', poId],
    queryFn: async () => (await api.get(`/purchase-orders/${poId}`)).data,
    enabled: !!poId,
  })

  const { data: variantOptions } = useQuery({
    queryKey: ['variants-search', variantSearch],
    queryFn: async () => (await api.get('/products/variants', { params: { search: variantSearch || undefined, limit: 50 } })).data,
  })

  const { data: serials, isLoading: serialsLoading } = useQuery({
    queryKey: ['inventory', 'serials', serialsFor?.line_id],
    queryFn: async () =>
      (await api.get('/inventory/serials', { params: { receipt_line_id: serialsFor!.line_id } })).data,
    enabled: !!serialsFor,
  })

  // ── Effects ──────────────────────────────────────────────────────────────

  // When receipt loads → populate form for edit mode
  useEffect(() => {
    if (!receipt) return
    form.setFieldsValue({
      note: receipt.note,
      received_date: receipt.received_date ? dayjs(receipt.received_date) : undefined,
      lines: (receipt.lines ?? []).map((l: any) => ({
        id: l.id,
        cost_price: l.cost_price,
        has_manufacturer_warranty: l.manufacturer_warranty_months != null,
        manufacturer_warranty_months: l.manufacturer_warranty_months,
        manufacturer_warranty_start: l.manufacturer_warranty_start ? dayjs(l.manufacturer_warranty_start) : undefined,
        has_customer_warranty: l.customer_warranty_months != null,
        customer_warranty_months: l.customer_warranty_months,
      })),
    })
  }, [receipt])

  // When PO detail loads → auto-fill lines in create mode
  useEffect(() => {
    if (!poDetail) return
    form.setFieldsValue({
      po_id: poDetail.id,
      company_id: poDetail.company_id,
      lines: poDetail.lines
        .filter((l: any) => l.remaining_qty > 0)
        .map((l: any) => ({
          variant_id: l.variant_id,
          variant_label: `${l.variant_sku} — ${l.variant_name}`,
          po_line_id: l.id,
          quantity: l.remaining_qty,
          cost_price: l.unit_price,
          has_manufacturer_warranty: l.manufacturer_warranty_months != null,
          manufacturer_warranty_months: l.manufacturer_warranty_months,
          has_customer_warranty: l.customer_warranty_months != null,
          customer_warranty_months: l.customer_warranty_months,
        })),
    })
  }, [poDetail])

  // When poId cleared → reset po-related fields
  useEffect(() => {
    if (!poId) {
      form.setFieldsValue({ po_id: undefined, company_id: undefined, lines: [] })
    }
  }, [poId])

  // ── Derived mode ─────────────────────────────────────────────────────────

  const mode: ReceiptFormMode = !id ? 'create' : receipt?.status === 'draft' ? 'edit' : 'view'

  // ── Line transform helper (shared between create & update) ───────────────

  function transformLineForCreate(l: any) {
    return {
      variant_id: l.variant_id,
      quantity: l.quantity,
      cost_price: l.cost_price,
      po_line_id: l.po_line_id,
      manufacturer_warranty_months: l.has_manufacturer_warranty ? l.manufacturer_warranty_months : undefined,
      manufacturer_warranty_start:
        l.has_manufacturer_warranty && l.manufacturer_warranty_start
          ? dayjs.isDayjs(l.manufacturer_warranty_start)
            ? l.manufacturer_warranty_start.toISOString()
            : dayjs(l.manufacturer_warranty_start).toISOString()
          : undefined,
      customer_warranty_months: l.has_customer_warranty ? l.customer_warranty_months : undefined,
    }
  }

  function transformLineForUpdate(l: any) {
    return {
      id: l.id,
      cost_price: l.cost_price,
      manufacturer_warranty_months: l.has_manufacturer_warranty ? l.manufacturer_warranty_months : null,
      manufacturer_warranty_start: l.has_manufacturer_warranty
        ? l.manufacturer_warranty_start != null
          ? dayjs.isDayjs(l.manufacturer_warranty_start)
            ? l.manufacturer_warranty_start.toISOString()
            : dayjs(l.manufacturer_warranty_start).toISOString()
          : null
        : null,
      customer_warranty_months: l.has_customer_warranty ? l.customer_warranty_months : null,
    }
  }

  // ── Mutations ────────────────────────────────────────────────────────────

  const createMutation = useApiMutation(
    (values: any) => {
      const lines = (values.lines ?? []).map(transformLineForCreate)
      const received_date = values.received_date ? dayjs(values.received_date).format('YYYY-MM-DD') : undefined
      return api.post('/receipts', { ...values, received_date, lines })
    },
    {
      successMessage: 'Tạo Receipt thành công',
      invalidateKey: ['receipts'],
      onSuccess: (res: any) => navigate(`/receipts/${res.data.id}`),
    },
  )

  const updateMutation = useApiMutation(
    (values: any) => {
      const lines = (values.lines ?? []).map(transformLineForUpdate)
      const received_date = values.received_date ? dayjs(values.received_date).format('YYYY-MM-DD') : null
      return api.patch(`/receipts/${id}`, { note: values.note, received_date, lines })
    },
    {
      successMessage: 'Cập nhật thành công',
      invalidateKey: [['receipts', id!], ['receipts']],
      onSuccess: options?.onUpdateSuccess,
    },
  )

  const cancelMutation = useApiMutation(
    () => api.patch(`/receipts/${id}/cancel`),
    {
      successMessage: 'Đã huỷ phiếu',
      invalidateKey: [['receipts', id!], ['receipts']],
    },
  )

  const completeMutation = useApiMutation(
    (body: any) => api.patch(`/receipts/${id}/complete`, body),
    {
      successMessage: 'Complete thành công',
      invalidateKey: [['receipts', id!], ['receipts'], ['inventory']],
      onSuccess: () => setCompleteMode(false),
    },
  )

  function submitComplete() {
    const lines = (receipt?.lines ?? [])
      .filter((l: any) => l.product_type === 'storable')
      .map((l: any) => ({
        line_id: l.id,
        serials: (serialsRows[l.id] ?? []).filter((r) => r.serial_no.trim()),
      }))
    completeMutation.mutate({ lines })
  }

  return {
    id,
    form,
    mode,
    receipt,
    isLoading,
    navigate,
    // create-mode
    poId,
    setPoId,
    poIdFromQuery,
    variantSearch,
    setVariantSearch,
    variantOptions,
    confirmedPOs,
    // queries
    warehouses,
    importTypes,
    // complete-mode
    completeMode,
    setCompleteMode,
    serialsRows,
    setSerialsRows,
    submitComplete,
    // SN view
    serialsFor,
    setSerialsFor,
    serials,
    serialsLoading,
    // mutations
    createMutation,
    updateMutation,
    cancelMutation,
    completeMutation,
  }
}
