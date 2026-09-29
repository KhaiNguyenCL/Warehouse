import { Form, Input, Select, Tooltip, DatePicker } from 'antd'
import { ArrowLeft } from 'lucide-react'
import { useDeliveryOrderCreate } from '../hooks/useDeliveryOrderCreate'
import { Button } from '@/components/ui/button'
import { usePageHeader } from '@/layout/PageHeaderSlot'
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

  usePageHeader(
    <div className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-2">
        <Button variant="ghost" size="icon-sm" onClick={() => hook.navigate('/deliveries')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="flex min-w-0 items-baseline gap-2 truncate text-sm font-semibold tracking-tight">
          <button
            onClick={() => hook.navigate('/deliveries')}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Phiếu xuất kho
          </button>
          <span className="text-muted-foreground">/</span>
          <span className="truncate text-foreground">Tạo mới</span>
        </h1>
      </div>

      <div className="flex flex-shrink-0 items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => hook.navigate('/deliveries')}>Huỷ</Button>
        <Tooltip title="Tạo xong chuyển thẳng đến trang để Complete">
          <Button size="sm" variant="outline" onClick={hook.submitAndComplete} disabled={hook.createMutation.isPending}>
            Tạo & Complete
          </Button>
        </Tooltip>
        <Button size="sm" onClick={hook.submit} disabled={hook.createMutation.isPending}>
          Lưu nháp
        </Button>
      </div>
    </div>,
  )

  return (
    <div className="theme-2a" style={{ padding: '10px 20px 40px', display: 'flex', flexDirection: 'column', gap: 24 }}>

      <Form form={hook.form} layout="vertical" onFinish={(v) => hook.createMutation.mutate(v)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <SectionCard title="Thông tin chung">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0 24px' }}>
              <Form.Item name="export_type" label="Loại xuất" style={{ gridColumn: 'span 2' }} rules={[{ required: true, message: 'Chọn loại xuất' }]}>
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

              <Form.Item name="warehouse_id" label="Kho xuất" style={{ gridColumn: 'span 2' }} rules={[{ required: true, message: 'Chọn kho xuất' }]}>
                <Select
                  placeholder="Chọn kho"
                  options={hook.warehouses?.map((w: any) => ({ value: w.id, label: `${w.name} (${w.code})` }))}
                />
              </Form.Item>

              <Form.Item name="reason" label="Lý do" style={{ gridColumn: 'span 2' }}>
                <Input placeholder="Lý do xuất kho" />
              </Form.Item>

              {hook.requiresCompanyType && hook.requiresCompanyType !== 'none' && (
                <Form.Item
                  name="company_id"
                  label={hook.requiresCompanyType === 'customer' ? 'Khách hàng' : 'NCC'}
                  style={{ gridColumn: 'span 3' }}
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
                <Form.Item name="contact_id" label="Người liên hệ (tuỳ chọn)" style={{ gridColumn: 'span 3' }}>
                  <Select
                    allowClear
                    disabled={!hook.companyId}
                    placeholder={hook.companyId ? 'Chọn người liên hệ' : 'Chọn đối tác trước'}
                    options={hook.companyDetail?.contacts?.map((c: any) => ({ value: c.id, label: c.full_name }))}
                  />
                </Form.Item>
              )}

              {hook.requiresQuotation && (
                <Form.Item label="Báo giá" required style={{ gridColumn: 'span 4' }}>
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
                <Form.Item name="ref_document_id" label="Stocktake Result ID" style={{ gridColumn: 'span 6' }} rules={[{ required: true }]}
                  extra="Dán UUID của stocktake_results tương ứng">
                  <Input />
                </Form.Item>
              )}

              <Form.Item name="note" label="Ghi chú" style={{ gridColumn: 'span 6' }}>
                <Input.TextArea rows={2} />
              </Form.Item>
            </div>
          </SectionCard>

          <SectionCard title="Danh sách sản phẩm">
            {hook.requiresQuotation ? (
              <Form.List name="lines">
                {(fields) => (
                  <div className="overflow-x-auto">
                    <table className="kv-table kv-lines" style={{ tableLayout: 'fixed' }}>
                      <colgroup>
                        <col style={{ width: 30 }} />
                        <col />
                        <col style={{ width: 140 }} />
                        <col style={{ width: 160 }} />
                      </colgroup>
                      <thead>
                        <tr>
                          <th></th>
                          <th className="text-left">SKU / Sản phẩm</th>
                          <th className="num">Số lượng xuất</th>
                          <th className="text-left">Ngày bắt đầu BH</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fields.map((f) => (
                          <tr key={f.key}>
                            <td className="kv-line-no">{f.name + 1}</td>
                            <td>
                              <Form.Item name={[f.name, 'variant_label']} noStyle><Input disabled style={{ width: '100%' }} /></Form.Item>
                              <Form.Item name={[f.name, 'variant_id']} hidden><Input /></Form.Item>
                              <Form.Item name={[f.name, 'quotation_line_item_id']} hidden><Input /></Form.Item>
                            </td>
                            <td>
                              <Form.Item name={[f.name, 'quantity']} noStyle rules={[{ required: true }]}>
                                <Input type="number" style={{ width: '100%' }} />
                              </Form.Item>
                            </td>
                            <td>
                              <Form.Item name={[f.name, 'customer_warranty_start']} noStyle>
                                <DatePicker style={{ width: '100%' }} placeholder="Tuỳ chọn" format="DD/MM/YYYY" />
                              </Form.Item>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Form.List>
            ) : (
              <Form.Item noStyle shouldUpdate={(p, c) => p.export_type !== c.export_type}>
                {({ getFieldValue }) => (
              <Form.List name="lines">
                {(fields, { add, remove }) => (
                  <div className="overflow-x-auto">
                    <table className="kv-table kv-lines" style={{ tableLayout: 'fixed' }}>
                      <colgroup>
                        <col style={{ width: 30 }} />
                        <col />
                        <col style={{ width: 140 }} />
                        <col style={{ width: 110 }} />
                        <col style={{ width: 160 }} />
                        <col />
                        <col style={{ width: 36 }} />
                      </colgroup>
                      <thead>
                        <tr>
                          <th></th>
                          <th className="text-left">Mã hàng / SKU</th>
                          <th className="text-left">Tồn kho</th>
                          <th className="num">Số lượng</th>
                          <th className="text-left">Ngày BĐ bảo hành</th>
                          <th className="text-left">Ghi chú</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {fields.length === 0 && (
                          <tr><td colSpan={7} className="kv-muted" style={{ textAlign: 'center', padding: '20px 0' }}>Chưa có dòng hàng</td></tr>
                        )}
                        {fields.map(({ key, name }) => (
                          <DeliveryLineItem key={key} name={name} remove={() => remove(name)} exportType={getFieldValue('export_type')} />
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="kv-addline">
                          <td></td>
                          <td colSpan={6}>
                            <button type="button" className="kv-btn" onClick={() => add()}>+ Thêm dòng</button>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
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
