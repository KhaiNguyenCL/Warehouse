import { useQuery } from '@tanstack/react-query'
import { Table, Form, Input, Select, Button } from 'antd'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useApiMutation } from '../hooks/useApiMutation'
import { useEntityModal } from '../hooks/useEntityModal'
import { PageHeader } from '../components/PageHeader'
import { EntityFormModal } from '../components/EntityFormModal'
import { StatusTag } from '../components/StatusTag'
import DeliveryLineItem from '../components/DeliveryLineItem'

const STATUS_COLOR: Record<string, string> = {
  draft: 'default',
  pending_approval: 'gold',
  approved: 'blue',
  completed: 'green',
  cancelled: 'red',
}

const TRANSFER_TYPES = [
  { value: 'transfer', label: 'Chuyển kho thông thường' },
  { value: 'warranty_in', label: 'Nhận lại sau bảo hành' },
  { value: 'demo_in', label: 'Nhận lại sau demo' },
  { value: 'qc_pass', label: 'Hàng qua QC đạt' },
  { value: 'sn_ready', label: 'Đã nhập SN xong' },
]

export default function TransferOrdersPage() {
  const { open, form, openCreate, close } = useEntityModal()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['transfers'],
    queryFn: async () => (await api.get('/transfers')).data,
  })

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => (await api.get('/warehouses')).data,
  })

  const transferType: string | undefined = Form.useWatch('transfer_type', form)
  const needsFromWarehouse = transferType === 'transfer'

  const createMutation = useApiMutation((values: any) => api.post('/transfers', values), {
    successMessage: 'Tạo Transfer Order thành công (Draft)',
    invalidateKey: ['transfers'],
    onSuccess: close,
  })

  return (
    <div>
      <PageHeader title="Phiếu chuyển kho (Transfer Order)" actionLabel="+ Tạo Transfer Order" onAction={openCreate} />

      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={data?.data}
        pagination={false}
        onRow={(record: any) => ({ onClick: () => navigate(`/transfers/${record.id}`), style: { cursor: 'pointer' } })}
        columns={[
          { title: 'Mã phiếu', dataIndex: 'code' },
          { title: 'Loại chuyển', dataIndex: 'transfer_type' },
          { title: 'Kho nguồn', dataIndex: 'from_warehouse_name' },
          { title: 'Kho đích', dataIndex: 'to_warehouse_name' },
          { title: 'Trạng thái', dataIndex: 'status', render: (s) => <StatusTag status={s} colorMap={STATUS_COLOR} /> },
        ]}
      />

      <EntityFormModal
        title="Tạo phiếu chuyển kho"
        open={open}
        onCancel={close}
        onFinish={(v) => createMutation.mutate(v)}
        confirmLoading={createMutation.isPending}
        form={form}
        width={1000}
        initialValues={{ lines: [{}] }}
      >
        <Form.Item name="code" label="Mã phiếu" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="transfer_type" label="Loại chuyển" rules={[{ required: true }]}>
          <Select options={TRANSFER_TYPES} onChange={() => form.setFieldValue('from_warehouse_id', undefined)} />
        </Form.Item>
        {needsFromWarehouse && (
          <Form.Item name="from_warehouse_id" label="Kho nguồn" rules={[{ required: true }]}>
            <Select options={warehouses?.map((w: any) => ({ value: w.id, label: `${w.name} (${w.code})` }))} />
          </Form.Item>
        )}
        <Form.Item
          name="to_warehouse_id"
          label="Kho đích"
          rules={[{ required: true }]}
          extra={!needsFromWarehouse ? 'Kho nguồn tự suy ra từ kho ảo tương ứng loại chuyển' : undefined}
        >
          <Select options={warehouses?.map((w: any) => ({ value: w.id, label: `${w.name} (${w.code})` }))} />
        </Form.Item>
        <Form.Item name="note" label="Ghi chú" className="form-row-full">
          <Input.TextArea rows={2} />
        </Form.Item>

        <Form.List name="lines">
          {(fields, { add, remove }) => (
            <div className="form-row-full">
              {fields.map(({ key, name }) => (
                <DeliveryLineItem key={key} name={name} remove={() => remove(name)} />
              ))}
              <Button onClick={() => add()}>+ Thêm dòng</Button>
            </div>
          )}
        </Form.List>
      </EntityFormModal>
    </div>
  )
}
