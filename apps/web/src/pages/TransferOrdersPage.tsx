import { Table, Form, Input, Select, Button, Tooltip } from 'antd'
import { useTransferOrders } from '../hooks/useTransferOrders'
import { PageHeader } from '../components/PageHeader'
import { EntityFormModal } from '../components/EntityFormModal'
import { StatusTag } from '../components/StatusTag'
import DeliveryLineItem from '../components/DeliveryLineItem'

const STATUS_COLOR: Record<string, string> = {
  draft: 'default',
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
  const hook = useTransferOrders()

  return (
    <div>
      <PageHeader title="Phiếu chuyển kho (Transfer Order)" actionLabel="+ Tạo Transfer Order" onAction={hook.openCreate} />

      <Table
        rowKey="id"
        loading={hook.isLoading}
        dataSource={hook.data?.data}
        pagination={false}
        onRow={(record: any) => ({ onClick: () => hook.navigate(`/transfers/${record.id}`), style: { cursor: 'pointer' } })}
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
        open={hook.open}
        onCancel={hook.close}
        onFinish={(v) => hook.createMutation.mutate(v)}
        confirmLoading={hook.createMutation.isPending}
        form={hook.form}
        width={1000}
        okText="Lưu nháp"
        initialValues={{ lines: [{}] }}
        footerExtra={
          <Tooltip title="Tạo xong chuyển thẳng đến trang chi tiết để Complete">
            <Button onClick={hook.createAndGoToDetail} loading={hook.createMutation.isPending}>
              Tạo & Complete
            </Button>
          </Tooltip>
        }
      >
        <Form.Item name="transfer_type" label="Loại chuyển" rules={[{ required: true }]}>
          <Select options={TRANSFER_TYPES} onChange={() => hook.form.setFieldValue('from_warehouse_id', undefined)} />
        </Form.Item>
        {hook.needsFromWarehouse && (
          <Form.Item name="from_warehouse_id" label="Kho nguồn" rules={[{ required: true }]}>
            <Select options={hook.warehouses?.map((w: any) => ({ value: w.id, label: `${w.name} (${w.code})` }))} />
          </Form.Item>
        )}
        <Form.Item
          name="to_warehouse_id"
          label="Kho đích"
          rules={[{ required: true }]}
          extra={!hook.needsFromWarehouse ? 'Kho nguồn tự suy ra từ kho ảo tương ứng loại chuyển' : undefined}
        >
          <Select options={hook.warehouses?.map((w: any) => ({ value: w.id, label: `${w.name} (${w.code})` }))} />
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
