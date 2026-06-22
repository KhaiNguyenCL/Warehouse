import { useQuery } from '@tanstack/react-query'
import { Table, Input, Select, Tag, Form } from 'antd'
import { api } from '../lib/api'
import { useApiMutation } from '../hooks/useApiMutation'
import { useEntityModal } from '../hooks/useEntityModal'
import { PageHeader } from '../components/PageHeader'
import { EntityFormModal } from '../components/EntityFormModal'
import CustomFieldsPanel from '../components/CustomFieldsPanel'

export default function CompaniesPage() {
  const { open, editing, form, openCreate, openEdit, close } = useEntityModal()

  const { data, isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => (await api.get('/companies')).data,
  })

  const createMutation = useApiMutation((values: any) => api.post('/companies', values), {
    successMessage: 'Tạo company thành công',
    invalidateKey: ['companies'],
    onSuccess: close,
  })

  const updateMutation = useApiMutation((values: any) => api.patch(`/companies/${editing.id}`, values), {
    successMessage: 'Cập nhật thành công',
    invalidateKey: ['companies'],
    onSuccess: close,
  })

  return (
    <div>
      <PageHeader title="Đối tác (Khách hàng / NCC)" actionLabel="+ Tạo mới" onAction={openCreate} />

      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={data?.data}
        pagination={false}
        onRow={(record: any) => ({ onClick: () => openEdit(record), style: { cursor: 'pointer' } })}
        columns={[
          { title: 'Mã', dataIndex: 'code' },
          { title: 'Tên', dataIndex: 'name' },
          {
            title: 'Loại',
            dataIndex: 'types',
            render: (types: string[]) =>
              types?.map((t) => <Tag key={t}>{t === 'supplier' ? 'NCC' : 'Khách hàng'}</Tag>),
          },
          { title: 'SĐT', dataIndex: 'phone' },
        ]}
      />

      <EntityFormModal
        title={editing ? `Sửa công ty "${editing.name}"` : 'Tạo công ty mới'}
        open={open}
        onCancel={close}
        onFinish={(v) => (editing ? updateMutation.mutate(v) : createMutation.mutate(v))}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        form={form}
        extra={editing && <CustomFieldsPanel objectType="company" objectId={editing.id} />}
      >
        <Form.Item name="code" label="Mã" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="name" label="Tên" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="types" label="Loại" rules={[{ required: true }]}>
          <Select
            mode="multiple"
            options={[
              { value: 'supplier', label: 'NCC' },
              { value: 'customer', label: 'Khách hàng' },
            ]}
          />
        </Form.Item>
        <Form.Item name="phone" label="SĐT">
          <Input />
        </Form.Item>
        <Form.Item name="email" label="Email" rules={[{ type: 'email' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="tax_code" label="Mã số thuế">
          <Input />
        </Form.Item>
        <Form.Item name="country" label="Quốc gia (mã 2 ký tự)" initialValue="VN">
          <Input maxLength={2} style={{ textTransform: 'uppercase' }} />
        </Form.Item>
        <Form.Item name="address" label="Địa chỉ">
          <Input />
        </Form.Item>
        <Form.Item name="bank_account" label="Số tài khoản">
          <Input />
        </Form.Item>
        <Form.Item name="bank_name" label="Ngân hàng">
          <Input />
        </Form.Item>
        <Form.Item name="bitrix_company_id" label="Bitrix Company ID">
          <Input />
        </Form.Item>
        <Form.Item name="note" label="Ghi chú">
          <Input.TextArea />
        </Form.Item>
      </EntityFormModal>
    </div>
  )
}
