import { useQuery } from '@tanstack/react-query'
import { Table, Button, Form, Input, Select } from 'antd'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useApiMutation } from '../hooks/useApiMutation'
import { useEntityModal } from '../hooks/useEntityModal'
import { PageHeader } from '../components/PageHeader'
import { EntityFormModal } from '../components/EntityFormModal'
import { StatusTag } from '../components/StatusTag'
import POLineItem from '../components/POLineItem'

const STATUS_COLOR: Record<string, string> = { draft: 'default', confirmed: 'blue', cancelled: 'red' }

export default function PurchaseOrdersPage() {
  const { open, form, openCreate, close } = useEntityModal()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: async () => (await api.get('/purchase-orders')).data,
  })

  const { data: companies } = useQuery({
    queryKey: ['companies', 'all'],
    queryFn: async () => (await api.get('/companies', { params: { type: 'supplier', limit: 100 } })).data,
  })

  // Contact phụ thuộc company đang chọn — company.contacts trả kèm trong GET /companies/:id.
  const companyId: string | undefined = Form.useWatch('company_id', form)
  const { data: companyDetail } = useQuery({
    queryKey: ['companies', companyId],
    queryFn: async () => (await api.get(`/companies/${companyId}`)).data,
    enabled: !!companyId,
  })

  const createMutation = useApiMutation((values: any) => api.post('/purchase-orders', values), {
    successMessage: 'Tạo PO thành công (Draft)',
    invalidateKey: ['purchase-orders'],
    onSuccess: close,
  })

  return (
    <div>
      <PageHeader title="Purchase Order" actionLabel="+ Tạo PO" onAction={openCreate} />

      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={data?.data}
        pagination={false}
        onRow={(record: any) => ({ onClick: () => navigate(`/purchase-orders/${record.id}`), style: { cursor: 'pointer' } })}
        columns={[
          { title: 'Mã PO', dataIndex: 'code' },
          { title: 'NCC', dataIndex: 'company_name' },
          { title: 'Trạng thái', dataIndex: 'status', render: (s) => <StatusTag status={s} colorMap={STATUS_COLOR} /> },
          { title: 'Ngày tạo', dataIndex: 'created_at', render: (d) => new Date(d).toLocaleString('vi-VN') },
        ]}
      />

      <EntityFormModal
        title="Tạo Purchase Order mới"
        open={open}
        onCancel={close}
        onFinish={(v) => createMutation.mutate(v)}
        confirmLoading={createMutation.isPending}
        form={form}
        width={800}
        initialValues={{ lines: [{}] }}
      >
        <Form.Item name="code" label="Mã PO" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="company_id" label="NCC" rules={[{ required: true }]}>
          <Select
            options={companies?.data.map((c: any) => ({ value: c.id, label: c.name }))}
            onChange={() => form.setFieldValue('contact_id', undefined)}
          />
        </Form.Item>
        <Form.Item name="contact_id" label="Người liên hệ (tuỳ chọn)">
          <Select
            allowClear
            disabled={!companyId}
            placeholder={companyId ? undefined : 'Chọn NCC trước'}
            options={companyDetail?.contacts?.map((c: any) => ({ value: c.id, label: c.full_name }))}
          />
        </Form.Item>
        <Form.Item name="bitrix_deal_id" label="Bitrix Deal ID (tuỳ chọn)">
          <Input />
        </Form.Item>

        <Form.List name="lines">
          {(fields, { add, remove }) => (
            <div className="form-row-full">
              {fields.map(({ key, name }) => (
                <POLineItem key={key} form={form} name={name} remove={() => remove(name)} />
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
