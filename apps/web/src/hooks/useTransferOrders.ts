import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Form, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useEntityModal } from './useEntityModal'
import { useDebounce } from './useDebounce'

export function useTransferOrders() {
  const { open, form, openCreate, close } = useEntityModal()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const goToDetailRef = useRef(false)

  const [page, setPage] = useState(1)
  const [limit, _setLimit] = useState(50)
  const [_searchInput, _setSearchInput] = useState('')
  const [status, _setStatus] = useState<string | undefined>()
  const [sortBy, setSortBy] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null)
  const search = useDebounce(_searchInput)

  const searchInput = _searchInput
  function setSearchInput(v: string) { _setSearchInput(v); setPage(1) }
  function setStatus(v: string | undefined) { _setStatus(v); setPage(1) }
  function setLimit(v: number) { _setLimit(v); setPage(1) }
  function setSort(field: string | null, order: 'asc' | 'desc' | null) {
    setSortBy(field); setSortOrder(order); setPage(1)
  }

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['transfers', page, limit, search, status, sortBy, sortOrder],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const params: Record<string, any> = { page, limit }
      if (search.trim()) params.search = search.trim()
      if (status) params.status = status
      if (sortBy) { params.sort_by = sortBy; params.sort_order = sortOrder ?? 'asc' }
      return (await api.get('/transfers', { params })).data
    },
  })

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => (await api.get('/warehouses')).data,
  })

  const transferType: string | undefined = Form.useWatch('transfer_type', form)
  const needsFromWarehouse = transferType === 'transfer'

  const createMutation = useMutation({
    mutationFn: (values: any) => api.post('/transfers', values),
    onSuccess: (res: any) => {
      message.success('Tạo Transfer Order thành công')
      qc.invalidateQueries({ queryKey: ['transfers'] })
      if (goToDetailRef.current) {
        goToDetailRef.current = false
        navigate(`/transfers/${res.data.id}`)
      } else {
        close()
      }
    },
    onError: (err: any) => message.error(err.response?.data?.error ?? 'Lỗi'),
  })

  function createAndGoToDetail() {
    goToDetailRef.current = true
    form.submit()
  }

  function openCreateDefault() {
    const whs = warehouses as any[] | undefined
    const defaultWh = whs?.find((w) => w.is_default)?.id ?? whs?.[0]?.id
    openCreate(defaultWh ? { to_warehouse_id: defaultWh } : undefined)
  }

  return {
    open, form, openCreate: openCreateDefault, close,
    navigate,
    page, setPage,
    limit, setLimit,
    searchInput, setSearchInput, status, setStatus, sortBy, sortOrder, setSort,
    data, isLoading, isFetching,
    warehouses,
    transferType, needsFromWarehouse,
    createMutation, createAndGoToDetail,
  }
}
