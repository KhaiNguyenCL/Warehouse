import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { message } from 'antd'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useEntityModal } from './useEntityModal'
import dayjs from 'dayjs'

export function useReceipts() {
  const [searchParams] = useSearchParams()
  const poIdFromQuery = searchParams.get('po_id') ?? undefined
  const { open, form, openCreate, close } = useEntityModal()
  const [poId, setPoId] = useState<string | undefined>(poIdFromQuery)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const goToDetailRef = useRef(false)

  function closeAll() {
    close()
    setPoId(undefined)
  }

  useEffect(() => {
    if (poIdFromQuery) {
      setPoId(poIdFromQuery)
      openCreate()
    }
  }, [poIdFromQuery])

  const { data, isLoading } = useQuery({
    queryKey: ['receipts'],
    queryFn: async () => (await api.get('/receipts')).data,
  })

  const { data: importTypes } = useQuery({
    queryKey: ['import-types'],
    queryFn: async () => (await api.get('/settings/import-types')).data,
  })

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => (await api.get('/warehouses')).data,
  })

  // PO Confirmed để chọn (nhận hàng theo PO) — chỉ cần khi import_type = purchase.
  const { data: confirmedPOs } = useQuery({
    queryKey: ['purchase-orders', 'confirmed'],
    queryFn: async () => (await api.get('/purchase-orders', { params: { status: 'confirmed', limit: 100 } })).data,
  })

  // Chi tiết PO đang chọn — lấy danh sách po_line + remaining_qty để tự điền dòng hàng.
  const { data: poDetail } = useQuery({
    queryKey: ['purchase-orders', poId],
    queryFn: async () => (await api.get(`/purchase-orders/${poId}`)).data,
    enabled: !!poId,
  })

  // Flat variant list để chọn SKU khi không có PO.
  const [variantSearch, setVariantSearch] = useState('')
  const { data: variantOptions } = useQuery({
    queryKey: ['variants-search', variantSearch],
    queryFn: async () => (await api.get('/products/variants', { params: { search: variantSearch || undefined, limit: 50 } })).data,
  })

  useEffect(() => {
    if (poDetail) {
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
            manufacturer_warranty_months: l.manufacturer_warranty_months,
            customer_warranty_months: l.customer_warranty_months,
          })),
      })
    }
  }, [poDetail])

  const createMutation = useMutation({
    mutationFn: (values: any) => {
      const lines = values.lines.map((l: any) => ({
        variant_id: l.variant_id,
        quantity: l.quantity,
        cost_price: l.cost_price,
        po_line_id: l.po_line_id,
        manufacturer_warranty_months: l.manufacturer_warranty_months,
        manufacturer_warranty_start: l.manufacturer_warranty_start
          ? (dayjs.isDayjs(l.manufacturer_warranty_start)
              ? l.manufacturer_warranty_start.toISOString()
              : dayjs(l.manufacturer_warranty_start).toISOString())
          : undefined,
        customer_warranty_months: l.customer_warranty_months,
      }))
      return api.post('/receipts', { ...values, lines })
    },
    onSuccess: (res: any) => {
      message.success('Tạo Receipt thành công')
      qc.invalidateQueries({ queryKey: ['receipts'] })
      if (goToDetailRef.current) {
        goToDetailRef.current = false
        navigate(`/receipts/${res.data.id}`)
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

  return {
    open, form, openCreate, closeAll,
    poId, setPoId, poIdFromQuery,
    navigate,
    data, isLoading,
    importTypes, warehouses, confirmedPOs,
    variantSearch, setVariantSearch, variantOptions,
    createMutation, createAndGoToDetail,
  }
}
