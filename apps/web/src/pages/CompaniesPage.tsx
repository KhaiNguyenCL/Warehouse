import { Table, Input, Select, Tag, Form, Button, Modal, Space, Popconfirm } from 'antd'
import { useCompanies } from '../hooks/useCompanies'
import { PageHeader } from '../components/PageHeader'
import { EntityFormModal } from '../components/EntityFormModal'
import CustomFieldsPanel from '../components/CustomFieldsPanel'
import ContactsPanel from '../components/ContactsPanel'
import SupplierProductsPanel from '../components/SupplierProductsPanel'

export default function CompaniesPage() {
  const hook = useCompanies()

  return (
    <div>
      <PageHeader
        title="Đối tác (Khách hàng / NCC)"
        actionLabel="+ Tạo mới"
        onAction={hook.openCreate}
        actions={<Button onClick={() => hook.setImportOpen(true)}>Import từ Bitrix</Button>}
      />

      <Table
        rowKey="id"
        loading={hook.isLoading}
        dataSource={hook.data?.data}
        pagination={false}
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
          {
            title: '',
            width: 140,
            render: (_: any, record: any) => (
              <Space onClick={(e) => e.stopPropagation()}>
                <Button size="small" onClick={() => hook.openEdit(record)}>Sửa</Button>
                <Popconfirm title="Xoá công ty này?" onConfirm={() => hook.deleteMutation.mutate(record.id)} okText="Xoá" cancelText="Không">
                  <Button size="small" danger loading={hook.deleteMutation.isPending}>Xoá</Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <EntityFormModal
        title={hook.editing ? `Sửa công ty "${hook.editing.name}"` : 'Tạo công ty mới'}
        okText={hook.editing ? 'Lưu thông tin công ty' : 'Tạo công ty'}
        open={hook.open}
        onCancel={hook.close}
        onFinish={(v) => (hook.editing ? hook.updateMutation.mutate(v) : hook.createMutation.mutate(v))}
        confirmLoading={hook.createMutation.isPending || hook.updateMutation.isPending}
        form={hook.form}
        extra={
          hook.editing && (
            <>
              <ContactsPanel companyId={hook.editing.id} />
              {hook.editing.types?.includes('supplier') && (
                <SupplierProductsPanel companyId={hook.editing.id} />
              )}
              <CustomFieldsPanel objectType="company" objectId={hook.editing.id} />
            </>
          )
        }
      >
        <Form.Item name="code" label="Mã" extra="Để trống để tự động sinh CTY-XXXX">
          <Input placeholder="CTY-0001" />
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

      <Modal
        title="Import công ty từ Bitrix"
        open={hook.importOpen}
        onCancel={() => hook.setImportOpen(false)}
        onOk={() => hook.importMutation.mutate()}
        okButtonProps={{ disabled: !hook.bitrixCompanyId, loading: hook.importMutation.isPending }}
      >
        <Form layout="vertical">
          <Form.Item label="Bitrix Company ID" required>
            <Input
              value={hook.bitrixCompanyId}
              onChange={(e) => hook.setBitrixCompanyId(e.target.value)}
              placeholder="VD: 123"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
