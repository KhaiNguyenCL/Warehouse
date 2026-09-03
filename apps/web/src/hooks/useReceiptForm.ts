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
  const shipmentIdFromQuery = searchParams.get('shipment_id') ?? undefined
  const [form] = Form.useForm()
  const navigate = useNavigate()

  // create-mode: PO selector state
  const [poId, setPoId] = useState<string | undefined>(poIdFromQuery)

  // create-mode: Shipment selector state — có thể tới từ query (?shipment_id=, khi bấm
  // "Tạo phiếu nhập kho" trên Shipment) HOẶC tự chọn tay ngay trong form khi Loại nhập =
  // "purchase" (xem Row 2 ở ReceiptFormPage.tsx).
  const [shipmentId, setShipmentId] = useState<string | undefined>(shipmentIdFromQuery)

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

  const { data: poDetail } = useQuery({
    queryKey: ['purchase-orders', poId],
    queryFn: async () => (await api.get(`/purchase-orders/${poId}`)).data,
    enabled: !!poId,
  })

  const { data: shipmentDetail } = useQuery({
    queryKey: ['shipments', shipmentId],
    queryFn: async () => (await api.get(`/shipments/${shipmentId}`)).data,
    enabled: !!shipmentId && !id,
  })

  // Danh sách Phiếu nhận hàng đã "Đã nhận hàng" — cho phép chọn tay khi tạo Receipt trực
  // tiếp với Loại nhập = "purchase" (không bắt buộc phải đi từ nút trên trang Shipment).
  const { data: receivedShipments } = useQuery({
    queryKey: ['shipments', 'received-list'],
    queryFn: async () => (await api.get('/shipments', { params: { status: 'received', limit: 100 } })).data,
    enabled: !id,
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
        manufacturer_warranty_months: l.manufacturer_warranty_months ?? undefined,
        manufacturer_warranty_start: l.manufacturer_warranty_start ? dayjs(l.manufacturer_warranty_start) : undefined,
        customer_warranty_months: l.customer_warranty_months ?? undefined,
      })),
    })
  }, [receipt])

  // When PO detail loads → auto-fill lines in create mode
  // Guard: skip if viewing existing receipt (id is set) — component stays mounted when
  // navigating from /receipts/new?po_id=X to /receipts/:id, so poId state is stale.
  // Also skip when creating from a Shipment (shipmentId) — that flow fills lines
  // from the shipment's actual received qty/condition instead, see effect below.
  useEffect(() => {
    if (!poDetail || id || shipmentId) return
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
          manufacturer_warranty_months: l.manufacturer_warranty_months ?? undefined,
          customer_warranty_months: l.customer_warranty_months ?? undefined,
        })),
    })
  }, [poDetail])

  // Chọn 1 Phiếu nhận hàng (?shipment_id=X hoặc tự chọn tay ở Row 2) → auto-fill PO, NCC,
  // ghi chú và các dòng hàng theo đúng số lượng/tình trạng đã xác nhận thực nhận (không
  // dùng remaining_qty của PO vì có thể hàng về thiếu/hỏng khác với PO gốc).
  useEffect(() => {
    if (!shipmentDetail || id) return
    form.setFieldsValue({
      import_type: 'purchase',
      shipment_id: shipmentDetail.id,
      po_id: shipmentDetail.po_id ?? undefined,
      company_id: shipmentDetail.supplier_id ?? undefined,
      warehouse_id: shipmentDetail.warehouse_id,
      note: shipmentDetail.notes ?? undefined,
      lines: (shipmentDetail.lines ?? [])
        .filter((l: any) => l.condition !== 'missing')
        .map((l: any) => ({
          variant_id: l.variant_id,
          variant_label: `${l.item_code} — ${l.variant_name}`,
          po_line_id: l.po_line_id ?? undefined,
          quantity: l.qty_received || l.qty_expected,
        })),
    })
    if (shipmentDetail.po_id) setPoId(shipmentDetail.po_id)
  }, [shipmentDetail])

  // When poId cleared → reset po-related fields
  useEffect(() => {
    if (!poId) {
      form.setFieldsValue({ po_id: undefined, company_id: undefined })
    }
  }, [poId])

  // When shipmentId cleared (user bỏ chọn Phiếu nhận hàng, hoặc đổi Loại nhập khỏi
  // "purchase") → reset toàn bộ field liên quan, kể cả dòng hàng, về trạng thái trống.
  useEffect(() => {
    if (!shipmentId) {
      setPoId(undefined)
      form.setFieldsValue({ shipment_id: undefined, po_id: undefined, company_id: undefined, lines: [{}] })
    }
  }, [shipmentId])

  // ── Derived mode ─────────────────────────────────────────────────────────

  const mode: ReceiptFormMode = !id ? 'create' : receipt?.status === 'draft' ? 'edit' : 'view'

  // ── Line transform helper (shared between create & update) ───────────────

  function transformLineForCreate(l: any) {
    return {
      variant_id: l.variant_id,
      quantity: l.quantity,
      cost_price: l.cost_price,
      po_line_id: l.po_line_id,
      manufacturer_warranty_months: l.manufacturer_warranty_months ?? undefined,
      manufacturer_warranty_start: l.manufacturer_warranty_start
        ? dayjs.isDayjs(l.manufacturer_warranty_start)
          ? l.manufacturer_warranty_start.toISOString()
          : dayjs(l.manufacturer_warranty_start).toISOString()
        : undefined,
      customer_warranty_months: l.customer_warranty_months ?? undefined,
    }
  }

  function transformLineForUpdate(l: any) {
    return {
      id: l.id,
      cost_price: l.cost_price,
      manufacturer_warranty_months: l.manufacturer_warranty_months ?? null,
      manufacturer_warranty_start: l.manufacturer_warranty_start != null
        ? dayjs.isDayjs(l.manufacturer_warranty_start)
          ? l.manufacturer_warranty_start.toISOString()
          : dayjs(l.manufacturer_warranty_start).toISOString()
        : null,
      customer_warranty_months: l.customer_warranty_months ?? null,
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
    (body?: { reason?: string; attachments?: Array<{ url: string; originalName: string }> }) =>
      api.patch(`/receipts/${id}/cancel`, body ?? {}),
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
        serials: (serialsRows[l.id] ?? []).filter((r) => r.serial_no.trim() || r.mac_address.trim()),
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
    shipmentId,
    setShipmentId,
    shipmentIdFromQuery,
    shipmentDetail,
    receivedShipments,
    poDetail,
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
