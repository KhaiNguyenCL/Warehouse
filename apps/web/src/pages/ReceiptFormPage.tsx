import { useState } from 'react'
import {
  Button, Form, Input, Select, InputNumber, DatePicker,
  Space, Checkbox, Popconfirm, Modal, Table,
} from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useReceiptForm } from '../hooks/useReceiptForm'
import { StatusBadge } from '../components/ui/StatusBadge'
import { SnScanGrid } from '../components/SnScanGrid'

// ── Shared display helpers ────────────────────────────────────────────────────

function BBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      height: 32, display: 'flex', alignItems: 'center', padding: '0 11px',
      border: '1px solid var(--border, #d9d9d9)', borderRadius: 6,
      background: 'var(--surface)', fontSize: 14, userSelect: 'text',
    }}>
      {children}
    </div>
  )
}

const ph = <span style={{ color: 'var(--text-3, #bbb)' }}>—</span>

function fmt(n: any) {
  if (n == null) return '—'
  return Number(n).toLocaleString('en-US')
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ReceiptFormPage() {
  const [isDirty, setIsDirty] = useState(false)
  const hook = useReceiptForm({ onUpdateSuccess: () => setIsDirty(false) })
  const { mode, receipt } = hook

  const isCreate = mode === 'create'
  const isEdit = mode === 'edit'
  const isView = mode === 'view'

  if (!isCreate && hook.isLoading) return null

  // ── Submit handler ──────────────────────────────────────────────────────

  function handleSubmit(v: any) {
    if (isCreate) {
      hook.createMutation.mutate(v)
    } else {
      hook.updateMutation.mutate(v)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 0 48px' }}>

      {/* ─── Breadcrumb + action row ──────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => hook.navigate('/receipts')}
          style={{ padding: '4px 8px' }}
        />
        <span
          style={{ color: 'var(--text-3)', fontSize: 14, cursor: 'pointer' }}
          onClick={() => hook.navigate('/receipts')}
        >
          Phiếu nhập kho
        </span>
        <span style={{ color: 'var(--text-3)', fontSize: 14 }}>/</span>
        <span style={{ fontSize: 14 }}>
          {isCreate ? 'Tạo mới' : (receipt?.code ?? hook.id)}
        </span>
        {receipt?.status && <StatusBadge status={receipt.status} />}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Complete — chỉ hiện khi draft */}
          {isEdit && (
            <Button
              type="primary"
              disabled={hook.completeMode}
              onClick={() => hook.setCompleteMode(true)}
              style={{ background: '#52c41a', borderColor: '#52c41a' }}
            >
              Complete
            </Button>
          )}

          {/* Huỷ phiếu */}
          {!isCreate && !['completed', 'cancelled'].includes(receipt?.status ?? '') && (
            <Popconfirm title="Huỷ phiếu nhập kho này?" onConfirm={() => hook.cancelMutation.mutate()}>
              <Button loading={hook.cancelMutation.isPending}>Huỷ phiếu</Button>
            </Popconfirm>
          )}
        </div>
      </div>

      <Form
        form={hook.form}
        layout="vertical"
        initialValues={isCreate ? { import_type: 'purchase', lines: [] } : undefined}
        onFinish={isView ? undefined : handleSubmit}
        onValuesChange={() => { if (!isCreate) setIsDirty(true) }}
      >

        {/* ─── Card 1: Thông tin phiếu ──────────────────────────────── */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '20px 24px', marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, color: 'var(--text-1)' }}>
            Thông tin phiếu
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            {/* Loại nhập */}
            <Form.Item name="import_type" label="Loại nhập" rules={isCreate ? [{ required: true }] : undefined}>
              {isCreate ? (
                <Select
                  options={hook.importTypes?.map((t: any) => ({ value: t.key, label: t.label }))}
                  placeholder="Chọn loại nhập"
                />
              ) : (
                <BBox>{receipt?.import_type ?? ph}</BBox>
              )}
            </Form.Item>

            {/* Kho nhập */}
            <Form.Item name="warehouse_id" label="Kho nhập" rules={isCreate ? [{ required: true }] : undefined}>
              {isCreate ? (
                <Select
                  options={hook.warehouses?.map((w: any) => ({ value: w.id, label: `${w.name} (${w.code})` }))}
                  placeholder="Chọn kho nhập"
                />
              ) : (
                <BBox>{receipt?.warehouse_name ?? ph}</BBox>
              )}
            </Form.Item>
          </div>

          {/* PO liên kết — chỉ tạo mới hoặc xem */}
          {isCreate && (
            <>
              <Form.Item label="Nhận hàng theo Purchase Order (tuỳ chọn)">
                <Select
                  allowClear
                  value={hook.poId}
                  placeholder="Chọn PO đã Confirmed để tự điền dòng hàng"
                  options={hook.confirmedPOs?.data?.map((p: any) => ({
                    value: p.id,
                    label: [p.bitrix_deal_id, p.deal_title].filter(Boolean).join(' — ') || p.code,
                  }))}
                  onChange={(v) => hook.setPoId(v)}
                />
              </Form.Item>
              <Form.Item name="po_id" hidden><Input /></Form.Item>
              <Form.Item name="company_id" hidden><Input /></Form.Item>
            </>
          )}

          {!isCreate && receipt?.po_code && (
            <Form.Item label="PO liên kết">
              <BBox>{receipt.po_code}</BBox>
            </Form.Item>
          )}

          {/* Ngày nhập kho */}
          <Form.Item name="received_date" label="Ngày nhập kho">
            {isView ? (
              <BBox>{receipt?.received_date ? new Date(receipt.received_date).toLocaleDateString('vi-VN') : ph}</BBox>
            ) : (
              <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} placeholder="Ngày hàng về kho" />
            )}
          </Form.Item>

          {/* Ghi chú */}
          <Form.Item name="note" label="Ghi chú" style={{ marginBottom: 0 }}>
            {isView ? (
              <div style={{
                minHeight: 54, padding: '6px 11px',
                border: '1px solid var(--border, #d9d9d9)', borderRadius: 6,
                background: 'var(--surface)', fontSize: 14, userSelect: 'text',
                whiteSpace: 'pre-wrap', lineHeight: 1.5,
                color: receipt?.note ? undefined : 'var(--text-3, #bbb)',
              }}>
                {receipt?.note || '—'}
              </div>
            ) : (
              <Input.TextArea rows={2} placeholder="Ghi chú (tuỳ chọn)" />
            )}
          </Form.Item>
        </div>

        {/* ─── Card 2: Danh sách sản phẩm ──────────────────────────── */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '20px 24px', marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, color: 'var(--text-1)' }}>
            Danh sách sản phẩm
          </div>

          {isView ? (
            <ViewLinesTable
              lines={receipt?.lines ?? []}
              onViewSN={(line) => hook.setSerialsFor({ line_id: line.id, label: line.variant_name })}
            />
          ) : isEdit ? (
            <EditLinesTable hook={hook} />
          ) : (
            <CreateLinesTable hook={hook} />
          )}
        </div>

        {/* ─── Card 3: Nhập Serial Number ───────────────────────────── */}
        {hook.completeMode && (
          <div style={{
            background: 'var(--surface)', border: '2px solid #52c41a',
            borderRadius: 8, padding: '20px 24px', marginBottom: 16,
          }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>
              Nhập Serial Number
            </div>

            {(receipt?.lines ?? []).filter((l: any) => l.product_type === 'storable').map((l: any) => (
              <div key={l.id} style={{ marginBottom: 24 }}>
                <p style={{ fontWeight: 600, marginBottom: 8 }}>
                  {l.item_code} — {l.variant_name}
                  <span style={{ fontWeight: 400, color: '#888', marginLeft: 8 }}>
                    (cần {l.quantity} SN)
                  </span>
                </p>
                <SnScanGrid
                  quantity={l.quantity}
                  rows={hook.serialsRows[l.id] ?? []}
                  onChange={(rows) => hook.setSerialsRows((prev) => ({ ...prev, [l.id]: rows }))}
                />
              </div>
            ))}

            {(receipt?.lines ?? []).every((l: any) => l.product_type !== 'storable') && (
              <p style={{ color: '#888' }}>Không có dòng storable — bấm xác nhận để Complete.</p>
            )}

            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <Button onClick={() => hook.setCompleteMode(false)}>Huỷ</Button>
              <Button
                type="primary"
                onClick={hook.submitComplete}
                loading={hook.completeMutation.isPending}
                style={{ background: '#52c41a', borderColor: '#52c41a' }}
              >
                Xác nhận Complete
              </Button>
            </div>
          </div>
        )}

        {/* ─── Bottom actions ───────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button onClick={() => hook.navigate('/receipts')}>Quay lại</Button>

          {!isView && (
            <Button
              type="primary"
              htmlType="submit"
              disabled={isEdit && !isDirty}
              loading={hook.createMutation.isPending || hook.updateMutation.isPending}
            >
              {isCreate ? 'Tạo phiếu nhập' : isDirty ? 'Lưu thay đổi' : 'Sửa'}
            </Button>
          )}
        </div>
      </Form>

      {/* ─── SN View Modal ────────────────────────────────────────────── */}
      <Modal
        title={`Serial Number — ${hook.serialsFor?.label ?? ''}`}
        open={!!hook.serialsFor}
        onCancel={() => hook.setSerialsFor(null)}
        footer={null}
        width={700}
      >
        <Table
          rowKey="id"
          loading={hook.serialsLoading}
          dataSource={hook.serials}
          pagination={false}
          size="small"
          columns={[
            { title: 'Serial No', dataIndex: 'serial_no' },
            { title: 'Trạng thái', dataIndex: 'status' },
            { title: 'Kho hiện tại', dataIndex: 'warehouse_name' },
            { title: 'MAC', dataIndex: 'mac_address' },
            {
              title: 'Hết BH hãng',
              dataIndex: 'manufacturer_warranty_end',
              render: (d: string | null) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—'),
            },
          ]}
        />
      </Modal>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CreateLinesTable({ hook }: { hook: ReturnType<typeof useReceiptForm> }) {
  return (
    <Form.List name="lines">
      {(fields, { add, remove }) => (
        <>
          <div style={{ overflowX: 'auto' }}>
            <Table
              size="small"
              pagination={false}
              dataSource={fields.map((f) => ({ ...f, key: f.key }))}
              locale={{ emptyText: 'Chưa có dòng hàng' }}
              columns={[
                {
                  title: 'SKU',
                  width: hook.poId ? undefined : 260,
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
                          style={{ width: 260 }}
                          filterOption={false}
                          onSearch={hook.setVariantSearch}
                          options={hook.variantOptions?.map((v: any) => ({
                            value: v.id,
                            label: `${v.item_code ?? v.sku} — ${v.name}`,
                          }))}
                        />
                      </Form.Item>
                    ),
                },
                {
                  title: 'Số lượng',
                  width: 100,
                  render: (_: any, f: any) => (
                    <Form.Item name={[f.name, 'quantity']} noStyle rules={[{ required: true }]}>
                      <InputNumber min={1} style={{ width: 80 }} />
                    </Form.Item>
                  ),
                },
                {
                  title: 'Giá nhập',
                  width: 140,
                  render: (_: any, f: any) => (
                    <Form.Item name={[f.name, 'cost_price']} noStyle rules={[{ required: true }]}>
                      <InputNumber min={0} style={{ width: 120 }} />
                    </Form.Item>
                  ),
                },
                {
                  title: 'BH hãng',
                  render: (_: any, f: any) => (
                    <Form.Item shouldUpdate noStyle>
                      {({ getFieldValue }) => {
                        const has = getFieldValue(['lines', f.name, 'has_manufacturer_warranty'])
                        return (
                          <Space size={4} wrap>
                            <Form.Item name={[f.name, 'has_manufacturer_warranty']} valuePropName="checked" noStyle>
                              <Checkbox>Có</Checkbox>
                            </Form.Item>
                            {has && (
                              <>
                                <Form.Item name={[f.name, 'manufacturer_warranty_months']} noStyle>
                                  <InputNumber min={0} style={{ width: 60 }} placeholder="Tháng" />
                                </Form.Item>
                                <Form.Item name={[f.name, 'manufacturer_warranty_start']} noStyle>
                                  <DatePicker style={{ width: 130 }} placeholder="Ngày BH" allowClear />
                                </Form.Item>
                              </>
                            )}
                          </Space>
                        )
                      }}
                    </Form.Item>
                  ),
                },
                {
                  title: 'BH cty',
                  render: (_: any, f: any) => (
                    <Form.Item shouldUpdate noStyle>
                      {({ getFieldValue }) => {
                        const has = getFieldValue(['lines', f.name, 'has_customer_warranty'])
                        return (
                          <Space size={4}>
                            <Form.Item name={[f.name, 'has_customer_warranty']} valuePropName="checked" noStyle>
                              <Checkbox>Có</Checkbox>
                            </Form.Item>
                            {has && (
                              <Form.Item name={[f.name, 'customer_warranty_months']} noStyle>
                                <InputNumber min={0} style={{ width: 60 }} placeholder="Tháng" />
                              </Form.Item>
                            )}
                          </Space>
                        )
                      }}
                    </Form.Item>
                  ),
                },
                {
                  title: '',
                  width: 60,
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
          </div>
          {!hook.poId && (
            <Button style={{ marginTop: 8 }} onClick={() => add({ quantity: 1 })}>
              + Thêm dòng
            </Button>
          )}
        </>
      )}
    </Form.List>
  )
}

function EditLinesTable({ hook }: { hook: ReturnType<typeof useReceiptForm> }) {
  return (
    <Form.List name="lines">
      {(fields) => (
        <div style={{ overflowX: 'auto' }}>
          <Table
            size="small"
            pagination={false}
            dataSource={fields.map((f) => ({ ...f, key: f.key }))}
            columns={[
              {
                title: 'Mã hàng',
                render: (_: any, f: any) => {
                  const line = hook.receipt?.lines?.[f.name]
                  return (
                    <span style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
                      {line?.item_code} — {line?.variant_name}
                    </span>
                  )
                },
              },
              {
                title: 'SL',
                width: 70,
                render: (_: any, f: any) => {
                  const line = hook.receipt?.lines?.[f.name]
                  return <span>{line?.quantity ?? '—'}</span>
                },
              },
              {
                title: 'Giá nhập',
                width: 140,
                render: (_: any, f: any) => (
                  <Form.Item name={[f.name, 'cost_price']} noStyle rules={[{ required: true }]}>
                    <InputNumber min={0} style={{ width: 120 }} />
                  </Form.Item>
                ),
              },
              {
                title: 'BH hãng',
                render: (_: any, f: any) => (
                  <Form.Item shouldUpdate noStyle>
                    {({ getFieldValue }) => {
                      const has = getFieldValue(['lines', f.name, 'has_manufacturer_warranty'])
                      return (
                        <Space size={4} wrap>
                          <Form.Item name={[f.name, 'has_manufacturer_warranty']} valuePropName="checked" noStyle>
                            <Checkbox>Có</Checkbox>
                          </Form.Item>
                          {has && (
                            <>
                              <Form.Item name={[f.name, 'manufacturer_warranty_months']} noStyle>
                                <InputNumber min={0} style={{ width: 60 }} placeholder="Tháng" />
                              </Form.Item>
                              <Form.Item name={[f.name, 'manufacturer_warranty_start']} noStyle>
                                <DatePicker style={{ width: 120 }} placeholder="Ngày BH" allowClear />
                              </Form.Item>
                            </>
                          )}
                        </Space>
                      )
                    }}
                  </Form.Item>
                ),
              },
              {
                title: 'BH cty',
                render: (_: any, f: any) => (
                  <Form.Item shouldUpdate noStyle>
                    {({ getFieldValue }) => {
                      const has = getFieldValue(['lines', f.name, 'has_customer_warranty'])
                      return (
                        <Space size={4}>
                          <Form.Item name={[f.name, 'has_customer_warranty']} valuePropName="checked" noStyle>
                            <Checkbox>Có</Checkbox>
                          </Form.Item>
                          {has && (
                            <Form.Item name={[f.name, 'customer_warranty_months']} noStyle>
                              <InputNumber min={0} style={{ width: 60 }} placeholder="Tháng" />
                            </Form.Item>
                          )}
                        </Space>
                      )
                    }}
                  </Form.Item>
                ),
              },
              {
                title: '',
                width: 0,
                render: (_: any, f: any) => (
                  <Form.Item name={[f.name, 'id']} hidden><Input /></Form.Item>
                ),
              },
            ]}
          />
        </div>
      )}
    </Form.List>
  )
}

function ViewLinesTable({
  lines,
  onViewSN,
}: {
  lines: any[]
  onViewSN: (line: any) => void
}) {
  const thStyle: React.CSSProperties = {
    padding: '8px 10px', textAlign: 'left', fontSize: 13,
    fontWeight: 500, color: 'var(--text-2, #666)',
    borderBottom: '1px solid var(--border, #f0f0f0)',
    whiteSpace: 'nowrap',
  }
  const tdStyle: React.CSSProperties = {
    padding: '8px 10px', fontSize: 14,
    borderBottom: '1px solid var(--border, #f0f0f0)',
    whiteSpace: 'nowrap',
  }

  const cols: { key: string; label: string; render: (l: any) => React.ReactNode }[] = [
    { key: 'code',     label: 'Mã hàng',       render: (l) => l.item_code ?? '—' },
    { key: 'name',     label: 'Tên',            render: (l) => l.variant_name ?? '—' },
    { key: 'qty',      label: 'SL',             render: (l) => fmt(l.quantity) },
    { key: 'price',    label: 'Giá nhập',       render: (l) => fmt(l.cost_price) },
    { key: 'mfg_wty', label: 'BH hãng (th)',   render: (l) => l.manufacturer_warranty_months != null ? String(l.manufacturer_warranty_months) : '—' },
    { key: 'cst_wty', label: 'BH cty (th)',    render: (l) => l.customer_warranty_months != null ? String(l.customer_warranty_months) : '—' },
    { key: 'qty_rem', label: 'Còn lại (lô)',   render: (l) => l.qty_remaining != null ? fmt(l.qty_remaining) : '—' },
    {
      key: 'sn',
      label: '',
      render: (l) =>
        l.product_type === 'storable' ? (
          <Button size="small" onClick={() => onViewSN(l)}>Xem SN</Button>
        ) : null,
    },
  ]

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {cols.map((c) => <th key={c.key} style={thStyle}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={l.id ?? i}>
              {cols.map((c) => <td key={c.key} style={tdStyle}>{c.render(l)}</td>)}
            </tr>
          ))}
          {lines.length === 0 && (
            <tr>
              <td colSpan={cols.length} style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-3, #bbb)', padding: '20px 0' }}>
                Không có sản phẩm
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
