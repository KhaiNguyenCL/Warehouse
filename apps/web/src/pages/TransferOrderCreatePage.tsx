import { Form, Input, Select, Tooltip } from 'antd'
import { ArrowLeft } from 'lucide-react'
import { useTransferOrderCreate } from '../hooks/useTransferOrderCreate'
import { Button } from '@/components/ui/button'
import { usePageHeader } from '@/layout/PageHeaderSlot'
import DeliveryLineItem from '../components/DeliveryLineItem'

const TRANSFER_TYPES = [
  { value: 'transfer',    label: 'Chuyển kho thông thường' },
  { value: 'warranty_in', label: 'Nhận lại sau bảo hành' },
  { value: 'demo_in',     label: 'Nhận lại sau demo' },
  { value: 'qc_pass',     label: 'Hàng qua QC đạt' },
  { value: 'sn_ready',    label: 'Đã nhập SN xong' },
]

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

export default function TransferOrderCreatePage() {
  const hook = useTransferOrderCreate()
  const headerFromWh: string | undefined = Form.useWatch('from_warehouse_id', hook.form)

  usePageHeader(
    <div className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-2">
        <Button variant="ghost" size="icon-sm" onClick={() => hook.navigate('/transfers')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="flex min-w-0 items-baseline gap-2 truncate text-sm font-semibold tracking-tight">
          <button
            onClick={() => hook.navigate('/transfers')}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Phiếu chuyển kho
          </button>
          <span className="text-muted-foreground">/</span>
          <span className="truncate text-foreground">Tạo mới</span>
        </h1>
      </div>

      <div className="flex flex-shrink-0 items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => hook.navigate('/transfers')}>Huỷ</Button>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 24px' }}>
              <Form.Item name="transfer_type" label="Loại chuyển" rules={[{ required: true, message: 'Chọn loại chuyển' }]}>
                <Select
                  placeholder="Chọn loại chuyển"
                  options={TRANSFER_TYPES}
                  onChange={() => hook.form.setFieldValue('from_warehouse_id', undefined)}
                />
              </Form.Item>

              {hook.needsFromWarehouse && (
                <Form.Item name="from_warehouse_id" label="Kho nguồn" rules={[{ required: true, message: 'Chọn kho nguồn' }]}>
                  <Select
                    placeholder="Chọn kho nguồn"
                    options={hook.warehouses?.map((w: any) => ({ value: w.id, label: `${w.name} (${w.code})` }))}
                  />
                </Form.Item>
              )}

              <Form.Item
                name="to_warehouse_id"
                label="Kho đích"
                rules={[{ required: true, message: 'Chọn kho đích' }]}
                extra={!hook.needsFromWarehouse ? 'Kho nguồn tự suy ra từ loại chuyển' : undefined}
              >
                <Select
                  placeholder="Chọn kho đích"
                  options={hook.warehouses?.map((w: any) => ({ value: w.id, label: `${w.name} (${w.code})` }))}
                />
              </Form.Item>

              <Form.Item name="note" label="Ghi chú" style={{ gridColumn: 'span 3' }}>
                <Input.TextArea rows={2} />
              </Form.Item>
            </div>
          </SectionCard>

          <SectionCard title="Danh sách sản phẩm">
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
                      {hook.needsFromWarehouse && <col style={{ width: 180 }} />}
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
                        {hook.needsFromWarehouse && <th className="text-left">Kho nguồn dòng</th>}
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {fields.length === 0 && (
                        <tr><td colSpan={hook.needsFromWarehouse ? 8 : 7} className="kv-muted" style={{ textAlign: 'center', padding: '20px 0' }}>Chưa có dòng hàng</td></tr>
                      )}
                      {fields.map(({ key, name }) => (
                        <DeliveryLineItem
                          key={key}
                          name={name}
                          remove={() => remove(name)}
                          extraCell={!hook.needsFromWarehouse ? undefined : (
                            <Form.Item name={[name, 'from_warehouse_id']} noStyle>
                              <Select
                                placeholder={headerFromWh
                                  ? (hook.warehouses as any[])?.find((w: any) => w.id === headerFromWh)?.name + ' (mặc định)'
                                  : 'Kho nguồn'}
                                allowClear
                                style={{ width: '100%' }}
                                options={hook.warehouses?.map((w: any) => ({ value: w.id, label: w.name }))}
                              />
                            </Form.Item>
                          )}
                        />
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="kv-addline">
                        <td></td>
                        <td colSpan={hook.needsFromWarehouse ? 7 : 6}>
                          <button type="button" className="kv-btn" onClick={() => add()}>+ Thêm dòng</button>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </Form.List>
          </SectionCard>
        </div>
      </Form>
    </div>
  )
}
