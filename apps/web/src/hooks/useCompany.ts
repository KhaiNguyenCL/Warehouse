import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useApiMutation } from './useApiMutation'

const COMPARE_FIELDS = ['name', 'code', 'phone', 'email', 'tax_code', 'country',
  'address', 'bank_account', 'bank_name', 'note', 'bitrix_company_id'] as const

export function useCompany(id: string) {
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [editValues, setEditValues] = useState<Record<string, any>>({})

  const { data: company, isLoading } = useQuery({
    queryKey: ['companies', id],
    queryFn: async () => (await api.get(`/companies/${id}`)).data,
    enabled: !!id,
  })

  function startEdit() {
    setEditValues({ ...company })
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setEditValues({})
  }

  const isDirty = useMemo(() => {
    if (!editing || !company) return false
    for (const f of COMPARE_FIELDS) {
      if ((editValues[f] ?? '') !== (company[f] ?? '')) return true
    }
    const et = [...(editValues.types ?? [])].sort().join(',')
    const ct = [...(company.types ?? [])].sort().join(',')
    return et !== ct
  }, [editing, editValues, company])

  const PATCH_FIELDS = ['name', 'code', 'phone', 'email', 'tax_code', 'country',
    'address', 'bank_account', 'bank_name', 'note', 'bitrix_company_id', 'types', 'sync_locked'] as const

  const updateMutation = useApiMutation(
    (values: any) => {
      const payload = Object.fromEntries(PATCH_FIELDS.map((f) => [f, values[f]]))
      return api.patch(`/companies/${id}`, payload)
    },
    {
      successMessage: 'Cập nhật thành công',
      invalidateKey: ['companies', id],
      onSuccess: () => setEditing(false),
    },
  )

  const toggleLockMutation = useApiMutation(
    () => api.patch(`/companies/${id}`, { sync_locked: !company?.sync_locked }),
    {
      successMessage: company?.sync_locked ? 'Đã mở khoá sync' : 'Đã khoá khỏi sync Bitrix',
      invalidateKey: ['companies', id],
    },
  )

  const deleteMutation = useApiMutation(
    (_id: string) => api.delete(`/companies/${_id}`),
    {
      successMessage: 'Đã xoá công ty',
      invalidateKey: ['companies'],
      onSuccess: () => navigate('/companies'),
    },
  )

  const isSupplier = company?.types?.includes('supplier')
  const isCustomer = company?.types?.includes('customer')

  return {
    company, isLoading, isSupplier, isCustomer,
    editing, editValues, setEditValues, isDirty,
    startEdit, cancelEdit,
    updateMutation, toggleLockMutation, deleteMutation,
  }
}
