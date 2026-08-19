import { useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useApiMutation } from './useApiMutation'
import { useEntityModal } from './useEntityModal'
import { useDebounce } from './useDebounce'

export function useProducts() {
  const { open, form, openCreate, close } = useEntityModal()
  const [modelCode, setModelCode] = useState('')
  const navigate = useNavigate()

  const [page, setPage] = useState(1)
  const [limit, _setLimit] = useState(50)
  const [_searchInput, _setSearchInput] = useState('')
  const [categoryId, _setCategoryId] = useState<string | undefined>()
  const [brandId, _setBrandId] = useState<string | undefined>()
  const [productType, _setProductType] = useState<string | undefined>()
  const [sortBy, setSortBy] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null)
  const search = useDebounce(_searchInput)

  const searchInput = _searchInput
  function setSearchInput(v: string) { _setSearchInput(v); setPage(1) }
  function setLimit(v: number) { _setLimit(v); setPage(1) }
  function setCategoryId(v: string | undefined) { _setCategoryId(v); setPage(1) }
  function setBrandId(v: string | undefined) { _setBrandId(v); setPage(1) }
  function setProductType(v: string | undefined) { _setProductType(v); setPage(1) }
  function setSort(field: string | null, order: 'asc' | 'desc' | null) {
    setSortBy(field); setSortOrder(order); setPage(1)
  }

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['products', page, limit, search, categoryId, brandId, productType, sortBy, sortOrder],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const params: Record<string, any> = { page, limit }
      if (search.trim()) params.search = search.trim()
      if (categoryId) params.category_id = categoryId
      if (brandId) params.brand_id = brandId
      if (productType) params.product_type = productType
      if (sortBy) { params.sort_by = sortBy; params.sort_order = sortOrder ?? 'asc' }
      return (await api.get('/products', { params })).data
    },
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await api.get('/products/categories')).data,
  })

  const { data: brands } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => (await api.get('/products/brands')).data,
  })

  const deleteMutation = useApiMutation((id: string) => api.delete(`/products/${id}`), {
    successMessage: 'Đã xóa sản phẩm',
    invalidateKey: ['products'],
  })

  const createMutation = useApiMutation(
    async (values: any) => {
      const { sku, variant_name, unit, sale_price, ...productData } = values
      const res = await api.post('/products', productData)
      const productId = res.data?.id
      if (productId && productData.product_type === 'service' && sku) {
        await api.post(`/products/${productId}/variants`, {
          item_code: sku,
          name: variant_name,
          unit: unit ?? 'Lần',
          sale_price: sale_price ?? null,
          currency: 'VND',
        })
      }
      return res
    },
    {
      successMessage: 'Tạo sản phẩm thành công',
      invalidateKey: ['products'],
      onSuccess: () => {
        close()
        setModelCode('')
      },
    },
  )

  function suggestCode(overrideModelCode?: string) {
    const categoryId = form.getFieldValue('category_id')
    const brandId = form.getFieldValue('brand_id')
    const category = categories?.find((c: any) => c.id === categoryId)
    const brand = brands?.find((b: any) => b.id === brandId)
    const model = overrideModelCode ?? modelCode
    if (category?.short_code && brand?.short_code) {
      const base = `${category.short_code}-${brand.short_code}`
      form.setFieldValue('code', model ? `${base}-${model}` : base)
    }
  }

  function closeAndResetModel() {
    close()
    setModelCode('')
  }

  return {
    open, form, openCreate,
    modelCode, setModelCode,
    navigate,
    page, setPage,
    limit, setLimit,
    searchInput, setSearchInput,
    categoryId, setCategoryId,
    brandId, setBrandId,
    productType, setProductType,
    sortBy, sortOrder, setSort,
    data, isLoading, isFetching,
    categories, brands,
    deleteMutation, createMutation,
    suggestCode, closeAndResetModel,
  }
}
