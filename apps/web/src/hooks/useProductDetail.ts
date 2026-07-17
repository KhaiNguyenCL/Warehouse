import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useApiMutation } from './useApiMutation'
import { useEntityModal } from './useEntityModal'

interface AttrValue {
  attribute_def_id: string
  name: string
  field_type: 'select' | 'text' | 'boolean' | 'date'
  unit: string | null
  options: string[]
  value: string | null
  include_in_sku: boolean
}

export function useProductDetail(id: string) {
  const variantModal = useEntityModal()
  const productModal = useEntityModal()
  const [attrValues, setAttrValues] = useState<AttrValue[]>([])

  const { data, isLoading } = useQuery({
    queryKey: ['products', id],
    queryFn: async () => (await api.get(`/products/${id}`)).data,
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await api.get('/products/categories')).data,
  })

  const { data: brands } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => (await api.get('/products/brands')).data,
  })

  const { data: attrDefs } = useQuery<any[]>({
    queryKey: ['variant-attribute-defs'],
    queryFn: async () => (await api.get('/settings/variant-attribute-defs')).data,
  })

  const createVariant = useApiMutation(
    async (values: any) => {
      const res = await api.post(`/products/${id}/variants`, values)
      const variantId = res.data.id
      const toSave = attrValues.filter((a) => a.value)
      if (toSave.length) {
        await api.put(`/products/${id}/variants/${variantId}/attribute-values`, toSave)
      }
      return res
    },
    { successMessage: 'Tạo SKU thành công', invalidateKey: ['products', id], onSuccess: variantModal.close },
  )

  const updateVariant = useApiMutation(
    async (values: any) => {
      const res = await api.patch(`/products/${id}/variants/${variantModal.editing.id}`, values)
      await api.put(`/products/${id}/variants/${variantModal.editing.id}/attribute-values`, attrValues.filter((a) => a.value))
      return res
    },
    { successMessage: 'Cập nhật SKU thành công', invalidateKey: ['products', id], onSuccess: variantModal.close },
  )

  const deleteVariantMutation = useApiMutation(
    (variantId: string) => api.delete(`/products/${id}/variants/${variantId}`),
    {
      successMessage: 'Đã xóa SKU',
      invalidateKey: ['products', id],
      onSuccess: variantModal.close,
    },
  )

  const updateProduct = useApiMutation((values: any) => api.patch(`/products/${id}`, values), {
    successMessage: 'Cập nhật sản phẩm thành công',
    invalidateKey: ['products', id],
    onSuccess: productModal.close,
  })

  function buildAttrValuesForModal(existingValues: any[] = []) {
    if (!attrDefs || !data) return
    const applicable = attrDefs.filter(
      (d: any) =>
        d.is_active &&
        (d.applies_to === 'all' || d.products.some((p: any) => p.product_id === id)),
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

  function generateSkuSuffix(attrs: AttrValue[]) {
    return attrs
      .filter((a) => a.include_in_sku && a.value)
      .map((a) => {
        const display = a.field_type === 'boolean' ? (a.value === 'true' ? 'Có' : 'Không') : a.value!
        return `${display}${a.unit ? ' ' + a.unit : ''}`
      })
      .join(' ')
  }

  function submitVariant(values: any) {
    if (variantModal.editing) updateVariant.mutate(values)
    else createVariant.mutate(values)
  }

  function openEditVariant(variant: any) {
    buildAttrValuesForModal(variant.attribute_values ?? [])
    variantModal.openEdit(variant)
  }

  function openCreateVariant() {
    buildAttrValuesForModal([])
    const ref = data?.variants?.[0]
    variantModal.openCreate({
      item_code:        data?.code ?? '',
      name:             data?.name ?? '',
      unit:             ref?.unit ?? 'Cái',
      currency:         ref?.currency ?? 'VND',
      cost_price:       ref?.cost_price ?? undefined,
      sale_price:       ref?.sale_price ?? undefined,
      warranty_months:  ref?.warranty_months ?? undefined,
      weight_kg:        ref?.weight_kg ?? undefined,
      reorder_point:    ref?.reorder_point ?? 0,
    })
  }

  return {
    variantModal, productModal,
    attrValues, setAttrValues,
    data, isLoading,
    categories, brands, attrDefs,
    createVariant, updateVariant, deleteVariantMutation, updateProduct,
    buildAttrValuesForModal, generateSkuSuffix,
    submitVariant, openEditVariant, openCreateVariant,
  }
}
