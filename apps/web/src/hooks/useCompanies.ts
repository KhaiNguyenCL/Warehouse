import { useState } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { message } from 'antd'
import { api } from '../lib/api'
import { useApiMutation } from './useApiMutation'
import { useEntityModal } from './useEntityModal'

export function useCompanies() {
  const { open, editing, form, openCreate, openEdit, close } = useEntityModal()
  const qc = useQueryClient()
  const [importOpen, setImportOpen] = useState(false)
  const [bitrixCompanyId, setBitrixCompanyId] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => (await api.get('/companies')).data,
  })

  const createMutation = useApiMutation((values: any) => api.post('/companies', values), {
    successMessage: 'Tạo company thành công',
    invalidateKey: ['companies'],
    onSuccess: close,
  })

  const updateMutation = useApiMutation((values: any) => api.patch(`/companies/${editing.id}`, values), {
    successMessage: 'Cập nhật thành công',
    invalidateKey: ['companies'],
    onSuccess: close,
  })

  // CLAUDE.md mục 12: fetch Company từ Bitrix (chỉ đọc), idempotent theo bitrix_company_id
  // — import lại nhiều lần chỉ update, không tạo trùng.
  const importMutation = useMutation({
    mutationFn: () => api.post(`/bitrix/companies/${bitrixCompanyId}/import`),
    onSuccess: () => {
      message.success('Import company từ Bitrix thành công')
      qc.invalidateQueries({ queryKey: ['companies'] })
      setImportOpen(false)
      setBitrixCompanyId('')
    },
    onError: (err: any) => message.error(err.response?.data?.error ?? 'Import thất bại'),
  })

  const deleteMutation = useApiMutation((id: string) => api.delete(`/companies/${id}`), {
    successMessage: 'Đã xoá công ty',
    invalidateKey: ['companies'],
  })

  return {
    open, editing, form, openCreate, openEdit, close,
    data, isLoading,
    createMutation, updateMutation, deleteMutation, importMutation,
    importOpen, setImportOpen,
    bitrixCompanyId, setBitrixCompanyId,
  }
}
