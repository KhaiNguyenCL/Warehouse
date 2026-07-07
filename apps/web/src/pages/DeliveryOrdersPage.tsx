import { Table, Form, Input, Select, Button, Tooltip } from 'antd'
import { useDeliveryOrders } from '../hooks/useDeliveryOrders'
import { PageHeader } from '../components/PageHeader'
import { EntityFormModal } from '../components/EntityFormModal'
import { StatusTag } from '../components/StatusTag'
import DeliveryLineItem from '../components/DeliveryLineItem'

const STATUS_COLOR: Record<string, string> = {
  draft: 'default',
  completed: 'green',
  cancelled: 'red',
}

export default function DeliveryOrdersPage() {
  const hook = useDeliveryOrders()

  return (
    <div>
      <PageHeader title="Phiếu xuất kho (Delivery Order)" actionLabel="+ Tạo Delivery Order" onAction={hook.openCreate} />

      <Table
        rowKey="id"
        loading={hook.isLoading}
        dataSource={hook.data?.data}
        pagination={false}
        onRow={(record: any) => ({ onClick: () => hook.navigate(`/deliveries/${record.id}`), style: { cursor: 'pointer' } })}
        columns={[
          { title: 'Mã phiếu', dataIndex: 'code' },
          { title: 'Loại xuất', dataIndex: 'export_type' },
          { title: 'Khách hàng/NCC', dataIndex: 'company_name' },
          { title: 'Kho', dataIndex: 'warehouse_name' },
          { title: 'Trạng thái', dataIndex: 'status', render: (s) => <StatusTag status={s} colorMap={STATUS_COLOR} /> },
        ]}
      />

      <EntityFormModal
        title="Tạo phiếu xuất kho"
        open={hook.open}
        onCancel={hook.closeAll}
        onFinish={(v) => hook.createMutation.mutate(v)}
        confirmLoading={hook.createMutation.isPending}
        form={hook.form}
        width={1000}
        okText="Lưu nháp"
        initialValues={{ lines: [{}] }}
        footerExtra={
          <Tooltip title="Tạo xong chuyển thẳng đến trang chi tiết để Complete">
            <Button onClick={hook.createAndGoToDetail} loading={hook.createMutation.isPending}>
              Tạo & Complete
            </Button>
          </Tooltip>
        }
      >
        <Form.Item name="export_type" label="Loại xuất" rules={[{ required: true }]}>
          <Select
            options={hook.exportTypes?.filter((t: any) => t.is_active).map((t: any) => ({ value: t.key, label: t.label }))}
            onChange={() => {
              hook.form.setFieldValue('company_id', undefined)
              hook.setQuotationId(undefined)
              hook.form.setFieldsValue({ quotation_id: undefined, lines: [{}] })
            }}
          />
        </Form.Item>
        <Form.Item name="warehouse_id" label="Kho xuất" rules={[{ required: true }]}>
          <Select options={hook.warehouses?.map((w: any) => ({ value: w.id, label: `${w.name} (${w.code})` }))} />
        </Form.Item>

        {hook.requiresCompanyType && hook.requiresCompanyType !== 'none' && (
          <Form.Item
            name="company_id"
            label={hook.requiresCompanyType === 'customer' ? 'Khách hàng' : 'NCC'}
            rules={[{ required: true }]}
          >
            <Select
              options={hook.companies?.data.map((c: any) => ({ value: c.id, label: c.name }))}
              onChange={() => hook.form.setFieldValue('contact_id', undefined)}
            />
          </Form.Item>
        )}
        {hook.requiresCompanyType && hook.requiresCompanyType !== 'none' && (
          <Form.Item name="contact_id" label="Người liên hệ (tuỳ chọn)">
            <Select
              allowClear
              disabled={!hook.companyId}
              placeholder={hook.companyId ? undefined : 'Chọn đối tác trước'}
              options={hook.companyDetail?.contacts?.map((c: any) => ({ value: c.id, label: c.full_name }))}
            />
          </Form.Item>
        )}

        {hook.requiresQuotation && (
          <Form.Item label="Xuất theo Quotation (bắt buộc)" required>
            <Select
              value={hook.quotationId}
              placeholder="Chọn báo giá đã Confirmed"
              options={hook.confirmedQuotations?.data.map((q: any) => ({ value: q.id, label: `${q.code} — ${q.company_name}` }))}
              onChange={(v) => {
                hook.setQuotationId(v)
                if (!v) hook.form.setFieldsValue({ quotation_id: undefined, lines: [{}] })
              }}
            />
          </Form.Item>
        )}
        <Form.Item name="quotation_id" hidden>
          <Input />
        </Form.Item>

        {hook.isAdjustment && (
          <Form.Item
            name="ref_document_id"
            label="Stocktake Result ID"
            rules={[{ required: true }]}
            extra="Chưa có trang Stocktake — dán UUID của stocktake_results tương ứng"
          >
            <Input />
          </Form.Item>
        )}

        <Form.Item name="reason" label="Lý do">
          <Input />
        </Form.Item>
        <Form.Item name="note" label="Ghi chú" className="form-row-full">
          <Input.TextArea rows={2} />
        </Form.Item>

        {hook.requiresQuotation ? (
          <Form.List name="lines">
            {(fields) => (
              <Table
                className="form-row-full"
                size="small"
                pagination={false}
                dataSource={fields.map((f) => ({ ...f, key: f.key }))}
                columns={[
                  {
                    title: 'SKU',
                    render: (_: any, f: any) => (
                      <Form.Item name={[f.name, 'variant_label']} noStyle>
                        <Input disabled />
                      </Form.Item>
                    ),
                  },
                  {
                    title: 'Số lượng xuất',
                    render: (_: any, f: any) => (
                      <Form.Item name={[f.name, 'quantity']} noStyle rules={[{ required: true }]}>
                        <Input type="number" />
                      </Form.Item>
                    ),
                  },
                  {
                    title: '',
                    render: (_: any, f: any) => (
                      <>
                        <Form.Item name={[f.name, 'variant_id']} hidden>
                          <Input />
                        </Form.Item>
                        <Form.Item name={[f.name, 'quotation_line_item_id']} hidden>
                          <Input />
                        </Form.Item>
                      </>
                    ),
                  },
                ]}
              />
            )}
          </Form.List>
        ) : (
          <Form.List name="lines">
            {(fields, { add, remove }) => (
              <div className="form-row-full">
                {fields.map(({ key, name }) => (
                  <DeliveryLineItem key={key} name={name} remove={() => remove(name)} />
                ))}
                <Button onClick={() => add()}>+ Thêm dòng</Button>
              </div>
            )}
          </Form.List>
        )}
      </EntityFormModal>
    </div>
  )
}
