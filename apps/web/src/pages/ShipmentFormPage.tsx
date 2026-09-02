import { useState } from 'react'
import {
  Button, Form, Input, Select, InputNumber, DatePicker,
  Table, Modal,
} from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useShipmentForm } from '../hooks/useShipmentForm'
import { StatusBadge } from '../components/ui/StatusBadge'

// ── Shared display helpers (mirrors ReceiptFormPage) ──────────────────────────

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

function ReadOnlyText({ value }: { value?: string }) {
  return (
    <div style={{
      height: 32, display: 'flex', alignItems: 'center', padding: '0 11px',
      border: '1px solid var(--border, #d9d9d9)', borderRadius: 6,
      background: 'var(--surface)', fontSize: 14,
      cursor: 'not-allowed', userSelect: 'text',
    }}>
      {value}
    </div>
  )
}

function fmt(n: any) {
  if (n == null) return '—'
  return Number(n).toLocaleString('en-US')
}

const CONDITION_LABEL: Record<string, string> = { good: 'Tốt', damaged: 'Hỏng', missing: 'Thiếu' }
const CONDITION_COLOR: Record<string, string> = {
  good: 'var(--s-completed-color)', damaged: 'var(--s-cancelled-color)', missing: 'var(--s-pending-color)',
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ShipmentFormPage() {
  const [isDirty, setIsDirty] = useState(false)
  const hook = useShipmentForm()
  const { mode, shipment } = hook

  const isCreate = mode === 'create'
  const isEdit = mode === 'edit'
  const isView = mode === 'view'

  if (!isCreate && hook.isLoading) return null

  function handleSubmit(v: any) {
    if (isCreate) {
      hook.createMutation.mutate(v)
    } else {
      hook.updateMutation.mutate(v)
    }
  }

  function handleCancel() {
    Modal.confirm({
      title: 'Huỷ phiếu nhận hàng?',
      content: 'Không thể hoàn tác sau khi huỷ.',
      okText: 'Huỷ phiếu',
      okButtonProps: { danger: true },
      cancelText: 'Đóng',
      onOk: () => hook.cancelMutation.mutateAsync(),
    })
  }

  return (
    <div style={{ padding: '0 0 48px' }}>

      {/* ─── Breadcrumb + action row ──────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => hook.navigate('/shipments')}
          style={{ padding: '4px 8px' }}
        />
        <span
          style={{ color: 'var(--text-3)', fontSize: 14, cursor: 'pointer' }}
          onClick={() => hook.navigate('/shipments')}
        >
          Phiếu nhận hàng
        </span>
        <span style={{ color: 'var(--text-3)', fontSize: 14 }}>/</span>
        <span style={{ fontSize: 14 }}>
          {isCreate ? 'Tạo mới' : (shipment?.code ?? hook.id)}
        </span>
        {shipment?.status && <StatusBadge status={shipment.status} />}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Xác nhận nhận hàng — chỉ hiện khi draft */}
          {isEdit && !hook.receiveMode && (
            <Button type="primary" onClick={hook.startReceive}
              style={{ background: 'var(--s-completed-color)', borderColor: 'var(--s-completed-color)' }}>
              Xác nhận nhận hàng
            </Button>
          )}

          {/* Tạo phiếu nhập kho — chỉ hiện khi đã received */}
          {shipment?.status === 'received' && (
            <Button type="primary" onClick={() => hook.navigate(`/receipts/new?shipment_id=${hook.id}`)}>
              Tạo phiếu nhập kho
            </Button>
          )}

          {/* Huỷ phiếu */}
          {!isCreate && !['cancelled'].includes(shipment?.status ?? '') && (
            <Button danger onClick={handleCancel} loading={hook.cancelMutation.isPending}>Huỷ phiếu</Button>
          )}
        </div>
      </div>

      <Form
        form={hook.form}
        layout="vertical"
        initialValues={isCreate ? { lines: [{}] } : undefined}
        onFinish={isView ? undefined : handleSubmit}
        onValuesChange={() => { if (!isCreate) setIsDirty(true) }}
      >

        {/* ─── Card 1: Thông tin phiếu ──────────────────────────────── */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '20px 24px', marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, color: 'var(--text-1)' }}>
            Thông tin phiếu
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="warehouse_id" label="Kho nhận" rules={isCreate || isEdit ? [{ required: true }] : undefined}>
              {isView ? (
                <BBox>{shipment?.warehouse_name ?? ph}</BBox>
              ) : (
                <Select
                  options={hook.warehouses?.map((w: any) => ({ value: w.id, label: `${w.name} (${w.code})` }))}
                  placeholder="Chọn kho nhận hàng"
                />
              )}
            </Form.Item>

            <Form.Item name="supplier_id" label="Nhà cung cấp">
              {isView ? (
                <BBox>{shipment?.supplier_name ?? ph}</BBox>
              ) : (
                <Select
                  allowClear
                  showSearch
                  disabled={!!hook.poId}
                  optionFilterProp="label"
                  options={hook.suppliers?.map((c: any) => ({ value: c.id, label: c.name }))}
                  placeholder="Chọn NCC (tuỳ chọn)"
                />
              )}
            </Form.Item>

            <Form.Item name="expected_date" label="Ngày dự kiến">
              {isView ? (
                <BBox>{shipment?.expected_date ? new Date(shipment.expected_date).toLocaleDateString('vi-VN') : ph}</BBox>
              ) : (
                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} placeholder="Ngày hàng dự kiến về" />
              )}
            </Form.Item>
          </div>

          {isCreate && (
            <>
              <Form.Item label="Chọn PO (tuỳ chọn)" style={{ maxWidth: '66%', marginBottom: 12 }}>
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
            </>
          )}
          {!isCreate && shipment?.po_code && (
            <Form.Item label="PO liên kết" style={{ maxWidth: '66%', marginBottom: 12 }}>
              <BBox>{shipment.po_code}</BBox>
            </Form.Item>
          )}

          <Form.Item name="notes" label="Ghi chú" style={{ marginBottom: 0 }}>
            {isView ? (
              <div style={{
                minHeight: 32, padding: '4px 11px',
                border: '1px solid var(--border, #d9d9d9)', borderRadius: 6,
                background: 'var(--surface)', fontSize: 14, userSelect: 'text',
                whiteSpace: 'pre-wrap', lineHeight: 1.5,
                color: shipment?.notes ? undefined : 'var(--text-3, #bbb)',
              }}>
                {shipment?.notes || '—'}
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
            <ViewLinesTable lines={shipment?.lines ?? []} />
          ) : (
            <CreateLinesTable hook={hook} />
          )}
        </div>

        {/* ─── Card 3: Xác nhận nhận hàng ───────────────────────────── */}
        {hook.receiveMode && (
          <div style={{
            background: 'var(--surface)', border: '2px solid var(--s-completed-color)',
            borderRadius: 8, padding: '20px 24px', marginBottom: 16,
          }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>
              Xác nhận số lượng &amp; tình trạng thực nhận
            </div>

            <Table
              size="small"
              pagination={false}
              rowKey="id"
              dataSource={shipment?.lines ?? []}
              columns={[
                {
                  title: 'Mã hàng',
                  render: (_: any, l: any) => (
                    <span style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{l.item_code} — {l.variant_name}</span>
                  ),
                },
                { title: 'SL dự kiến', width: 100, render: (_: any, l: any) => fmt(l.qty_expected) },
                {
                  title: 'SL thực nhận',
                  width: 130,
                  render: (_: any, l: any) => (
                    <InputNumber
                      min={0}
                      style={{ width: 100 }}
                      value={hook.receiveLines[l.id]?.qty_received}
                      onChange={(v) => hook.setReceiveLines((prev) => ({
                        ...prev, [l.id]: { ...prev[l.id], qty_received: v ?? 0 },
                      }))}
                    />
                  ),
                },
                {
                  title: 'Tình trạng',
                  width: 140,
                  render: (_: any, l: any) => (
                    <Select
                      style={{ width: 120 }}
                      value={hook.receiveLines[l.id]?.condition}
                      options={[
                        { value: 'good', label: 'Tốt' },
                        { value: 'damaged', label: 'Hỏng' },
                        { value: 'missing', label: 'Thiếu' },
                      ]}
                      onChange={(v) => hook.setReceiveLines((prev) => ({
                        ...prev, [l.id]: { ...prev[l.id], condition: v },
                      }))}
                    />
                  ),
                },
                {
                  title: 'Ghi chú dòng',
                  render: (_: any, l: any) => (
                    <Input
                      placeholder="Ghi chú (tuỳ chọn)"
                      value={hook.receiveLines[l.id]?.notes}
                      onChange={(e) => hook.setReceiveLines((prev) => ({
                        ...prev, [l.id]: { ...prev[l.id], notes: e.target.value },
                      }))}
                    />
                  ),
                },
              ]}
            />

            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <Button onClick={() => hook.setReceiveMode(false)}>Huỷ</Button>
              <Button
                type="primary"
                onClick={hook.submitReceive}
                loading={hook.receiveMutation.isPending}
                style={{ background: 'var(--s-completed-color)', borderColor: 'var(--s-completed-color)' }}
              >
                Xác nhận
              </Button>
            </div>
          </div>
        )}

        {/* ─── Card 4: Phiếu nhập kho đã tạo từ phiếu này ────────────── */}
        {!isCreate && (shipment?.receipts ?? []).length > 0 && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '20px 24px', marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, color: 'var(--text-1)' }}>
              Phiếu nhập kho liên quan
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {shipment!.receipts.map((r: any) => (
                <div
                  key={r.id}
                  onClick={() => hook.navigate(`/receipts/${r.id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px',
                    border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer',
                  }}
                >
                  <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{r.code}</span>
                  <StatusBadge status={r.status} />
                  <span style={{ marginLeft: 'auto', color: 'var(--text-3)', fontSize: 12 }}>
                    {r.created_by_name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Bottom actions ───────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button onClick={() => hook.navigate('/shipments')}>Quay lại</Button>

          {!isView && !hook.receiveMode && (
            <Button
              type="primary"
              htmlType="submit"
              disabled={isEdit && !isDirty}
              loading={hook.createMutation.isPending || hook.updateMutation.isPending}
            >
              {isCreate ? 'Tạo phiếu nhận hàng' : isDirty ? 'Lưu thay đổi' : 'Sửa'}
            </Button>
          )}
        </div>
      </Form>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CreateLinesTable({ hook }: { hook: ReturnType<typeof useShipmentForm> }) {
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
                  title: 'SKU / Tên sản phẩm',
                  width: 320,
                  render: (_: any, f: any) =>
                    hook.poId ? (
                      <Form.Item name={[f.name, 'variant_label']} noStyle>
                        <ReadOnlyText />
                      </Form.Item>
                    ) : (
                      <Form.Item name={[f.name, 'variant_id']} noStyle rules={[{ required: true, message: 'Chọn SKU' }]}>
                        <Select
                          showSearch
                          placeholder="Tìm SKU / tên sản phẩm"
                          style={{ width: '100%' }}
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
                  title: 'SL dự kiến',
                  width: 120,
                  render: (_: any, f: any) => (
                    <Form.Item name={[f.name, 'qty_expected']} noStyle rules={[{ required: true }]}>
                      <InputNumber min={1} style={{ width: 100 }} />
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
                      <Button size="small" danger onClick={() => remove(f.name)}>Xóa</Button>
                    </>
                  ),
                },
              ]}
            />
          </div>
          {!hook.poId && (
            <Button style={{ marginTop: 8 }} onClick={() => add({ qty_expected: 1 })}>
              + Thêm dòng
            </Button>
          )}
        </>
      )}
    </Form.List>
  )
}

function ViewLinesTable({ lines }: { lines: any[] }) {
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
    { key: 'code', label: 'Mã hàng', render: (l) => l.item_code ?? '—' },
    { key: 'name', label: 'Tên', render: (l) => l.variant_name ?? '—' },
    { key: 'qty_exp', label: 'SL dự kiến', render: (l) => fmt(l.qty_expected) },
    { key: 'qty_recv', label: 'SL thực nhận', render: (l) => fmt(l.qty_received) },
    {
      key: 'condition',
      label: 'Tình trạng',
      render: (l) => (
        <span style={{ color: CONDITION_COLOR[l.condition] ?? undefined }}>
          {CONDITION_LABEL[l.condition] ?? l.condition ?? '—'}
        </span>
      ),
    },
    { key: 'notes', label: 'Ghi chú', render: (l) => l.notes || '—' },
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
