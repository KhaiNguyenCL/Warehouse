import { useQuery } from '@tanstack/react-query'
import { Table, Form, Select, Input, Button } from 'antd'
import { api } from '../lib/api'
import { useApiMutation } from '../hooks/useApiMutation'
import { useEntityModal } from '../hooks/useEntityModal'

interface Props {
  productId: string
  variantId: string
}

export default function CustomerDescriptionsPanel({ productId, variantId }: Props) {
  const { editing, form, openCreate, openEdit, close } = useEntityModal()

  const { data: descriptions, isLoading } = useQuery({
    queryKey: ['products', productId, 'variants', variantId, 'customer-descriptions'],
    queryFn: async () => (await api.get(`/products/${productId}/variants/${variantId}/customer-descriptions`)).data,
  })

  const { data: companies } = useQuery({
    queryKey: ['companies', 'customer'],
    queryFn: async () => (await api.get('/companies', { params: { type: 'customer', limit: 100 } })).data,
  })

  const invalidate = { invalidateKey: ['products', productId, 'variants', variantId, 'customer-descriptions'] }

  const createMutation = useApiMutation(
    (values: any) => api.post(`/products/${productId}/variants/${variantId}/customer-descriptions`, values),
    { successMessage: 'Thêm mô tả KH thành công', ...invalidate, onSuccess: close },
  )

  const updateMutation = useApiMutation(
    (values: any) => api.patch(`/products/${productId}/variants/${variantId}/customer-descriptions/${editing.id}`, values),
    { successMessage: 'Cập nhật thành công', ...invalidate, onSuccess: close },
  )

  const deleteMutation = useApiMutation(
    (descId: string) => api.delete(`/products/${productId}/variants/${variantId}/customer-descriptions/${descId}`),
    { successMessage: 'Đã xoá', ...invalidate },
  )

  return (
    <div>
      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={descriptions}
        pagination={false}
        size="small"
        onRow={(record: any) => ({ onClick: () => openEdit(record), style: { cursor: 'pointer' } })}
        columns={[
          { title: 'Khách hàng', dataIndex: 'company_name', width: 200 },
          { title: 'Mô tả', dataIndex: 'description', ellipsis: true },
          {
            title: '',
            width: 70,
            render: (_: any, r: any) => (
              <Button
                size="small"
                danger
                onClick={(e) => {
                  e.stopPropagation()
                  deleteMutation.mutate(r.id)
                }}
              >
                Xoá
              </Button>
            ),
          },
        ]}
      />

      <Form
        form={form}
        layout="vertical"
        style={{ marginTop: 12 }}
        onFinish={(v) => (editing ? updateMutation.mutate(v) : createMutation.mutate(v))}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {!editing && (
            <Form.Item name="company_id" label="Khách hàng" rules={[{ required: true, message: 'Bắt buộc' }]} style={{ flex: '0 0 240px', marginBottom: 0 }}>
              <Select
                placeholder="Chọn khách hàng"
                showSearch
                optionFilterProp="label"
                options={companies?.data.map((c: any) => ({ value: c.id, label: c.name }))}
              />
            </Form.Item>
          )}
          <Form.Item name="description" label="Mô tả" rules={[{ required: true, message: 'Bắt buộc' }]} style={{ flex: '1 1 300px', marginBottom: 0 }}>
            <Input.TextArea autoSize={{ minRows: 1, maxRows: 4 }} placeholder="Mô tả hiển thị trên báo giá cho khách này" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>
              {editing ? 'Lưu' : '+ Thêm'}
            </Button>
          </Form.Item>
          {editing && (
            <Form.Item style={{ marginBottom: 0 }}>
              <Button onClick={() => openCreate()}>Huỷ sửa</Button>
            </Form.Item>
          )}
        </div>
      </Form>
    </div>
  )
}
