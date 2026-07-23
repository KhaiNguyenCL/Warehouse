import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Form, message } from 'antd'
import dayjs from 'dayjs'
import { api } from '../lib/api'
import { useApiMutation } from './useApiMutation'

export type POFormMode = 'create' | 'edit' | 'view'

export function usePurchaseOrderForm(options?: { onUpdateSuccess?: () => void }) {
  const { id } = useParams<{ id?: string }>()
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [dealResolving, setDealResolving] = useState(false)
  const [resolvedCompany, setResolvedCompany] = useState<{ id: string; name: string } | null>(null)

  const { data: po, isLoading } = useQuery({
    queryKey: ['purchase-orders', id],
    queryFn: async () => (await api.get(`/purchase-orders/${id}`)).data,
    enabled: !!id,
  })

  useEffect(() => {
    if (!po) return
    if (po.company_id && po.company_name) {
      setResolvedCompany({ id: po.company_id, name: po.company_name })
    }
    form.setFieldsValue({
      bitrix_deal_id:   po.bitrix_deal_id,
      bitrix_deal_url:  po.bitrix_deal_url,
      deal_title:       po.deal_title,
      contract_number:  po.contract_number,
      region:           po.region,
      delivery_location: po.delivery_location,
      start_date:  po.start_date  ? dayjs(po.start_date)  : undefined,
      end_date:    po.end_date    ? dayjs(po.end_date)    : undefined,
      company_id:  po.company_id,
      contact_id:  po.contact_id,
      note:        po.note,
      lines: (po.lines ?? []).map((l: any) => ({
        variant_id:                   l.variant_id,
        quantity:                     l.quantity,
        unit_price:                   l.unit_price,
        vat_percent:                  l.vat_percent ?? undefined,
        manufacturer_warranty_months: l.manufacturer_warranty_months ?? undefined,
        customer_warranty_months:     l.customer_warranty_months ?? undefined,
        note:                         l.note,
        custom_field_values:          l.custom_field_values,
      })),
    })
  }, [po])

  const mode: POFormMode = !id ? 'create' : po?.status === 'draft' ? 'edit' : 'view'

  const { data: companies } = useQuery({
    queryKey: ['companies', 'all'],
    queryFn: async () => (await api.get('/companies', { params: { type: 'supplier', limit: 100 } })).data,
  })

  const companyId: string | undefined = Form.useWatch('company_id', form)
  const { data: companyDetail } = useQuery({
    queryKey: ['companies', companyId],
    queryFn: async () => (await api.get(`/companies/${companyId}`)).data,
    enabled: !!companyId,
  })

  const companyOptions = (() => {
    const list = companies?.data?.map((c: any) => ({ value: c.id, label: c.name })) ?? []
    if (resolvedCompany && !list.some((o: any) => o.value === resolvedCompany.id)) {
      return [{ value: resolvedCompany.id, label: resolvedCompany.name }, ...list]
    }
    return list
  })()

  async function resolveDeal() {
    const dealId = form.getFieldValue('bitrix_deal_id')?.trim()
    if (!dealId) return
    setDealResolving(true)
    try {
      const { data: resolved } = await api.get(`/bitrix/deals/${dealId}/resolve`)
      const updates: Record<string, any> = {}
      const notes: string[] = []

      if (resolved.company) {
        notes.push(`NCC: ${resolved.company.name}`)
        setResolvedCompany(resolved.company)
        try {
          const { data: companyData } = await api.get(`/companies/${resolved.company.id}`)
          queryClient.setQueryData(['companies', resolved.company.id], companyData)
        } catch { /* không block */ }

        updates.company_id        = resolved.company.id
        updates.contact_id        = resolved.contact?.id ?? undefined
        updates.deal_title        = resolved.deal_title ?? undefined
        updates.deal_amount       = resolved.deal_amount ?? undefined
        updates.bitrix_deal_url   = resolved.deal_url ?? undefined
        updates.contract_number   = resolved.contract_number ?? undefined
        updates.region            = resolved.region ?? undefined
        updates.delivery_location = resolved.delivery_location ?? undefined
        updates.start_date        = resolved.start_date ? dayjs(resolved.start_date) : undefined
        updates.end_date          = resolved.end_date ? dayjs(resolved.end_date) : undefined
        if (resolved.contact) notes.push(`Người liên hệ: ${resolved.contact.full_name}`)
      } else if (resolved.bitrix_company_id) {
        notes.push('NCC chưa được import vào WMS — vào trang Companies để import trước')
      }

      if (Object.keys(updates).length) {
        form.setFieldsValue(updates)
        message.success(notes.join(' · '))
      } else {
        message.warning(
          resolved.bitrix_company_id
            ? 'NCC từ deal này chưa được import vào WMS'
            : 'Deal không có thông tin công ty',
        )
      }
    } catch {
      message.error('Không thể fetch deal từ Bitrix')
    } finally {
      setDealResolving(false)
    }
  }

  const createMutation = useApiMutation(
    (values: any) => api.post('/purchase-orders', values),
    {
      successMessage: 'Tạo phiếu mua hàng thành công',
      invalidateKey: ['purchase-orders'],
      onSuccess: (res: any) => navigate(`/purchase-orders/${res.data.id}`),
    },
  )

  const updateMutation = useApiMutation(
    (values: any) => api.patch(`/purchase-orders/${id}`, values),
    {
      successMessage: 'Cập nhật thành công',
      invalidateKey: [['purchase-orders', id!], ['purchase-orders']],
      onSuccess: options?.onUpdateSuccess,
    },
  )

  const actionOpts = {
    successMessage: 'Thành công',
    invalidateKey: [['purchase-orders', id!], ['purchase-orders']],
  }
  const confirmMutation   = useApiMutation(() => api.patch(`/purchase-orders/${id}/confirm`),   actionOpts)
  const unconfirmMutation = useApiMutation(() => api.patch(`/purchase-orders/${id}/unconfirm`), actionOpts)
  const cancelMutation    = useApiMutation(() => api.patch(`/purchase-orders/${id}/cancel`),    actionOpts)
  const deleteMutation    = useApiMutation(() => api.delete(`/purchase-orders/${id}`), {
    successMessage: 'Đã xoá phiếu mua hàng',
    invalidateKey: ['purchase-orders'],
    onSuccess: () => navigate('/purchase-orders'),
  })

  return {
    id, form, mode, po, isLoading,
    companyOptions, companyId, companyDetail,
    dealResolving, resolveDeal, navigate,
    createMutation, updateMutation,
    confirmMutation, unconfirmMutation, cancelMutation, deleteMutation,
  }
}
