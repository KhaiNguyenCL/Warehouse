import { useState } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useDebounce } from './useDebounce'
import { message } from 'antd'
import { api } from '../lib/api'
import { useApiMutation } from './useApiMutation'
import { useEntityModal } from './useEntityModal'

export type CompanyTypeFilter = 'all' | 'customer' | 'supplier'

export function useCompanies() {
  const { open, editing, form, openCreate, openEdit, close } = useEntityModal()
  const qc = useQueryClient()

  // ── Filters ───────────────────────────────────────────
  const [typeFilter, setTypeFilter] = useState<CompanyTypeFilter>('all')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)

  // ── Data ──────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['companies', typeFilter, debouncedSearch],
    queryFn: async () => {
      const params: Record<string, any> = { limit: 100 }
      if (typeFilter !== 'all') params.type = typeFilter
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim()
      return (await api.get('/companies', { params })).data
    },
  })

  // ── Bitrix sync ────────────────────────────────────────
  const [syncOpen, setSyncOpen] = useState(false)
  const [syncPreview, setSyncPreview] = useState<any>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [selectedBxIds, setSelectedBxIds] = useState<string[]>([])

  async function openSync() {
    setPreviewLoading(true)
    setSyncPreview(null)
    setSelectedBxIds([])
    setSyncOpen(true)
    try {
      const res = await api.get('/bitrix/companies/sync-preview')
      setSyncPreview(res.data)
      const allIds = [
        ...(res.data.new_companies ?? []).map((c: any) => c.bitrix_id),
        ...(res.data.changed_companies ?? []).map((c: any) => c.bitrix_id),
      ]
      setSelectedBxIds(allIds)
    } catch (err: any) {
      message.error(err.response?.data?.error ?? 'Không lấy được dữ liệu từ Bitrix')
      setSyncOpen(false)
    } finally {
      setPreviewLoading(false)
    }
  }

  const syncMutation = useMutation({
    mutationFn: () => api.post('/bitrix/companies/sync-apply', { bitrix_ids: selectedBxIds }),
    onSuccess: (res) => {
      const { synced, errors } = res.data
      if (errors?.length) {
        message.warning(`Đồng bộ ${synced} công ty, ${errors.length} lỗi`)
      } else {
        message.success(`Đã đồng bộ ${synced} công ty`)
      }
      qc.invalidateQueries({ queryKey: ['companies'] })
      setSyncOpen(false)
    },
    onError: (err: any) => message.error(err.response?.data?.error ?? 'Đồng bộ thất bại'),
  })

  // ── Mutations ──────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (values: any) => api.post('/companies', values),
    onSuccess: () => {
      message.success('Tạo công ty thành công')
      qc.invalidateQueries({ queryKey: ['companies'] })
      close()
    },
    onError: (err: any) => message.error(err.response?.data?.error ?? 'Lỗi'),
  })

  const updateMutation = useApiMutation(
    (values: any) => api.patch(`/companies/${editing.id}`, values),
    {
      successMessage: 'Cập nhật thành công',
      invalidateKey: ['companies'],
      onSuccess: close,
    },
  )

  const deleteMutation = useApiMutation(
    (id: string) => api.delete(`/companies/${id}`),
    { successMessage: 'Đã xoá công ty', invalidateKey: ['companies'] },
  )

  return {
    // modal state
    open, editing, form, openCreate, openEdit, close,
    // list
    data, isLoading,
    // filters
    typeFilter, setTypeFilter,
    search, setSearch,
    // mutations
    createMutation, updateMutation, deleteMutation,
    // bitrix sync
    syncOpen, setSyncOpen,
    syncPreview, previewLoading,
    selectedBxIds, setSelectedBxIds,
    openSync, syncMutation,
  }
}
