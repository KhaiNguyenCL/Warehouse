import { Form, Input, Select, Button, Space, Tooltip } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useTransferOrderCreate } from '../hooks/useTransferOrderCreate'
import { PageHeader } from '../components/ui/PageHeader'
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

  return (
    <div style={{ padding: '10px 20px 40px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <PageHeader
        title="Tạo phiếu chuyển kho"
        meta={
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => hook.navigate('/transfers')} style={{ padding: '0 4px' }}>
            Phiếu chuyển kho
          </Button>
        }
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button onClick={() => hook.navigate('/transfers')}>Huỷ</Button>
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
                <div>
                  {fields.map(({ key, name }) => (
                    <Space key={key} align="start" style={{ width: '100%', marginBottom: 8 }}>
                      <DeliveryLineItem name={name} remove={() => remove(name)} />
                      {hook.needsFromWarehouse && (
                        <Form.Item
                          name={[name, 'from_warehouse_id']}
                          label={name === 0 ? 'Kho nguồn dòng' : undefined}
                          style={{ minWidth: 180, marginBottom: 0 }}
                        >
                          <Select
                            placeholder={headerFromWh
                              ? (hook.warehouses as any[])?.find((w: any) => w.id === headerFromWh)?.name + ' (mặc định)'
                              : 'Kho nguồn'}
                            allowClear
                            options={hook.warehouses?.map((w: any) => ({ value: w.id, label: w.name }))}
                            size="small"
                          />
                        </Form.Item>
                      )}
                    </Space>
                  ))}
                  <Button onClick={() => add()} style={{ marginTop: 4 }}>+ Thêm dòng</Button>
                </div>
              )}
            </Form.List>
          </SectionCard>
        </div>
      </Form>
    </div>
  )
}
