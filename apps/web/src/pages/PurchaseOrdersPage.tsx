import { Table, Button, Form, Input, Select } from 'antd'
import { usePurchaseOrders } from '../hooks/usePurchaseOrders'
import { PageHeader } from '../components/PageHeader'
import { EntityFormModal } from '../components/EntityFormModal'
import { StatusTag } from '../components/StatusTag'
import POLineItem from '../components/POLineItem'

const STATUS_COLOR: Record<string, string> = { draft: 'default', confirmed: 'blue', cancelled: 'red' }

export default function PurchaseOrdersPage() {
  const hook = usePurchaseOrders()

  return (
    <div>
      <PageHeader title="Purchase Order" actionLabel="+ Tạo PO" onAction={hook.openCreate} />

      <Table
        rowKey="id"
        loading={hook.isLoading}
        dataSource={hook.data?.data}
        pagination={false}
        onRow={(record: any) => ({ onClick: () => hook.navigate(`/purchase-orders/${record.id}`), style: { cursor: 'pointer' } })}
        columns={[
          { title: 'Mã PO', dataIndex: 'code' },
          { title: 'NCC', dataIndex: 'company_name' },
          { title: 'Trạng thái', dataIndex: 'status', render: (s) => <StatusTag status={s} colorMap={STATUS_COLOR} /> },
          { title: 'Ngày tạo', dataIndex: 'created_at', render: (d) => new Date(d).toLocaleString('vi-VN') },
        ]}
      />

      <EntityFormModal
        title="Tạo Purchase Order mới"
        open={hook.open}
        onCancel={hook.close}
        onFinish={(v) => hook.createMutation.mutate(v)}
        confirmLoading={hook.createMutation.isPending}
        form={hook.form}
        width={800}
        initialValues={{ lines: [{}] }}
      >
        <Form.Item name="company_id" label="NCC" rules={[{ required: true }]}>
          <Select
            options={hook.companies?.data.map((c: any) => ({ value: c.id, label: c.name }))}
            onChange={() => hook.form.setFieldValue('contact_id', undefined)}
          />
        </Form.Item>
        <Form.Item name="contact_id" label="Người liên hệ (tuỳ chọn)">
          <Select
            allowClear
            disabled={!hook.companyId}
            placeholder={hook.companyId ? undefined : 'Chọn NCC trước'}
            options={hook.companyDetail?.contacts?.map((c: any) => ({ value: c.id, label: c.full_name }))}
          />
        </Form.Item>
        <Form.Item name="bitrix_deal_id" label="Bitrix Deal ID (tuỳ chọn)">
          <Input />
        </Form.Item>

        <Form.List name="lines">
          {(fields, { add, remove }) => (
            <div className="form-row-full">
              {fields.map(({ key, name }) => (
                <POLineItem key={key} form={hook.form} name={name} remove={() => remove(name)} />
              ))}
              <Button onClick={() => add()} style={{ marginBottom: 16 }}>
                + Thêm dòng
              </Button>
            </div>
          )}
        </Form.List>

        <Form.Item name="note" label="Ghi chú">
          <Input.TextArea />
        </Form.Item>
      </EntityFormModal>
    </div>
  )
}
