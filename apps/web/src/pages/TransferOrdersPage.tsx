import { Table, Form, Input, Select, Button, Tooltip, Space } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useTransferOrders } from '../hooks/useTransferOrders'
import { PageHeader } from '../components/PageHeader'
import { TableCard } from '../components/ui/TableCard'
import { StatusBadge } from '../components/ui/StatusBadge'
import { EntityFormModal } from '../components/EntityFormModal'
import DeliveryLineItem from '../components/DeliveryLineItem'

const TRANSFER_TYPES = [
  { value: 'transfer', label: 'Chuyển kho thông thường' },
  { value: 'warranty_in', label: 'Nhận lại sau bảo hành' },
  { value: 'demo_in', label: 'Nhận lại sau demo' },
  { value: 'qc_pass', label: 'Hàng qua QC đạt' },
  { value: 'sn_ready', label: 'Đã nhập SN xong' },
]

export default function TransferOrdersPage() {
  const hook = useTransferOrders()
  const headerFromWh: string | undefined = Form.useWatch('from_warehouse_id', hook.form)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader
        title="Phiếu chuyển kho"
        actions={<Button type="primary" icon={<PlusOutlined />} onClick={hook.openCreate}>Tạo phiếu chuyển</Button>}
      />
      <TableCard>
        <Table
          rowKey="id"
          loading={hook.isLoading}
          dataSource={hook.data?.data}
          pagination={{ current: hook.page, pageSize: 20, total: hook.data?.total, onChange: hook.setPage, showSizeChanger: false, showTotal: (t) => `Tổng ${t}` }}
          onRow={(record: any) => ({ onClick: () => hook.navigate(`/transfers/${record.id}`), style: { cursor: 'pointer' } })}
          columns={[
            { title: 'STT', width: 52, align: 'center' as const, render: (_: any, __: any, i: number) => i + 1 },
            { title: 'Mã phiếu', dataIndex: 'code' },
            { title: 'Loại chuyển', dataIndex: 'transfer_type' },
            { title: 'Kho nguồn', dataIndex: 'from_warehouse_name' },
            { title: 'Kho đích', dataIndex: 'to_warehouse_name' },
            { title: 'Trạng thái', dataIndex: 'status', render: (s: string) => <StatusBadge status={s} /> },
          ]}
        />
      </TableCard>

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
                <Space key={key} align="start" style={{ width: '100%', marginBottom: 8 }}>
                  <DeliveryLineItem name={name} remove={() => remove(name)} />
                  {hook.needsFromWarehouse && (
                    <Form.Item
                      name={[name, 'from_warehouse_id']}
                      label={name === 0 ? 'Kho nguồn dòng' : undefined}
                      style={{ minWidth: 180, marginBottom: 0 }}
                    >
                      <Select
                        placeholder={headerFromWh
                          ? hook.warehouses?.find((w: any) => w.id === headerFromWh)?.name + ' (mặc định)'
                          : 'Kho nguồn'}
                        allowClear
                        options={hook.warehouses?.map((w: any) => ({ value: w.id, label: w.name }))}
                        size="small"
                      />
                    </Form.Item>
                  )}
                </Space>
              ))}
              <Button onClick={() => add()}>+ Thêm dòng</Button>
            </div>
          )}
        </Form.List>
      </EntityFormModal>
    </div>
  )
}
