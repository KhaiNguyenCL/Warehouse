import { Table, Form, Input, Select, InputNumber, DatePicker, Button, Tooltip } from 'antd'
import { useReceipts } from '../hooks/useReceipts'
import { PageHeader } from '../components/PageHeader'
import { EntityFormModal } from '../components/EntityFormModal'
import { StatusTag } from '../components/StatusTag'

const STATUS_COLOR: Record<string, string> = {
  draft: 'default',
  completed: 'green',
  cancelled: 'red',
}

export default function ReceiptsPage() {
  const hook = useReceipts()

  return (
    <div>
      <PageHeader title="Phiếu nhập kho (Receipt)" actionLabel="+ Tạo Receipt" onAction={hook.openCreate} />

      <Table
        rowKey="id"
        loading={hook.isLoading}
        dataSource={hook.data?.data}
        pagination={false}
        onRow={(record: any) => ({ onClick: () => hook.navigate(`/receipts/${record.id}`), style: { cursor: 'pointer' } })}
        columns={[
          { title: 'Mã phiếu', dataIndex: 'code' },
          { title: 'Loại nhập', dataIndex: 'import_type' },
          { title: 'Kho', dataIndex: 'warehouse_name' },
          { title: 'Trạng thái', dataIndex: 'status', render: (s) => <StatusTag status={s} colorMap={STATUS_COLOR} /> },
        ]}
      />

      <EntityFormModal
        title="Tạo phiếu nhập kho"
        open={hook.open}
        onCancel={hook.closeAll}
        onFinish={(v) => hook.createMutation.mutate(v)}
        confirmLoading={hook.createMutation.isPending}
        form={hook.form}
        width={800}
        okText="Lưu nháp"
        initialValues={{ import_type: 'purchase', lines: [] }}
        footerExtra={
          <Tooltip title="Tạo xong chuyển thẳng đến trang chi tiết để Complete">
            <Button onClick={hook.createAndGoToDetail} loading={hook.createMutation.isPending}>
              Tạo & Complete
            </Button>
          </Tooltip>
        }
      >
        <Form.Item name="import_type" label="Loại nhập" rules={[{ required: true }]}>
          <Select options={hook.importTypes?.map((t: any) => ({ value: t.key, label: t.label }))} />
        </Form.Item>
        <Form.Item name="warehouse_id" label="Kho nhập" rules={[{ required: true }]}>
          <Select options={hook.warehouses?.map((w: any) => ({ value: w.id, label: `${w.name} (${w.code})` }))} />
        </Form.Item>
        <Form.Item label="Nhận hàng theo Purchase Order (tuỳ chọn)">
          <Select
            allowClear
            value={hook.poId}
            placeholder="Chọn PO đã Confirmed để tự điền dòng hàng"
            options={hook.confirmedPOs?.data.map((p: any) => ({ value: p.id, label: `${p.code} — ${p.company_name}` }))}
            onChange={(v) => {
              hook.setPoId(v)
              if (!v) hook.form.setFieldsValue({ po_id: undefined, lines: [] })
            }}
          />
        </Form.Item>
        <Form.Item name="po_id" hidden>
          <Input />
        </Form.Item>
        <Form.Item name="company_id" hidden>
          <Input />
        </Form.Item>

        <Form.List name="lines">
          {(fields, { add, remove }) => (
            <>
              <Table
                className="form-row-full"
                size="small"
                pagination={false}
                dataSource={fields.map((f) => ({ ...f, key: f.key }))}
                locale={{ emptyText: 'Chưa có dòng hàng' }}
                columns={[
                  {
                    title: 'SKU',
                    width: hook.poId ? undefined : 220,
                    render: (_: any, f: any) =>
                      hook.poId ? (
                        <Form.Item name={[f.name, 'variant_label']} noStyle>
                          <Input disabled />
                        </Form.Item>
                      ) : (
                        <Form.Item name={[f.name, 'variant_id']} noStyle rules={[{ required: true, message: 'Chọn SKU' }]}>
                          <Select
                            showSearch
                            placeholder="Tìm SKU / tên sản phẩm"
                            style={{ width: 220 }}
                            filterOption={false}
                            onSearch={hook.setVariantSearch}
                            options={hook.variantOptions?.map((v: any) => ({
                              value: v.id,
                              label: `${v.sku} — ${v.name}`,
                            }))}
                          />
                        </Form.Item>
                      ),
                  },
                  {
                    title: 'Số lượng nhận',
                    render: (_: any, f: any) => (
                      <Form.Item name={[f.name, 'quantity']} noStyle rules={[{ required: true }]}>
                        <InputNumber min={1} />
                      </Form.Item>
                    ),
                  },
                  {
                    title: 'Giá nhập',
                    render: (_: any, f: any) => (
                      <Form.Item name={[f.name, 'cost_price']} noStyle rules={[{ required: true }]}>
                        <InputNumber min={0} style={{ width: 120 }} />
                      </Form.Item>
                    ),
                  },
                  {
                    title: 'BH hãng (T)',
                    render: (_: any, f: any) => (
                      <Form.Item name={[f.name, 'manufacturer_warranty_months']} noStyle>
                        <InputNumber min={0} style={{ width: 70 }} />
                      </Form.Item>
                    ),
                  },
                  {
                    title: 'Ngày BH hãng',
                    render: (_: any, f: any) => (
                      <Form.Item name={[f.name, 'manufacturer_warranty_start']} noStyle>
                        <DatePicker style={{ width: 130 }} placeholder="Ngày nhập kho" allowClear />
                      </Form.Item>
                    ),
                  },
                  {
                    title: 'BH cty (T)',
                    render: (_: any, f: any) => (
                      <Form.Item name={[f.name, 'customer_warranty_months']} noStyle>
                        <InputNumber min={0} style={{ width: 70 }} />
                      </Form.Item>
                    ),
                  },
                  {
                    title: '',
                    render: (_: any, f: any) => (
                      <>
                        {hook.poId && (
                          <Form.Item name={[f.name, 'variant_id']} hidden><Input /></Form.Item>
                        )}
                        <Form.Item name={[f.name, 'po_line_id']} hidden><Input /></Form.Item>
                        {!hook.poId && (
                          <Button size="small" danger onClick={() => remove(f.name)}>Xóa</Button>
                        )}
                      </>
                    ),
                  },
                ]}
              />
              {!hook.poId && (
                <Button
                  className="form-row-full"
                  style={{ marginTop: 8 }}
                  onClick={() => add({ quantity: 1 })}
                >
                  + Thêm dòng
                </Button>
              )}
            </>
          )}
        </Form.List>
      </EntityFormModal>
    </div>
  )
}
