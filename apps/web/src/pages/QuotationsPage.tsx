import { Table, Form, Input, Select, InputNumber, Button } from 'antd'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { useQuotations } from '../hooks/useQuotations'
import { PageHeader } from '../components/PageHeader'
import { TableCard, FilterChip } from '../components/ui/TableCard'
import { StatusBadge } from '../components/ui/StatusBadge'
import { EntityFormModal } from '../components/EntityFormModal'
import QuotationSectionItem from '../components/QuotationSectionItem'

const STATUS_OPTIONS = ['draft', 'confirmed', 'expired', 'cancelled'] as const

export default function QuotationsPage() {
  const hook = useQuotations()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader
        title="Báo giá"
        actions={<Button type="primary" icon={<PlusOutlined />} onClick={() => hook.openCreate()}>Tạo báo giá</Button>}
      />

      <TableCard
        toolbar={STATUS_OPTIONS.map((s) => (
          <FilterChip key={s} label={<StatusBadge status={s} />} active={hook.status === s} onClick={() => hook.setStatus(hook.status === s ? undefined : s)} />
        ))}
        actions={
          <Input
            prefix={<SearchOutlined style={{ color: 'var(--text-3)', fontSize: 13 }} />}
            placeholder="Tìm mã, tên dự án…"
            allowClear
            style={{ width: 220, height: 28, fontSize: 13 }}
            value={hook.searchInput}
            onChange={(e) => hook.setSearchInput(e.target.value)}
          />
        }
      >
        <Table
          rowKey="id"
          loading={hook.isLoading}
          dataSource={hook.data?.data}
          pagination={false}
          onRow={(record: any) => ({ onClick: () => hook.navigate(`/quotations/${record.id}`), style: { cursor: 'pointer' } })}
          columns={[
            { title: 'STT', width: 52, align: 'center' as const, render: (_: any, __: any, i: number) => i + 1 },
            { title: 'Mã báo giá', dataIndex: 'code' },
            { title: 'Khách hàng', dataIndex: 'company_name' },
            { title: 'Dự án', dataIndex: 'project_name' },
            { title: 'Trạng thái', dataIndex: 'status', render: (s: string) => <StatusBadge status={s} /> },
            { title: 'Tổng tiền', dataIndex: 'grand_total' },
            { title: 'Hết hạn', dataIndex: 'expired_at', render: (d: string) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—') },
            { title: 'Ngày tạo', dataIndex: 'created_at', render: (d: string) => new Date(d).toLocaleString('vi-VN') },
          ]}
        />
      </TableCard>

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
