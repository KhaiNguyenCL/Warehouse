// Quản lý NCC cung cấp 1 variant (giá/SKU/lead time riêng theo từng NCC — CLAUDE.md mục 16).
// Render trong slot `extra` của EntityFormModal sửa SKU, có Form riêng. Click 1 dòng để sửa,
// nút Xoá riêng (backend có DELETE, khác Contact).
import { useQuery } from '@tanstack/react-query'
import { Table, Form, Input, InputNumber, Select, Switch, Button } from 'antd'
import { api } from '../lib/api'
import { moneyProps } from '../lib/utils'
import { useApiMutation } from '../hooks/useApiMutation'
import { useEntityModal } from '../hooks/useEntityModal'
import { fw } from '../styles/fieldWidths'

interface Props {
  productId: string
  variantId: string
}

export default function VariantSuppliersPanel({ productId, variantId }: Props) {
  const { editing, form, openCreate, openEdit, close } = useEntityModal()

  const { data: suppliers, isLoading } = useQuery({
    queryKey: ['products', productId, 'variants', variantId, 'suppliers'],
    queryFn: async () => (await api.get(`/products/${productId}/variants/${variantId}/suppliers`)).data,
  })

  const { data: companies } = useQuery({
    queryKey: ['companies', 'supplier'],
    queryFn: async () => (await api.get('/companies', { params: { type: 'supplier', limit: 100 } })).data,
  })

  const invalidate = { invalidateKey: ['products', productId, 'variants', variantId, 'suppliers'] }

  const createMutation = useApiMutation(
    (values: any) => api.post(`/products/${productId}/variants/${variantId}/suppliers`, values),
    { successMessage: 'Thêm NCC thành công', ...invalidate, onSuccess: close },
  )

  const updateMutation = useApiMutation(
    (values: any) => api.patch(`/products/${productId}/variants/${variantId}/suppliers/${editing.id}`, values),
    { successMessage: 'Cập nhật thành công', ...invalidate, onSuccess: close },
  )

  const deleteMutation = useApiMutation(
    (supplierId: string) => api.delete(`/products/${productId}/variants/${variantId}/suppliers/${supplierId}`),
    { successMessage: 'Đã xoá', ...invalidate },
  )

  return (
    <div>
      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={suppliers}
        pagination={false}
        size="small"
        onRow={(record: any) => ({ onClick: () => openEdit(record), style: { cursor: 'pointer' } })}
        columns={[
          { title: 'NCC', dataIndex: 'company_name' },
          { title: 'SKU của NCC', dataIndex: 'supplier_sku' },
          { title: 'Giá NCC', dataIndex: 'supplier_price' },
          { title: 'Lead time (ngày)', dataIndex: 'lead_time_days' },
          { title: 'Ưu tiên', dataIndex: 'is_preferred', render: (v: boolean) => (v ? 'Có' : '') },
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
        <Form.Item name="company_id" rules={[{ required: true, message: 'Bắt buộc' }]}>
          <Select
            showSearch
            optionFilterProp="label"
            placeholder="Chọn NCC"
            style={{ width: fw.company }}
            options={companies?.data.map((c: any) => ({ value: c.id, label: c.name }))}
          />
        </Form.Item>
        <Form.Item name="supplier_sku">
          <Input placeholder="SKU của NCC" style={{ width: 140 }} />
        </Form.Item>
        <Form.Item name="supplier_price">
          <InputNumber {...moneyProps} placeholder="Giá NCC" min={0} style={{ width: 120 }} />
        </Form.Item>
        <Form.Item name="lead_time_days">
          <InputNumber placeholder="Lead time (ngày)" min={0} style={{ width: 140 }} />
        </Form.Item>
        <Form.Item name="is_preferred" valuePropName="checked">
          <Switch checkedChildren="Ưu tiên" unCheckedChildren="Thường" />
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
