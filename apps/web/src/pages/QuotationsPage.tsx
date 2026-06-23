import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Table, Form, Input, Select, InputNumber, Button, Space } from 'antd'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useApiMutation } from '../hooks/useApiMutation'
import { useEntityModal } from '../hooks/useEntityModal'
import { PageHeader } from '../components/PageHeader'
import { EntityFormModal } from '../components/EntityFormModal'
import { StatusTag } from '../components/StatusTag'
import QuotationSectionItem from '../components/QuotationSectionItem'

const STATUS_COLOR: Record<string, string> = { draft: 'default', confirmed: 'blue', expired: 'gold', cancelled: 'red' }
const STATUS_OPTIONS = ['draft', 'confirmed', 'expired', 'cancelled'].map((s) => ({ value: s, label: s }))

export default function QuotationsPage() {
  const { open, form, openCreate, close } = useEntityModal()
  const navigate = useNavigate()

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string | undefined>()

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const { data, isLoading } = useQuery({
    queryKey: ['quotations', search, status],
    queryFn: async () => (await api.get('/quotations', { params: { search: search || undefined, status, limit: 100 } })).data,
  })

  const { data: companies } = useQuery({
    queryKey: ['companies', 'customer'],
    queryFn: async () => (await api.get('/companies', { params: { type: 'customer', limit: 100 } })).data,
  })

  const companyId: string | undefined = Form.useWatch('company_id', form)
  const { data: companyDetail } = useQuery({
    queryKey: ['companies', companyId],
    queryFn: async () => (await api.get(`/companies/${companyId}`)).data,
    enabled: !!companyId,
  })

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => (await api.get('/warehouses')).data,
  })

  const createMutation = useApiMutation((values: any) => api.post('/quotations', values), {
    successMessage: 'Tạo báo giá thành công (Draft)',
    invalidateKey: ['quotations'],
    onSuccess: close,
  })

  return (
    <div>
      <PageHeader title="Báo giá (Quotation)" actionLabel="+ Tạo báo giá" onAction={openCreate} />

      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder="Tìm theo mã hoặc tên dự án"
          allowClear
          style={{ width: 280 }}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <Select allowClear placeholder="Tất cả trạng thái" style={{ width: 200 }} options={STATUS_OPTIONS} onChange={setStatus} />
      </Space>

      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={data?.data}
        pagination={false}
        onRow={(record: any) => ({ onClick: () => navigate(`/quotations/${record.id}`), style: { cursor: 'pointer' } })}
        columns={[
          { title: 'Mã báo giá', dataIndex: 'code' },
          { title: 'Khách hàng', dataIndex: 'company_name' },
          { title: 'Dự án', dataIndex: 'project_name' },
          { title: 'Trạng thái', dataIndex: 'status', render: (s) => <StatusTag status={s} colorMap={STATUS_COLOR} /> },
          { title: 'Tổng tiền', dataIndex: 'grand_total' },
          { title: 'Hết hạn', dataIndex: 'expired_at', render: (d) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—') },
          { title: 'Ngày tạo', dataIndex: 'created_at', render: (d) => new Date(d).toLocaleString('vi-VN') },
        ]}
      />

      <EntityFormModal
        title="Tạo báo giá mới"
        open={open}
        onCancel={close}
        onFinish={(v) => createMutation.mutate(v)}
        confirmLoading={createMutation.isPending}
        form={form}
        width={1100}
        initialValues={{ sections: [{ line_items: [{}] }] }}
      >
        <Form.Item name="code" label="Mã báo giá" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="company_id" label="Khách hàng" rules={[{ required: true }]}>
          <Select
            options={companies?.data.map((c: any) => ({ value: c.id, label: c.name }))}
            onChange={() => form.setFieldValue('contact_id', undefined)}
          />
        </Form.Item>
        <Form.Item name="contact_id" label="Người liên hệ (tuỳ chọn)">
          <Select
            allowClear
            disabled={!companyId}
            placeholder={companyId ? undefined : 'Chọn khách hàng trước'}
            options={companyDetail?.contacts?.map((c: any) => ({ value: c.id, label: c.full_name }))}
          />
        </Form.Item>
        <Form.Item name="project_name" label="Tên dự án">
          <Input />
        </Form.Item>
        <Form.Item name="delivery_location" label="Địa điểm giao hàng">
          <Input />
        </Form.Item>
        <Form.Item
          name="warehouse_id"
          label="Kho xuất (bắt buộc nếu có dòng giữ chỗ)"
          extra="Chỉ cần khi có dòng tích Giữ chỗ kho — bắt buộc lúc Confirm"
        >
          <Select allowClear options={warehouses?.map((w: any) => ({ value: w.id, label: w.name }))} />
        </Form.Item>
        <Form.Item name="valid_days" label="Hiệu lực (số ngày)">
          <InputNumber min={1} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="discount" label="Giảm giá (số tiền)" initialValue={0}>
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="terms" label="Điều khoản" className="form-row-full">
          <Input.TextArea rows={2} />
        </Form.Item>

        <Form.List name="sections">
          {(fields, { add, remove }) => (
            <div className="form-row-full">
              {fields.map(({ key, name }) => (
                <QuotationSectionItem key={key} form={form} name={name} remove={() => remove(name)} />
              ))}
              <Button onClick={() => add({ line_items: [{}] })}>+ Thêm Section</Button>
            </div>
          )}
        </Form.List>
      </EntityFormModal>
    </div>
  )
}
