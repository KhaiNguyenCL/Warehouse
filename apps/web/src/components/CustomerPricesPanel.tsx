import { useQuery } from '@tanstack/react-query'
import { Table, Form, InputNumber, Select, Input, Button } from 'antd'
import { api } from '../lib/api'
import { moneyProps } from '../lib/utils'
import { fw } from '../styles/fieldWidths'
import { useApiMutation } from '../hooks/useApiMutation'
import { useEntityModal } from '../hooks/useEntityModal'

interface Props {
  productId: string
  variantId: string
}

export default function CustomerPricesPanel({ productId, variantId }: Props) {
  const { editing, form, openCreate, openEdit, close } = useEntityModal()

  const { data: prices, isLoading } = useQuery({
    queryKey: ['products', productId, 'variants', variantId, 'customer-prices'],
    queryFn: async () => (await api.get(`/products/${productId}/variants/${variantId}/customer-prices`)).data,
  })

  const { data: companies } = useQuery({
    queryKey: ['companies', 'customer'],
    queryFn: async () => (await api.get('/companies', { params: { type: 'customer', limit: 100 } })).data,
  })

  const invalidate = { invalidateKey: ['products', productId, 'variants', variantId, 'customer-prices'] }

  const createMutation = useApiMutation(
    (values: any) => api.post(`/products/${productId}/variants/${variantId}/customer-prices`, values),
    { successMessage: 'Thêm giá KH thành công', ...invalidate, onSuccess: close },
  )

  const updateMutation = useApiMutation(
    (values: any) => api.patch(`/products/${productId}/variants/${variantId}/customer-prices/${editing.id}`, values),
    { successMessage: 'Cập nhật thành công', ...invalidate, onSuccess: close },
  )

  const deleteMutation = useApiMutation(
    (priceId: string) => api.delete(`/products/${productId}/variants/${variantId}/customer-prices/${priceId}`),
    { successMessage: 'Đã xoá', ...invalidate },
  )

  return (
    <div>
      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={prices}
        pagination={false}
        size="small"
        onRow={(record: any) => ({ onClick: () => openEdit(record), style: { cursor: 'pointer' } })}
        columns={[
          { title: 'Khách hàng', dataIndex: 'company_name' },
          {
            title: 'Giá',
            dataIndex: 'price',
            render: (v: number, r: any) => `${v?.toLocaleString('vi-VN')} ${r.currency}`,
          },
          { title: 'Ghi chú', dataIndex: 'note' },
          {
            title: '',
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
        layout="inline"
        style={{ marginTop: 12, flexWrap: 'wrap', gap: 8 }}
        onFinish={(v) => (editing ? updateMutation.mutate(v) : createMutation.mutate(v))}
      >
        {!editing && (
          <Form.Item name="company_id" rules={[{ required: true, message: 'Bắt buộc' }]}>
            <Select
              placeholder="Chọn khách hàng"
              style={{ width: fw.company }}
              showSearch
              optionFilterProp="label"
              options={companies?.data.map((c: any) => ({ value: c.id, label: c.name }))}
            />
          </Form.Item>
        )}
        <Form.Item name="price" rules={[{ required: true, message: 'Bắt buộc' }]}>
          <InputNumber placeholder="Giá" min={0} {...moneyProps} style={{ width: 160 }} />
        </Form.Item>
        <Form.Item name="currency" initialValue="VND">
          <Select style={{ width: 80 }} options={[
            { value: 'VND', label: 'VND' },
            { value: 'USD', label: 'USD' },
          ]} />
        </Form.Item>
        <Form.Item name="note">
          <Input placeholder="Ghi chú" style={{ width: fw.note }} />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>
            {editing ? 'Lưu' : '+ Thêm'}
          </Button>
        </Form.Item>
        {editing && (
          <Form.Item>
            <Button onClick={() => openCreate()}>Huỷ sửa</Button>
          </Form.Item>
        )}
      </Form>
    </div>
  )
}
