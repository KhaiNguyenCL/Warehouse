import { useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useDebounce } from './useDebounce'

export function useInventory() {
  const [searchInput, _setSearchInput] = useState('')
  const [snSearchInput, setSnSearchInput] = useState('')
  const [warehouseId, _setWarehouseId] = useState<string | undefined>()
  const [productType, _setProductType] = useState<string | undefined>()
  const [categoryId, _setCategoryId] = useState<string | undefined>()
  const [brandId, _setBrandId] = useState<string | undefined>()
  const [page, setPage] = useState(1)
  const [limit, _setLimit] = useState(50)

  const search = useDebounce(searchInput)
  const snSearch = useDebounce(snSearchInput)

  function setSearchInput(v: string) { _setSearchInput(v); setPage(1) }
  function setWarehouseId(v: string | undefined) { _setWarehouseId(v); setPage(1) }
  function setProductType(v: string | undefined) { _setProductType(v); setPage(1) }
  function setCategoryId(v: string | undefined) { _setCategoryId(v); setPage(1) }
  function setBrandId(v: string | undefined) { _setBrandId(v); setPage(1) }
  function setLimit(v: number) { _setLimit(v); setPage(1) }

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['inventory', 'by-variant', search, warehouseId, productType, categoryId, brandId, page, limit],
    placeholderData: keepPreviousData,
    queryFn: async () =>
      (await api.get('/inventory/by-variant', { params: { search: search || undefined, warehouse_id: warehouseId, product_type: productType, category_id: categoryId, brand_id: brandId, page, limit } })).data,
    refetchInterval: 5000,
  })

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => (await api.get('/warehouses')).data,
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await api.get('/products/categories')).data,
  })

  const { data: brands } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => (await api.get('/products/brands')).data,
  })

  return {
    searchInput, setSearchInput,
    snSearchInput, setSnSearchInput,
    snSearch,
    warehouseId, setWarehouseId,
    productType, setProductType,
    categoryId, setCategoryId,
    brandId, setBrandId,
    page, setPage,
    limit, setLimit,
    data, isLoading, isFetching,
    warehouses, categories, brands,
  }
}
