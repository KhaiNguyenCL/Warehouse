// Dùng chung cho mọi trang dạng "list + modal tạo/sửa 1 record" (Category, Brand,
// Warehouse, Company, Custom Field...) — chuẩn hoá state lặp lại ở mọi trang: open,
// editing (null = đang tạo mới), form instance, và 3 hành động openCreate/openEdit/close.
import { Form } from 'antd'
import { useState } from 'react'

export function useEntityModal<T = any>() {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<T | null>(null)
  const [form] = Form.useForm()

  function openCreate(initialValues?: Record<string, unknown>) {
    setEditing(null)
    form.resetFields()
    if (initialValues) form.setFieldsValue(initialValues)
    setOpen(true)
  }

  // initialValues tách riêng record — vì nhiều trang cần map lại field trước khi đổ vào
  // form (vd CustomFieldsSettingsPage chỉ đổ field_label/options/sort_order/is_active,
  // không đổ field_name/field_type vì 2 field đó không hiện trong form lúc sửa).
  function openEdit(record: T, initialValues?: Record<string, unknown>) {
    setEditing(record)
    form.setFieldsValue(initialValues ?? (record as Record<string, unknown>))
    setOpen(true)
  }

  function close() {
    setOpen(false)
    setEditing(null)
    form.resetFields()
  }

  return { open, editing, form, openCreate, openEdit, close }
}
