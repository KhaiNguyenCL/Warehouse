// Hai hook độc lập cho 2 tab của CustomFieldsSettingsPage.
// Sub-components VariantAttributesTab và CustomFieldsTab giữ nguyên trong page file —
// chỉ chuyển stateful logic vào đây.
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Form, message } from 'antd'
import { api } from '../lib/api'
import { useApiMutation } from './useApiMutation'
import { useEntityModal } from './useEntityModal'

// ─── Hook cho VariantAttributesTab ────────────────────────────────────────────

interface AttrDef {
  id: string
  name: string
  field_type: 'select' | 'text'
  unit: string | null
  options: string[]
  applies_to: 'all' | 'product'
  is_active: boolean
  products: Array<{ product_id: string; product_name: string }>
}

export function useVariantAttributesTab() {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AttrDef | null>(null)
  const [form] = Form.useForm()
  const [optionInput, setOptionInput] = useState('')
  const [options, setOptions] = useState<string[]>([])
  const [appliesTo, setAppliesTo] = useState<'all' | 'product'>('all')
  const fieldType: 'select' | 'text' = Form.useWatch('field_type', form) ?? 'select'

  const { data, isLoading } = useQuery<AttrDef[]>({
    queryKey: ['variant-attribute-defs'],
    queryFn: async () => (await api.get('/settings/variant-attribute-defs')).data,
  })

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['products', 'all-for-attr-settings'],
    queryFn: async () => (await api.get('/products', { params: { limit: 100 } })).data,
    staleTime: 60_000,
  })

  function openCreate() {
    setEditing(null)
    setOptions([])
    setAppliesTo('all')
    form.resetFields()
    setModalOpen(true)
  }

  function openEdit(record: AttrDef) {
    setEditing(record)
    setOptions(record.options)
    setAppliesTo(record.applies_to)
    form.setFieldsValue({
      name: record.name,
      field_type: record.field_type ?? 'select',
      unit: record.unit,
      applies_to: record.applies_to,
      product_ids: record.products.map((p) => p.product_id),
      is_active: record.is_active,
    })
    setModalOpen(true)
  }

  function addOption() {
    const val = optionInput.trim()
    if (!val || options.includes(val)) return
    setOptions([...options, val])
    setOptionInput('')
  }

  async function handleSave() {
    try {
      const values = await form.validateFields()
      const body = { ...values, options: values.field_type === 'select' ? options : [] }
      if (editing) {
        await api.patch(`/settings/variant-attribute-defs/${editing.id}`, body)
        message.success('Cập nhật thành công')
      } else {
        await api.post('/settings/variant-attribute-defs', body)
        message.success('Tạo thuộc tính thành công')
      }
      qc.invalidateQueries({ queryKey: ['variant-attribute-defs'] })
      setModalOpen(false)
    } catch (err: any) {
      if (err?.errorFields) return
      message.error(err?.response?.data?.message ?? 'Lỗi')
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/settings/variant-attribute-defs/${id}`)
      message.success('Đã xoá')
      qc.invalidateQueries({ queryKey: ['variant-attribute-defs'] })
    } catch (err: any) {
      message.error(err?.response?.data?.message ?? 'Không thể xoá')
    }
  }

  return {
    modalOpen, setModalOpen,
    editing,
    form,
    optionInput, setOptionInput,
    options, setOptions,
    appliesTo, setAppliesTo,
    fieldType,
    data, isLoading,
    products, productsLoading,
    openCreate, openEdit,
    addOption, handleSave, handleDelete,
  }
}

// ─── Hook cho CustomFieldsTab ──────────────────────────────────────────────────

export function useCustomFieldsTab() {
  const [objectType, setObjectType] = useState('product')
  const { open, editing, form, openCreate, openEdit, close } = useEntityModal()

  const { data, isLoading } = useQuery({
    queryKey: ['custom-fields', objectType],
    queryFn: async () => (await api.get('/custom-fields', { params: { object_type: objectType } })).data,
  })

  const createMutation = useApiMutation(
    (values: any) => api.post('/custom-fields', { ...values, object_type: objectType }),
    { successMessage: 'Tạo field thành công', invalidateKey: ['custom-fields', objectType], onSuccess: close },
  )

  const updateMutation = useApiMutation((values: any) => api.patch(`/custom-fields/${editing.id}`, values), {
    successMessage: 'Cập nhật thành công',
    invalidateKey: ['custom-fields', objectType],
    onSuccess: close,
  })

  const deleteMutation = useApiMutation((id: string) => api.delete(`/custom-fields/${id}`), {
    successMessage: 'Xoá thành công',
    invalidateKey: ['custom-fields', objectType],
  })

  function openEditField(field: any) {
    openEdit(field, {
      field_label: field.field_label,
      options: field.options ?? [],
      sort_order: field.sort_order,
      is_active: field.is_active,
      applies_to_po_line: field.applies_to_po_line,
    })
  }

  function submit(values: any) {
    if (editing) updateMutation.mutate(values)
    else createMutation.mutate(values)
  }

  const fieldType: string = Form.useWatch('field_type', form)

  return {
    objectType, setObjectType,
    open, editing, form, openCreate, openEdit, close,
    data, isLoading,
    createMutation, updateMutation, deleteMutation,
    openEditField, submit,
    fieldType,
  }
}
