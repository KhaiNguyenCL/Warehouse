// Panel tái sử dụng — render dynamic form theo các custom field đã định nghĩa sẵn
// (Settings > Custom Field) cho 1 object_type, gắn giá trị cho 1 object instance cụ thể
// (objectId). Chỉ hiển thị field đang is_active. Lưu = PUT toàn bộ values 1 lần (giống
// pattern replace ở backend), không lưu từng field riêng lẻ.
import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Form, Input, InputNumber, DatePicker, Select, Switch, Button, message, Card } from 'antd'
import dayjs from 'dayjs'
import { api } from '../lib/api'

interface CustomFieldDef {
  id: string
  field_name: string
  field_label: string
  field_type: 'text' | 'number' | 'date' | 'select' | 'boolean'
  options: string[] | null
  is_active: boolean
}

export default function CustomFieldsPanel({ objectType, objectId, inline }: { objectType: string; objectId: string; inline?: boolean }) {
  const [form] = Form.useForm()
  const qc = useQueryClient()

  const { data: fields, isLoading: fieldsLoading } = useQuery<CustomFieldDef[]>({
    queryKey: ['custom-fields', objectType],
    queryFn: async () => (await api.get('/custom-fields', { params: { object_type: objectType } })).data,
  })

  const { data: values, isLoading: valuesLoading } = useQuery({
    queryKey: ['custom-fields', 'values', objectType, objectId],
    queryFn: async () =>
      (await api.get('/custom-fields/values', { params: { object_type: objectType, object_id: objectId } })).data,
  })

  // Field định nghĩa và giá trị đang lưu nằm ở 2 query khác nhau (giống response API) —
  // chỉ build initial form values khi CẢ HAI đã load xong, nếu không field "date"/"boolean"
  // sẽ bị set sai kiểu lúc fields chưa kịp về.
  useEffect(() => {
    if (!fields || !values) return
    const initial: Record<string, any> = {}
    for (const f of fields) {
      const v = values.find((x: any) => x.field_id === f.id)?.value
      if (v === undefined || v === null) continue
      if (f.field_type === 'date') initial[f.id] = dayjs(v)
      else if (f.field_type === 'boolean') initial[f.id] = v === 'true'
      else initial[f.id] = v
    }
    form.setFieldsValue(initial)
  }, [fields, values, form])

  const saveMutation = useMutation({
    mutationFn: (body: any) =>
      api.put('/custom-fields/values', body, { params: { object_type: objectType, object_id: objectId } }),
    onSuccess: () => {
      message.success('Lưu custom field thành công')
      qc.invalidateQueries({ queryKey: ['custom-fields', 'values', objectType, objectId] })
    },
    onError: (err: any) => message.error(err.response?.data?.error ?? 'Lỗi'),
  })

  if (fieldsLoading || valuesLoading) return null
  const activeFields = (fields ?? []).filter((f) => f.is_active)
  if (activeFields.length === 0) return null

  function submit(formValues: Record<string, any>) {
    const payload = activeFields.map((f) => {
      const raw = formValues[f.id]
      let value: string | null = null
      if (raw !== undefined && raw !== null && raw !== '') {
        value = f.field_type === 'date' ? raw.format('YYYY-MM-DD') : String(raw)
      }
      return { field_id: f.id, value }
    })
    saveMutation.mutate({ values: payload })
  }

  const formContent = (
    <Form form={form} layout="vertical" onFinish={submit}>
      {activeFields.map((f) => (
        <Form.Item key={f.id} name={f.id} label={f.field_label}>
          {f.field_type === 'text' && <Input />}
          {f.field_type === 'number' && <InputNumber style={{ width: '100%' }} />}
          {f.field_type === 'date' && <DatePicker style={{ width: '100%' }} />}
          {f.field_type === 'select' && (
            <Select options={(f.options ?? []).map((o) => ({ value: o, label: o }))} allowClear />
          )}
          {f.field_type === 'boolean' && <Switch />}
        </Form.Item>
      ))}
      <Button type="primary" htmlType="submit" loading={saveMutation.isPending}>
        Lưu
      </Button>
    </Form>
  )

  if (inline) {
    return (
      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 10 }}>
          Thông tin bổ sung
        </div>
        {formContent}
      </div>
    )
  }

  return (
    <Card title="Thông tin bổ sung (Custom Field)" size="small" style={{ marginTop: 16 }}>
      {formContent}
    </Card>
  )
}
