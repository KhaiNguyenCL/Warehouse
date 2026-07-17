import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useApiMutation } from './useApiMutation'
import { useEntityModal } from './useEntityModal'

export function useProducts() {
  const { open, form, openCreate, close } = useEntityModal()
  const [modelCode, setModelCode] = useState('')
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => (await api.get('/products')).data,
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

  // Gợi ý mã sản phẩm = category.short_code + brand.short_code + mã dòng sản phẩm (tự nhập) —
  // mã dòng sản phẩm dùng để phân biệt các dòng SP khác nhau của cùng category+brand (VD: Cisco
  // có nhiều dòng switch SG110/SG350 — chỉ category+brand sẽ bị trùng mã, cần thêm phần này).
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
    data, isLoading,
    categories, brands,
    deleteMutation, createMutation,
    suggestCode, closeAndResetModel,
  }
}
