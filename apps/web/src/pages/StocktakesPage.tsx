import { useQuery } from '@tanstack/react-query'
import { Table, Form, Input, Select, Button } from 'antd'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useApiMutation } from '../hooks/useApiMutation'
import { useEntityModal } from '../hooks/useEntityModal'
import { PageHeader } from '../components/PageHeader'
import { EntityFormModal } from '../components/EntityFormModal'
import { StatusTag } from '../components/StatusTag'
import StocktakeSkuPicker from '../components/StocktakeSkuPicker'

const STATUS_COLOR: Record<string, string> = { in_progress: 'blue', completed: 'green', cancelled: 'red' }

const SCOPE_TYPES = [
  { value: 'all', label: 'Toàn bộ kho' },
  { value: 'by_sku', label: 'Theo SKU chỉ định' },
  { value: 'by_category', label: 'Theo Category' },
]

export default function StocktakesPage() {
  const { open, form, openCreate, close } = useEntityModal()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['stocktakes'],
    queryFn: async () => (await api.get('/stocktakes')).data,
  })

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => (await api.get('/warehouses')).data,
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await api.get('/products/categories')).data,
  })

  const scopeType: string = Form.useWatch('scope_type', form) ?? 'all'

  const createMutation = useApiMutation((values: any) => api.post('/stocktakes', values), {
    successMessage: 'Tạo kiểm kê thành công (In Progress)',
    invalidateKey: ['stocktakes'],
    onSuccess: close,
  })

  return (
    <div>
      <PageHeader title="Kiểm kê (Stocktake)" actionLabel="+ Tạo kiểm kê" onAction={openCreate} />

      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={data?.data}
        pagination={false}
        onRow={(record: any) => ({ onClick: () => navigate(`/stocktakes/${record.id}`), style: { cursor: 'pointer' } })}
        columns={[
          { title: 'Mã kiểm kê', dataIndex: 'code' },
          { title: 'Kho', dataIndex: 'warehouse_name' },
          { title: 'Phạm vi', dataIndex: 'scope_type' },
          { title: 'Trạng thái', dataIndex: 'status', render: (s) => <StatusTag status={s} colorMap={STATUS_COLOR} /> },
          { title: 'Bắt đầu', dataIndex: 'started_at', render: (d) => new Date(d).toLocaleString('vi-VN') },
        ]}
      />

      <EntityFormModal
        title="Tạo phiếu kiểm kê"
        open={open}
        onCancel={close}
        onFinish={(v) => createMutation.mutate(v)}
        confirmLoading={createMutation.isPending}
        form={form}
        initialValues={{ scope_type: 'all' }}
      >
        <Form.Item name="code" label="Mã kiểm kê" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="warehouse_id" label="Kho" rules={[{ required: true }]}>
          <Select options={warehouses?.map((w: any) => ({ value: w.id, label: `${w.name} (${w.code})` }))} />
        </Form.Item>
        <Form.Item name="scope_type" label="Phạm vi" rules={[{ required: true }]}>
          <Select options={SCOPE_TYPES} onChange={() => form.setFieldValue('scope_ids', undefined)} />
        </Form.Item>
        {scopeType === 'by_sku' && (
          <Form.List name="scope_ids">
            {(fields, { add, remove }) => (
              <div className="form-row-full">
                {fields.map(({ key, name }) => (
                  <StocktakeSkuPicker key={key} form={form} name={name} remove={() => remove(name)} />
                ))}
                <Button onClick={() => add()}>+ Thêm SKU</Button>
              </div>
            )}
          </Form.List>
        )}
        {scopeType === 'by_category' && (
          <Form.Item name="scope_ids" label="Chọn Category" rules={[{ required: true }]} className="form-row-full">
            <Select mode="multiple" options={categories?.map((c: any) => ({ value: c.id, label: c.name }))} />
          </Form.Item>
        )}
        <Form.Item name="note" label="Ghi chú" className="form-row-full">
          <Input.TextArea rows={2} />
        </Form.Item>
      </EntityFormModal>
    </div>
  )
}
