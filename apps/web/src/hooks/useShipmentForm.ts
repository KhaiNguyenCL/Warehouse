import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Form } from 'antd'
import dayjs from 'dayjs'
import { api } from '../lib/api'
import { useApiMutation } from './useApiMutation'

export type ShipmentFormMode = 'create' | 'edit' | 'view'

export interface ReceiveLineDraft {
  qty_received: number
  condition: 'good' | 'damaged' | 'missing'
  notes: string
}

export function useShipmentForm() {
  const { id } = useParams<{ id?: string }>()
  const [searchParams] = useSearchParams()
  const poIdFromQuery = searchParams.get('po_id') ?? undefined
  const [form] = Form.useForm()
  const navigate = useNavigate()

  // create-mode: PO selector state
  const [poId, setPoId] = useState<string | undefined>(poIdFromQuery)

  // variant search (no-PO create mode)
  const [variantSearch, setVariantSearch] = useState('')

  // receive-mode: inline qty/condition entry per line
  const [receiveMode, setReceiveMode] = useState(false)
  const [receiveLines, setReceiveLines] = useState<Record<string, ReceiveLineDraft>>({})

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: shipment, isLoading } = useQuery({
    queryKey: ['shipments', id],
    queryFn: async () => (await api.get(`/shipments/${id}`)).data,
    enabled: !!id,
  })

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => (await api.get('/warehouses')).data,
  })

  const { data: suppliersData } = useQuery({
    queryKey: ['companies', 'supplier', 100],
    queryFn: async () => (await api.get('/companies', { params: { type: 'supplier', limit: 100 } })).data,
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

  // ── Effects ──────────────────────────────────────────────────────────────

  // When shipment loads → populate form for edit mode
  useEffect(() => {
    if (!shipment) return
    form.setFieldsValue({
      supplier_id: shipment.supplier_id,
      warehouse_id: shipment.warehouse_id,
      expected_date: shipment.expected_date ? dayjs(shipment.expected_date) : undefined,
      notes: shipment.notes,
    })
  }, [shipment])

  // When PO detail loads → auto-fill lines in create mode
  useEffect(() => {
    if (!poDetail || id) return
    form.setFieldsValue({
      po_id: poDetail.id,
      supplier_id: poDetail.company_id,
      lines: poDetail.lines
        .filter((l: any) => l.remaining_qty > 0)
        .map((l: any) => ({
          variant_id: l.variant_id,
          variant_label: `${l.variant_sku} — ${l.variant_name}`,
          po_line_id: l.id,
          qty_expected: l.remaining_qty,
        })),
    })
  }, [poDetail])

  // When poId cleared → reset po-related fields
  useEffect(() => {
    if (!poId) {
      form.setFieldsValue({ po_id: undefined, supplier_id: undefined, lines: [{}] })
    }
  }, [poId])

  // ── Derived mode ─────────────────────────────────────────────────────────

  const mode: ShipmentFormMode = !id ? 'create' : shipment?.status === 'draft' ? 'edit' : 'view'

  // ── Mutations ────────────────────────────────────────────────────────────

  const createMutation = useApiMutation(
    (values: any) => {
      const lines = (values.lines ?? []).map((l: any) => ({
        variant_id: l.variant_id,
        po_line_id: l.po_line_id,
        qty_expected: l.qty_expected,
      }))
      const expected_date = values.expected_date ? dayjs(values.expected_date).toISOString() : undefined
      return api.post('/shipments', { ...values, expected_date, lines })
    },
    {
      successMessage: 'Tạo phiếu nhận hàng thành công',
      invalidateKey: ['shipments'],
      onSuccess: (res: any) => navigate(`/shipments/${res.data.id}`),
    },
  )

  const updateMutation = useApiMutation(
    (values: any) => {
      const expected_date = values.expected_date ? dayjs(values.expected_date).toISOString() : null
      return api.patch(`/shipments/${id}`, {
        supplier_id: values.supplier_id,
        warehouse_id: values.warehouse_id,
        expected_date,
        notes: values.notes,
      })
    },
    { successMessage: 'Cập nhật thành công', invalidateKey: [['shipments', id!], ['shipments']] },
  )

  const receiveMutation = useApiMutation(
    (body: { lines: Array<{ line_id: string; qty_received: number; condition: string; notes?: string }> }) =>
      api.patch(`/shipments/${id}/receive`, body),
    {
      successMessage: 'Đã xác nhận nhận hàng',
      invalidateKey: [['shipments', id!], ['shipments']],
      onSuccess: () => setReceiveMode(false),
    },
  )

  const cancelMutation = useApiMutation(
    () => api.patch(`/shipments/${id}/cancel`),
    { successMessage: 'Đã huỷ phiếu', invalidateKey: [['shipments', id!], ['shipments']] },
  )

  function startReceive() {
    const initial: Record<string, ReceiveLineDraft> = {}
    for (const l of shipment?.lines ?? []) {
      initial[l.id] = {
        qty_received: l.qty_received || l.qty_expected,
        condition: l.condition ?? 'good',
        notes: l.notes ?? '',
      }
    }
    setReceiveLines(initial)
    setReceiveMode(true)
  }

  function submitReceive() {
    const lines = (shipment?.lines ?? []).map((l: any) => ({
      line_id: l.id,
      qty_received: receiveLines[l.id]?.qty_received ?? l.qty_expected,
      condition: receiveLines[l.id]?.condition ?? 'good',
      notes: receiveLines[l.id]?.notes || undefined,
    }))
    receiveMutation.mutate({ lines })
  }

  return {
    id,
    form,
    mode,
    shipment,
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
    suppliers: suppliersData?.data ?? [],
    // receive-mode
    receiveMode,
    setReceiveMode,
    startReceive,
    receiveLines,
    setReceiveLines,
    submitReceive,
    // mutations
    createMutation,
    updateMutation,
    receiveMutation,
    cancelMutation,
  }
}
