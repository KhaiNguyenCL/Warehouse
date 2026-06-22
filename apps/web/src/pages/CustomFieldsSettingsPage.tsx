// Settings > Custom Field — CRUD định nghĩa field theo từng object_type. KHÔNG sửa được
// field_name/field_type/object_type sau khi tạo (backend chặn — field_values cũ đã lưu
// theo field_type này, đổi sẽ làm dữ liệu cũ sai nghĩa), nên modal "Sửa" chỉ có
// field_label/options/sort_order/is_active.
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Table, Input, Select, InputNumber, Switch, Tag, Space, Popconfirm, Button, Form } from 'antd'
import { api } from '../lib/api'
import { useApiMutation } from '../hooks/useApiMutation'
import { useEntityModal } from '../hooks/useEntityModal'
import { PageHeader } from '../components/PageHeader'
import { EntityFormModal } from '../components/EntityFormModal'

const OBJECT_TYPES = [
  { value: 'quotation', label: 'Quotation' },
  { value: 'receipt', label: 'Receipt' },
  { value: 'delivery_order', label: 'Delivery Order' },
  { value: 'product', label: 'Product' },
  { value: 'company', label: 'Company' },
]

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Select' },
  { value: 'boolean', label: 'Boolean' },
]

export default function CustomFieldsSettingsPage() {
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
    })
  }

  function submit(values: any) {
    if (editing) updateMutation.mutate(values)
    else createMutation.mutate(values)
  }

  const fieldType: string = Form.useWatch('field_type', form)

  return (
    <div>
      <PageHeader
        title="Custom Field"
        actionLabel="+ Tạo field"
        onAction={openCreate}
        extra={<Select style={{ width: 200 }} value={objectType} onChange={setObjectType} options={OBJECT_TYPES} />}
      />

      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={data}
        pagination={false}
        columns={[
          { title: 'field_name', dataIndex: 'field_name' },
          { title: 'Tên hiển thị', dataIndex: 'field_label' },
          { title: 'Loại', dataIndex: 'field_type' },
          {
            title: 'Options',
            dataIndex: 'options',
            render: (opts: string[] | null) => opts?.map((o) => <Tag key={o}>{o}</Tag>),
          },
          { title: 'Thứ tự', dataIndex: 'sort_order' },
          {
            title: 'Active',
            dataIndex: 'is_active',
            render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Có' : 'Không'}</Tag>,
          },
          {
            title: '',
            render: (_: any, record: any) => (
              <Space>
                <Button size="small" onClick={() => openEditField(record)}>
                  Sửa
                </Button>
                <Popconfirm title="Xoá field này?" onConfirm={() => deleteMutation.mutate(record.id)}>
                  <Button size="small" danger>
                    Xoá
                  </Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <EntityFormModal
        title={editing ? `Sửa field "${editing.field_name}"` : 'Tạo field mới'}
        open={open}
        onCancel={close}
        onFinish={submit}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        form={form}
      >
        {!editing && (
          <>
            <Form.Item
              name="field_name"
              label="field_name (machine key)"
              rules={[{ required: true, pattern: /^[a-z][a-z0-9_]*$/, message: 'snake_case, bắt đầu bằng chữ thường' }]}
              extra="Không thể sửa sau khi tạo"
            >
              <Input placeholder="vd: warranty_note" />
            </Form.Item>
            <Form.Item name="field_type" label="Loại field" rules={[{ required: true }]} extra="Không thể sửa sau khi tạo">
              <Select options={FIELD_TYPES} />
            </Form.Item>
          </>
        )}
        <Form.Item name="field_label" label="Tên hiển thị" rules={[{ required: true }]}>
          <Input placeholder="vd: Ghi chú bảo hành" />
        </Form.Item>
        {(editing ? editing.field_type : fieldType) === 'select' && (
          <Form.Item
            name="options"
            label="Options (mỗi giá trị 1 dòng)"
            rules={[{ required: true, message: 'field_type select bắt buộc phải có options' }]}
          >
            <Select mode="tags" open={false} tokenSeparators={['\n']} placeholder="Nhập giá trị rồi Enter" />
          </Form.Item>
        )}
        <Form.Item name="sort_order" label="Thứ tự hiển thị" initialValue={0}>
          <InputNumber style={{ width: '100%' }} />
        </Form.Item>
        {editing && (
          <Form.Item name="is_active" label="Active" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        )}
      </EntityFormModal>
    </div>
  )
}
