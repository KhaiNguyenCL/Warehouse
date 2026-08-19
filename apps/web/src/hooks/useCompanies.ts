import { useState } from 'react'
import { useQuery, useQueryClient, useMutation, keepPreviousData } from '@tanstack/react-query'
import { useDebounce } from './useDebounce'
import { message } from 'antd'
import { api } from '../lib/api'
import { useApiMutation } from './useApiMutation'
import { useEntityModal } from './useEntityModal'

async function saveCustomFieldValues(objectId: string, custom: Record<string, any>) {
  const values = Object.entries(custom)
    .filter(([, v]) => v != null && v !== '')
    .map(([field_id, value]) => ({ field_id, value: String(value) }))
  if (values.length > 0) {
    await api.put('/custom-fields/values', { values }, { params: { object_type: 'company', object_id: objectId } })
  }
}

export type CompanyTypeFilter = 'all' | 'customer' | 'supplier'

export function useCompanies() {
  const { open, editing, form, openCreate, openEdit, close } = useEntityModal()
  const qc = useQueryClient()

  const { data: customFieldDefs = [] } = useQuery<any[]>({
    queryKey: ['custom-fields', 'company'],
    queryFn: async () => (await api.get('/custom-fields', { params: { object_type: 'company' } })).data,
    staleTime: 60_000,
  })

  // ── Filters & sort ────────────────────────────────────
  const [_typeFilter, _setTypeFilter] = useState<CompanyTypeFilter>('all')
  const [_search, _setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit, _setLimit] = useState(50)
  const [sortBy, setSortBy] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null)
  const debouncedSearch = useDebounce(_search)

  const typeFilter = _typeFilter
  function setTypeFilter(v: CompanyTypeFilter) { _setTypeFilter(v); setPage(1) }
  const search = _search
  function setSearch(v: string) { _setSearch(v); setPage(1) }
  function setLimit(v: number) { _setLimit(v); setPage(1) }
  function setSort(field: string | null, order: 'asc' | 'desc' | null) {
    setSortBy(field); setSortOrder(order); setPage(1)
  }

  // ── Data ──────────────────────────────────────────────
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['companies', typeFilter, debouncedSearch, page, limit, sortBy, sortOrder],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const params: Record<string, any> = { page, limit }
      if (typeFilter !== 'all') params.type = typeFilter
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim()
      if (sortBy) { params.sort_by = sortBy; params.sort_order = sortOrder ?? 'asc' }
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
    mutationFn: async (allValues: any) => {
      const { custom, ...companyData } = allValues
      const company = (await api.post('/companies', companyData)).data
      if (custom) await saveCustomFieldValues(company.id, custom)
      return company
    },
    onSuccess: () => {
      message.success('Tạo công ty thành công')
      qc.invalidateQueries({ queryKey: ['companies'] })
      close()
    },
    onError: (err: any) => message.error(err.response?.data?.error ?? 'Lỗi'),
  })

  const updateMutation = useMutation({
    mutationFn: async (allValues: any) => {
      const { custom, ...companyData } = allValues
      const company = (await api.patch(`/companies/${editing.id}`, companyData)).data
      if (custom) await saveCustomFieldValues(editing.id, custom)
      return company
    },
    onSuccess: () => {
      message.success('Cập nhật thành công')
      qc.invalidateQueries({ queryKey: ['companies'] })
      close()
    },
    onError: (err: any) => message.error(err.response?.data?.error ?? 'Lỗi'),
  })

  const deleteMutation = useApiMutation(
    (id: string) => api.delete(`/companies/${id}`),
    { successMessage: 'Đã xoá công ty', invalidateKey: ['companies'] },
  )

  return {
    // modal state
    open, editing, form, openCreate, openEdit, close,
    // list
    data, isLoading, isFetching,
    page, setPage,
    limit, setLimit,
    // filters & sort
    typeFilter, setTypeFilter,
    search, setSearch,
    sortBy, sortOrder, setSort,
    // mutations
    createMutation, updateMutation, deleteMutation,
    // bitrix sync
    syncOpen, setSyncOpen,
    syncPreview, previewLoading,
    selectedBxIds, setSelectedBxIds,
    openSync, syncMutation,
    // custom fields
    customFieldDefs,
  }
}
