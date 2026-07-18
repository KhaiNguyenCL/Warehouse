import { useQuery } from '@tanstack/react-query'
import { Table, Input, Switch, Button, Modal, Form } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { api } from '../lib/api'
import { useApiMutation } from '../hooks/useApiMutation'
import { useEntityModal } from '../hooks/useEntityModal'

interface Props { companyId: string }

export default function ContactsPanel({ companyId }: Props) {
  const { open, editing, form, openCreate, openEdit, close } = useEntityModal()

  const { data: company, isLoading } = useQuery({
    queryKey: ['companies', companyId],
    queryFn: async () => (await api.get(`/companies/${companyId}`)).data,
  })

  const invalidate = { invalidateKey: ['companies', companyId] }

  const createMutation = useApiMutation(
    (values: any) => api.post(`/companies/${companyId}/contacts`, values),
    { successMessage: 'Thêm người liên hệ thành công', ...invalidate, onSuccess: close },
  )

  const updateMutation = useApiMutation(
    (values: any) => api.patch(`/companies/${companyId}/contacts/${editing?.id}`, values),
    { successMessage: 'Cập nhật thành công', ...invalidate, onSuccess: close },
  )

  const pending = createMutation.isPending || updateMutation.isPending

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <Button size="small" icon={<PlusOutlined />} onClick={() => openCreate()}>
          Thêm người liên hệ
        </Button>
      </div>

      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={company?.contacts}
        pagination={false}
        size="small"
        onRow={(record: any) => ({ onClick: () => openEdit(record), style: { cursor: 'pointer' } })}
        columns={[
          { title: 'Họ tên',  dataIndex: 'full_name' },
          { title: 'Chức vụ', dataIndex: 'position' },
          { title: 'SĐT',     dataIndex: 'phone' },
          { title: 'Email',   dataIndex: 'email' },
          {
            title: 'Chính',
            dataIndex: 'is_primary',
            width: 70,
            align: 'center' as const,
            render: (v: boolean) => (v ? 'Có' : ''),
          },
        ]}
      />

      <Modal
        title={editing ? 'Sửa người liên hệ' : 'Thêm người liên hệ'}
        open={open}
        onCancel={close}
        okText={editing ? 'Lưu' : 'Thêm'}
        onOk={() => form.submit()}
        confirmLoading={pending}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(v) => (editing ? updateMutation.mutate(v) : createMutation.mutate(v))}
          style={{ marginTop: 8 }}
        >
          <Form.Item name="full_name" label="Họ tên" rules={[{ required: true, message: 'Bắt buộc' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="position" label="Chức vụ">
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Số điện thoại">
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ type: 'email', message: 'Email không hợp lệ' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="is_primary" label="Liên hệ chính" valuePropName="checked">
            <Switch checkedChildren="Chính" unCheckedChildren="Phụ" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
