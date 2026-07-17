import { Table, Input, Switch, Tag, Form, Button, Space, Popconfirm } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useBrands } from '../hooks/useBrands'
import { PageHeader } from '../components/PageHeader'
import { TableCard } from '../components/ui/TableCard'
import { EntityFormModal } from '../components/EntityFormModal'

export default function BrandsPage() {
  const hook = useBrands()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader
        title="Thương hiệu"
        actions={<Button type="primary" icon={<PlusOutlined />} onClick={() => hook.openCreate()}>Tạo mới</Button>}
      />
      <TableCard><Table
        rowKey="id"
        loading={hook.isLoading}
        dataSource={hook.data}
        pagination={false}
        columns={[
          { title: 'STT', width: 52, align: 'center' as const, render: (_: any, __: any, i: number) => i + 1 },
          { title: 'Tên hãng', dataIndex: 'name' },
          { title: 'Mã viết tắt', dataIndex: 'short_code' },
          {
            title: 'Hoạt động',
            dataIndex: 'is_active',
            render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Có' : 'Không'}</Tag>,
          },
          {
            title: '',
            width: 140,
            render: (_: any, record: any) => (
              <Space onClick={(e) => e.stopPropagation()}>
                <Button size="small" onClick={() => hook.openEdit(record)}>Sửa</Button>
                <Popconfirm title="Xoá hãng này?" onConfirm={() => hook.deleteMutation.mutate(record.id)} okText="Xoá" cancelText="Không">
                  <Button size="small" danger loading={hook.deleteMutation.isPending}>Xoá</Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      /></TableCard>

      <EntityFormModal
        title={hook.editing ? `Sửa hãng "${hook.editing.name}"` : 'Tạo hãng mới'}
        open={hook.open}
        onCancel={hook.close}
        onFinish={(v) => (hook.editing ? hook.updateMutation.mutate(v) : hook.createMutation.mutate(v))}
        confirmLoading={hook.createMutation.isPending || hook.updateMutation.isPending}
        form={hook.form}
      >
        <Form.Item name="name" label="Tên hãng" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item
          name="short_code"
          label="Mã viết tắt"
          extra="Dùng để gợi ý mã sản phẩm (VD: Cisco -> CSC)"
          rules={[{ required: true }]}
        >
          <Input />
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
