import { useEffect, useRef } from 'react'
import { Form, message } from 'antd'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

export function useTransferOrderCreate() {
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const goToDetailRef = useRef(false)

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => (await api.get('/warehouses')).data,
  })

  const transferType: string | undefined = Form.useWatch('transfer_type', form)
  const needsFromWarehouse = transferType === 'transfer'

  useEffect(() => {
    const whs = warehouses as any[] | undefined
    const defaultWh = whs?.find((w: any) => w.is_default)?.id ?? whs?.[0]?.id
    if (defaultWh) form.setFieldValue('to_warehouse_id', defaultWh)
  }, [warehouses])

  const createMutation = useMutation({
    mutationFn: (values: any) => api.post('/transfers', values),
    onSuccess: (res: any) => {
      message.success('Tạo phiếu chuyển thành công')
      qc.invalidateQueries({ queryKey: ['transfers'] })
      navigate(goToDetailRef.current ? `/transfers/${res.data.id}` : '/transfers')
      goToDetailRef.current = false
    },
    onError: (err: any) => message.error(err.response?.data?.error ?? 'Lỗi'),
  })

  function submit() { form.submit() }
  function submitAndComplete() { goToDetailRef.current = true; form.submit() }

  return { form, navigate, warehouses, transferType, needsFromWarehouse, createMutation, submit, submitAndComplete }
}
