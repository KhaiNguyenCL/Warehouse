import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Form, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { api } from '../lib/api'
import { useApiMutation } from './useApiMutation'

export function usePurchaseOrderCreate() {
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [dealResolving, setDealResolving] = useState(false)
  const [resolvedCompany, setResolvedCompany] = useState<{ id: string; name: string } | null>(null)

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

  return {
    form,
    companyOptions,
    companyId,
    companyDetail,
    dealResolving,
    resolveDeal,
    createMutation,
    navigate,
  }
}
