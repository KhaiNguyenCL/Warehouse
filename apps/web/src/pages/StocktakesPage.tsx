import { Table, Form, Input, Select, Button } from 'antd'
import { useStocktakes } from '../hooks/useStocktakes'
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
  const hook = useStocktakes()

  return (
    <div>
      <PageHeader title="Kiểm kê (Stocktake)" actionLabel="+ Tạo kiểm kê" onAction={hook.openCreate} />

      <Table
        rowKey="id"
        loading={hook.isLoading}
        dataSource={hook.data?.data}
        pagination={false}
        onRow={(record: any) => ({ onClick: () => hook.navigate(`/stocktakes/${record.id}`), style: { cursor: 'pointer' } })}
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
        open={hook.open}
        onCancel={hook.close}
        onFinish={(v) => hook.createMutation.mutate(v)}
        confirmLoading={hook.createMutation.isPending}
        form={hook.form}
        initialValues={{ scope_type: 'all' }}
      >
        <Form.Item name="code" label="Mã kiểm kê" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="warehouse_id" label="Kho" rules={[{ required: true }]}>
          <Select options={hook.warehouses?.map((w: any) => ({ value: w.id, label: `${w.name} (${w.code})` }))} />
        </Form.Item>
        <Form.Item name="scope_type" label="Phạm vi" rules={[{ required: true }]}>
          <Select options={SCOPE_TYPES} onChange={() => hook.form.setFieldValue('scope_ids', undefined)} />
        </Form.Item>
        {hook.scopeType === 'by_sku' && (
          <Form.List name="scope_ids">
            {(fields, { add, remove }) => (
              <div className="form-row-full">
                {fields.map(({ key, name }) => (
                  <StocktakeSkuPicker key={key} form={hook.form} name={name} remove={() => remove(name)} />
                ))}
                <Button onClick={() => add()}>+ Thêm SKU</Button>
              </div>
            )}
          </Form.List>
        )}
        {hook.scopeType === 'by_category' && (
          <Form.Item name="scope_ids" label="Chọn Category" rules={[{ required: true }]} className="form-row-full">
            <Select mode="multiple" options={hook.categories?.map((c: any) => ({ value: c.id, label: c.name }))} />
          </Form.Item>
        )}
        <Form.Item name="note" label="Ghi chú" className="form-row-full">
          <Input.TextArea rows={2} />
        </Form.Item>
      </EntityFormModal>
    </div>
  )
}
