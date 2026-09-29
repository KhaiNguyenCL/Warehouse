import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { message } from 'antd'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

interface AttrValue {
  attribute_def_id: string
  name: string
  field_type: 'select' | 'text' | 'boolean' | 'date'
  unit: string | null
  options: string[]
  value: string | null
  include_in_sku: boolean
}

// variantId rỗng ("" hoặc undefined) = chế độ tạo mới (route /variants/create — xem
// VariantDetailPage.tsx, đã gộp chung với chế độ xem/sửa SKU đã tồn tại vào 1 trang duy nhất
// thay vì tách riêng VariantCreatePage, để không lặp lại layout/mutation logic).
export function useVariantDetail(productId: string, variantId?: string) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [attrValues, setAttrValues] = useState<AttrValue[]>([])

  const { data: product, isLoading } = useQuery({
    queryKey: ['products', productId],
    queryFn: async () => (await api.get(`/products/${productId}`)).data,
  })

  const variant = product?.variants?.find((v: any) => v.id === variantId)

  const { data: attrDefs } = useQuery<any[]>({
    queryKey: ['variant-attribute-defs'],
    queryFn: async () => (await api.get('/settings/variant-attribute-defs')).data,
  })

  function buildAttrValues(existingValues: any[] = []) {
    if (!attrDefs || !product) return
    const applicable = attrDefs.filter(
      (d: any) =>
        d.is_active &&
        (d.applies_to === 'all' || d.products.some((p: any) => p.product_id === productId)),
    )
    const existingMap = new Map(existingValues.map((v: any) => [v.attribute_def_id, v]))
    setAttrValues(
      applicable.map((d: any) => ({
        attribute_def_id: d.id,
        name: d.name,
        field_type: d.field_type ?? 'select',
        unit: d.unit,
        options: d.options,
        value: existingMap.get(d.id)?.value ?? null,
        include_in_sku: existingMap.get(d.id)?.include_in_sku ?? false,
      })),
    )
  }

  // Tạo SKU mới — attribute-values PUT cần variantId vừa tạo (chưa có tới lúc response về),
  // khác updateVariant/deleteVariant vốn đã biết sẵn variantId từ route.
  const createVariant = useMutation({
    mutationFn: async ({ values, attrs }: { values: any; attrs: AttrValue[] }) => {
      const res = await api.post(`/products/${productId}/variants`, values)
      const toSave = attrs.filter((a) => a.value)
      if (toSave.length) {
        await api.put(`/products/${productId}/variants/${res.data.id}/attribute-values`, toSave)
      }
      return res
    },
    onSuccess: (res) => {
      message.success('Tạo SKU thành công')
      qc.invalidateQueries({ queryKey: ['products', productId] })
      navigate(`/products/${productId}/variants/${res.data.id}`)
    },
    onError: (err: any) => message.error(err.response?.data?.error ?? 'Lỗi'),
  })

  const updateVariant = useMutation({
    mutationFn: async ({ values, attrs }: { values: any; attrs: AttrValue[] }) => {
      const res = await api.patch(`/products/${productId}/variants/${variantId}`, values)
      await api.put(`/products/${productId}/variants/${variantId}/attribute-values`, attrs.filter((a) => a.value))
      return res
    },
    onSuccess: () => {
      message.success('Cập nhật SKU thành công')
      qc.invalidateQueries({ queryKey: ['products', productId] })
    },
    onError: (err: any) => message.error(err.response?.data?.error ?? 'Lỗi'),
  })

  const deleteVariant = useMutation({
    mutationFn: () => api.delete(`/products/${productId}/variants/${variantId}`),
    onSuccess: () => {
      message.success('Đã xóa SKU')
      qc.invalidateQueries({ queryKey: ['products', productId] })
      navigate(`/products/${productId}`)
    },
    onError: (err: any) => message.error(err.response?.data?.error ?? 'Lỗi'),
  })

  return {
    product,
    variant,
    isLoading,
    attrDefs,
    attrValues,
    setAttrValues,
    buildAttrValues,
    createVariant,
    updateVariant,
    deleteVariant,
  }
}
