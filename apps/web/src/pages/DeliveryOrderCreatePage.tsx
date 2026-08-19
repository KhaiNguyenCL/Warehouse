import { Form, Input, Select, Button, Table, Tooltip } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useDeliveryOrderCreate } from '../hooks/useDeliveryOrderCreate'
import { PageHeader } from '../components/ui/PageHeader'
import DeliveryLineItem from '../components/DeliveryLineItem'

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>{title}</span>
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  )
}

export default function DeliveryOrderCreatePage() {
  const hook = useDeliveryOrderCreate()

  return (
    <div style={{ padding: '10px 20px 40px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <PageHeader
        title="Tạo phiếu xuất kho"
        meta={
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => hook.navigate('/deliveries')} style={{ padding: '0 4px' }}>
            Phiếu xuất kho
          </Button>
        }
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button onClick={() => hook.navigate('/deliveries')}>Huỷ</Button>
            <Tooltip title="Tạo xong chuyển thẳng đến trang để Complete">
              <Button onClick={hook.submitAndComplete} loading={hook.createMutation.isPending}>
                Tạo & Complete
              </Button>
            </Tooltip>
            <Button type="primary" onClick={hook.submit} loading={hook.createMutation.isPending}>
              Lưu nháp
            </Button>
          </div>
        }
      />

      <Form form={hook.form} layout="vertical" onFinish={(v) => hook.createMutation.mutate(v)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <SectionCard title="Thông tin chung">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 24px' }}>
              <Form.Item name="export_type" label="Loại xuất" rules={[{ required: true, message: 'Chọn loại xuất' }]}>
                <Select
                  placeholder="Chọn loại xuất"
                  options={hook.exportTypes?.filter((t: any) => t.is_active).map((t: any) => ({ value: t.key, label: t.label }))}
                  onChange={() => {
                    hook.form.setFieldValue('company_id', undefined)
                    hook.setQuotationId(undefined)
                    hook.form.setFieldsValue({ quotation_id: undefined, lines: [{}] })
                  }}
                />
              </Form.Item>

              <Form.Item name="warehouse_id" label="Kho xuất" rules={[{ required: true, message: 'Chọn kho xuất' }]}>
                <Select
                  placeholder="Chọn kho"
                  options={hook.warehouses?.map((w: any) => ({ value: w.id, label: `${w.name} (${w.code})` }))}
                />
              </Form.Item>

              {hook.requiresCompanyType && hook.requiresCompanyType !== 'none' && (
                <Form.Item
                  name="company_id"
                  label={hook.requiresCompanyType === 'customer' ? 'Khách hàng' : 'NCC'}
                  rules={[{ required: true, message: 'Chọn đối tác' }]}
                >
                  <Select
                    showSearch
                    filterOption={(input, opt) => String(opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                    placeholder="Chọn đối tác"
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
                    placeholder={hook.companyId ? 'Chọn người liên hệ' : 'Chọn đối tác trước'}
                    options={hook.companyDetail?.contacts?.map((c: any) => ({ value: c.id, label: c.full_name }))}
                  />
                </Form.Item>
              )}

              {hook.requiresQuotation && (
                <Form.Item label="Báo giá" required style={{ gridColumn: 'span 2' }}>
                  <Select
                    value={hook.quotationId}
                    placeholder="Chọn báo giá đã Confirmed"
                    showSearch
                    filterOption={(input, opt) => String(opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                    options={hook.confirmedQuotations?.data.map((q: any) => ({ value: q.id, label: `${q.code} — ${q.company_name}` }))}
                    onChange={(v) => {
                      hook.setQuotationId(v)
                      if (!v) hook.form.setFieldsValue({ quotation_id: undefined, lines: [{}] })
                    }}
                  />
                </Form.Item>
              )}
              <Form.Item name="quotation_id" hidden><Input /></Form.Item>

              {hook.isAdjustment && (
                <Form.Item name="ref_document_id" label="Stocktake Result ID" rules={[{ required: true }]}
                  extra="Dán UUID của stocktake_results tương ứng">
                  <Input />
                </Form.Item>
              )}

              <Form.Item name="reason" label="Lý do">
                <Input placeholder="Lý do xuất kho" />
              </Form.Item>

              <Form.Item name="note" label="Ghi chú" style={{ gridColumn: 'span 2' }}>
                <Input.TextArea rows={2} />
              </Form.Item>
            </div>
          </SectionCard>

          <SectionCard title="Danh sách sản phẩm">
            {hook.requiresQuotation ? (
              <Form.List name="lines">
                {(fields) => (
                  <Table
                    size="small"
                    pagination={false}
                    dataSource={fields.map((f) => ({ ...f, key: f.key }))}
                    columns={[
                      {
                        title: 'SKU / Sản phẩm', render: (_: any, f: any) => (
                          <Form.Item name={[f.name, 'variant_label']} noStyle><Input disabled /></Form.Item>
                        ),
                      },
                      {
                        title: 'Số lượng xuất', width: 140, render: (_: any, f: any) => (
                          <Form.Item name={[f.name, 'quantity']} noStyle rules={[{ required: true }]}>
                            <Input type="number" style={{ width: 100 }} />
                          </Form.Item>
                        ),
                      },
                      {
                        title: '', width: 1, render: (_: any, f: any) => (
                          <>
                            <Form.Item name={[f.name, 'variant_id']} hidden><Input /></Form.Item>
                            <Form.Item name={[f.name, 'quotation_line_item_id']} hidden><Input /></Form.Item>
                          </>
                        ),
                      },
                    ]}
                  />
                )}
              </Form.List>
            ) : (
              <Form.Item noStyle shouldUpdate={(p, c) => p.export_type !== c.export_type}>
                {({ getFieldValue }) => (
              <Form.List name="lines">
                {(fields, { add, remove }) => (
                  <div>
                    {fields.map(({ key, name }) => (
                      <DeliveryLineItem key={key} name={name} remove={() => remove(name)} exportType={getFieldValue('export_type')} />
                    ))}
                    <Button onClick={() => add()} style={{ marginTop: 4 }}>+ Thêm dòng</Button>
                  </div>
                )}
              </Form.List>
                )}
              </Form.Item>
            )}
          </SectionCard>
        </div>
      </Form>
    </div>
  )
}
