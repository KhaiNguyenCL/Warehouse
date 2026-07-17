import { Table, Input, Select, Switch, Form, Button, Space, Popconfirm } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useWarehouses } from '../hooks/useWarehouses'
import { PageHeader } from '../components/PageHeader'
import { TableCard } from '../components/ui/TableCard'
import { EntityFormModal } from '../components/EntityFormModal'
import { StatusTag } from '../components/StatusTag'

const TYPE_COLOR: Record<string, string> = { virtual: 'orange', physical: 'blue' }
const TYPE_LABEL: Record<string, string> = { physical: 'Vật lý', virtual: 'Ảo' }
const WAREHOUSE_TYPES = [
  { value: 'physical', label: 'Vật lý' },
  { value: 'virtual', label: 'Ảo (Demo/Bảo hành/Chờ QC...)' },
]

export default function WarehousesPage() {
  const hook = useWarehouses()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader
        title="Kho hàng"
        actions={<Button type="primary" icon={<PlusOutlined />} onClick={hook.create}>Tạo kho</Button>}
      />
      <TableCard><Table
        rowKey="id"
        loading={hook.isLoading}
        dataSource={hook.data}
        pagination={false}
        columns={[
          { title: 'STT', width: 52, align: 'center' as const, render: (_: any, __: any, i: number) => i + 1 },
          { title: 'Mã', dataIndex: 'code' },
          { title: 'Tên', dataIndex: 'name' },
          {
            title: 'Loại',
            dataIndex: 'type',
            render: (t: string) => <StatusTag status={t} colorMap={TYPE_COLOR} labelMap={TYPE_LABEL} />,
          },
          {
            title: 'Mặc định',
            dataIndex: 'is_default',
            width: 90,
            render: (v: boolean) => v ? <Switch size="small" checked disabled /> : null,
          },
          {
            title: 'Quản lý',
            dataIndex: 'manager_id',
            render: (id: string) => hook.users?.data?.find((u: any) => u.id === id)?.full_name ?? '—',
          },
          {
            title: '',
            width: 140,
            render: (_: any, record: any) => (
              <Space onClick={(e) => e.stopPropagation()}>
                <Button size="small" onClick={() => hook.openEdit(record)}>Sửa</Button>
                <Popconfirm title="Xoá kho này?" onConfirm={() => hook.deleteMutation.mutate(record.id)} okText="Xoá" cancelText="Không">
                  <Button size="small" danger loading={hook.deleteMutation.isPending}>Xoá</Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      /></TableCard>

      <EntityFormModal
        title={hook.editing ? `Sửa kho "${hook.editing.name}"` : 'Tạo kho mới'}
        open={hook.open}
        onCancel={hook.close}
        onFinish={(v) => (hook.editing ? hook.updateMutation.mutate(v) : hook.createMutation.mutate(v))}
        confirmLoading={hook.createMutation.isPending || hook.updateMutation.isPending}
        form={hook.form}
      >
        <Form.Item name="code" label="Mã" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="name" label="Tên" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="type" label="Loại kho" rules={[{ required: true }]}>
          <Select options={WAREHOUSE_TYPES} />
        </Form.Item>
        <Form.Item name="address" label="Địa chỉ">
          <Input />
        </Form.Item>
        <Form.Item name="description" label="Mô tả">
          <Input.TextArea />
        </Form.Item>
        <Form.Item name="manager_id" label="Người quản lý">
          <Select
            allowClear
            options={hook.users?.data?.map((u: any) => ({ value: u.id, label: u.full_name }))}
          />
        </Form.Item>
        <Form.Item name="is_default" label="Kho mặc định" valuePropName="checked"
          extra="Tự động chọn kho này khi tạo phiếu nhập/xuất/chuyển">
          <Switch />
        </Form.Item>
        {hook.editing && (
          <Form.Item name="is_active" label="Hoạt động" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        )}
      </EntityFormModal>
    </div>
  )
}
