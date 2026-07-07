import { Table, Form, Input, Select, InputNumber, Button, Space } from 'antd'
import { useQuotations } from '../hooks/useQuotations'
import { PageHeader } from '../components/PageHeader'
import { EntityFormModal } from '../components/EntityFormModal'
import { StatusTag } from '../components/StatusTag'
import QuotationSectionItem from '../components/QuotationSectionItem'

const STATUS_COLOR: Record<string, string> = { draft: 'default', confirmed: 'blue', expired: 'gold', cancelled: 'red' }
const STATUS_OPTIONS = ['draft', 'confirmed', 'expired', 'cancelled'].map((s) => ({ value: s, label: s }))

export default function QuotationsPage() {
  const hook = useQuotations()

  return (
    <div>
      <PageHeader title="Báo giá (Quotation)" actionLabel="+ Tạo báo giá" onAction={hook.openCreate} />

      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder="Tìm theo mã hoặc tên dự án"
          allowClear
          style={{ width: 280 }}
          value={hook.searchInput}
          onChange={(e) => hook.setSearchInput(e.target.value)}
        />
        <Select allowClear placeholder="Tất cả trạng thái" style={{ width: 200 }} options={STATUS_OPTIONS} onChange={hook.setStatus} />
      </Space>

      <Table
        rowKey="id"
        loading={hook.isLoading}
        dataSource={hook.data?.data}
        pagination={false}
        onRow={(record: any) => ({ onClick: () => hook.navigate(`/quotations/${record.id}`), style: { cursor: 'pointer' } })}
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
        open={hook.open}
        onCancel={hook.close}
        onFinish={(v) => hook.createMutation.mutate(v)}
        confirmLoading={hook.createMutation.isPending}
        form={hook.form}
        width={1100}
        initialValues={{ sections: [{ line_items: [{}] }] }}
      >
        <Form.Item name="company_id" label="Khách hàng" rules={[{ required: true }]}>
          <Select
            options={hook.companies?.data.map((c: any) => ({ value: c.id, label: c.name }))}
            onChange={() => hook.form.setFieldValue('contact_id', undefined)}
          />
        </Form.Item>
        <Form.Item name="contact_id" label="Người liên hệ (tuỳ chọn)">
          <Select
            allowClear
            disabled={!hook.companyId}
            placeholder={hook.companyId ? undefined : 'Chọn khách hàng trước'}
            options={hook.companyDetail?.contacts?.map((c: any) => ({ value: c.id, label: c.full_name }))}
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
          <Select allowClear options={hook.warehouses?.map((w: any) => ({ value: w.id, label: w.name }))} />
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
                <QuotationSectionItem key={key} form={hook.form} name={name} remove={() => remove(name)} />
              ))}
              <Button onClick={() => add({ line_items: [{}] })}>+ Thêm Section</Button>
            </div>
          )}
        </Form.List>
      </EntityFormModal>
    </div>
  )
}
