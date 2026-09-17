import { useState } from 'react'
import {
  Button as AntButton, Form, Input, Select, InputNumber, DatePicker,
  Table, Modal,
} from 'antd'
import { ArrowLeft } from 'lucide-react'
import { useShipmentForm } from '../hooks/useShipmentForm'
import { StatusBadge } from '../components/ui/StatusBadge'
import { Button } from '@/components/ui/button'
import { usePageHeader } from '@/layout/PageHeaderSlot'
import { fieldTier } from '@/styles/fieldWidths'

// ── Shared display helpers (mirrors ReceiptFormPage) ──────────────────────────

function BBox({ children, style, title }: { children: React.ReactNode; style?: React.CSSProperties; title?: string }) {
  // Cột này có thể bị thu hẹp (VD Kho nhận/Nhà cung cấp) — luôn cắt 1 dòng + `title` để tên
  // công ty dài không bị wrap phá vỡ chiều cao 32px cố định, thay vì phụ thuộc cột phải luôn
  // đủ rộng cho MỌI giá trị (không thực tế vì tên công ty dài ngắn khác nhau).
  return (
    <div title={title} style={{
      height: 32, display: 'flex', alignItems: 'center', padding: '0 11px',
      border: '1px solid var(--border-strong, #10141f)', borderRadius: 6,
      background: 'var(--bg-subtle)', fontSize: 14, userSelect: 'text',
      overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
      ...style,
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
      border: '1px solid var(--border-strong, #10141f)', borderRadius: 6,
      background: 'var(--bg-subtle)', fontSize: 14,
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

  // usePageHeader là hook — PHẢI gọi vô điều kiện trước early return bên dưới (xem CLAUDE.md mục 22).
  usePageHeader(
    <div className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-2">
        <Button variant="ghost" size="icon-sm" onClick={() => hook.navigate('/shipments')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="flex min-w-0 items-baseline gap-2 truncate text-sm font-semibold tracking-tight">
          <button
            onClick={() => hook.navigate('/shipments')}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Phiếu nhận hàng
          </button>
          <span className="text-muted-foreground">/</span>
          <span className="truncate text-foreground">{isCreate ? 'Tạo mới' : (shipment?.code ?? hook.id)}</span>
        </h1>
        {shipment?.status && <StatusBadge status={shipment.status} />}
      </div>

      <div className="flex flex-shrink-0 items-center gap-2">
        {isEdit && !hook.receiveMode && (
          <Button size="sm" variant="success" onClick={hook.startReceive}>
            Xác nhận nhận hàng
          </Button>
        )}
        {shipment?.status === 'received' && (
          <Button size="sm" onClick={() => hook.navigate(`/receipts/new?shipment_id=${hook.id}`)}>
            Tạo phiếu nhập kho
          </Button>
        )}
        {!isCreate && !['cancelled'].includes(shipment?.status ?? '') && (
          <Button size="sm" variant="danger" onClick={handleCancel} disabled={hook.cancelMutation.isPending}>
            Huỷ phiếu
          </Button>
        )}
      </div>
    </div>,
  )

  if (!isCreate && hook.isLoading) return null

  function handleSubmit(v: any) {
    if (isCreate) {
      hook.createMutation.mutate(v)
    } else {
      hook.updateMutation.mutate(v)
    }
  }

  return (
    <div style={{ padding: '0 0 48px' }}>

      <Form
        form={hook.form}
        layout="vertical"
        initialValues={isCreate ? { lines: [{}] } : undefined}
        onFinish={isView ? undefined : handleSubmit}
        onValuesChange={() => { if (!isCreate) setIsDirty(true) }}
      >

        {/* ─── Card 1: Thông tin phiếu ──────────────────────────────── */}
        {/* Border input/select/textarea trong TOÀN BỘ card này dùng --border-strong (đậm hơn
            mặc định) theo yêu cầu — style CSS scoped qua class .shipment-info-card (không chỉ
            hàng field phía trên) để Ghi chú cũng đồng bộ, không đổi border toàn app. */}
        <style>{`
          .shipment-info-card .ant-select-selector,
          .shipment-info-card .ant-picker,
          .shipment-info-card .ant-input { border-color: var(--border-strong) !important; }
        `}</style>
        <div className="shipment-info-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '20px 24px', marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, color: 'var(--text-1)' }}>
            Thông tin phiếu
          </div>

          {/* Cột lệch thay vì chia đều: Nhà cung cấp cần rộng nhất (tên công ty dài). 2 cột
              cuối (Ngày dự kiến, PO liên kết/Chọn PO) dùng track width CỐ ĐỊNH bằng đúng
              fieldTier thay vì "fr + maxWidth" — fr rộng hơn giá trị thực sẽ để lại khoảng
              trống chết trong ô, làm khoảng cách nhìn giữa các field không đều nhau (xem
              CLAUDE.md mục 22 / fieldTier). */}
          {/* minmax(0, Nfr) thay vì Nfr thuần — tránh cột co giãn lệch tỷ lệ theo nội dung bên
              trong (VD "Kho HCM" ngắn khiến grid co cột đó gần hết cỡ min-content rồi dồn hết
              phần dư sang cột kế, thay vì giữ đúng tỷ lệ 0.7:1.1 đã đặt). */}
          <div className="shipment-info-row" style={{ display: 'grid', gridTemplateColumns: `minmax(0, 1fr) ${fieldTier.medium}px 360px`, gap: '0 16px' }}>
            <Form.Item name="warehouse_id" label="Kho nhận" rules={isCreate || isEdit ? [{ required: true }] : undefined}>
              {isView ? (
                <BBox title={shipment?.warehouse_name}>{shipment?.warehouse_name ?? ph}</BBox>
              ) : (
                <Select
                  options={hook.warehouses?.map((w: any) => ({ value: w.id, label: `${w.name} (${w.code})` }))}
                  placeholder="Chọn kho nhận hàng"
                />
              )}
            </Form.Item>

            <Form.Item name="expected_date" label="Ngày dự kiến">
              {isView ? (
                <BBox style={{ maxWidth: fieldTier.medium }}>{shipment?.expected_date ? new Date(shipment.expected_date).toLocaleDateString('vi-VN') : ph}</BBox>
              ) : (
                <DatePicker format="DD/MM/YYYY" style={{ width: '100%', maxWidth: fieldTier.medium }} placeholder="Ngày dự kiến" />
              )}
            </Form.Item>

            {isCreate && (
              <>
                <Form.Item label="Chọn PO (tuỳ chọn)">
                  <Select
                    allowClear
                    value={hook.poId}
                    placeholder="Chọn PO đã Confirmed"
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
              <Form.Item label="PO liên kết">
                <BBox title={shipment.po_code} style={{ maxWidth: 360 }}>{shipment.po_code}</BBox>
              </Form.Item>
            )}
          </div>

          <Form.Item name="notes" label="Ghi chú" style={{ marginBottom: 0 }}>
            {isView ? (
              <div style={{
                minHeight: 32, padding: '4px 11px',
                border: '1px solid var(--border-strong, #10141f)', borderRadius: 6,
                background: 'var(--bg-subtle)', fontSize: 14, userSelect: 'text',
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
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '20px 24px', marginBottom: 16 }}>
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
            background: 'var(--bg-card)', border: '2px solid var(--s-completed-color)',
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
              <AntButton onClick={() => hook.setReceiveMode(false)}>Huỷ</AntButton>
              <AntButton
                type="primary"
                onClick={hook.submitReceive}
                loading={hook.receiveMutation.isPending}
                style={{ background: 'var(--s-completed-color)', borderColor: 'var(--s-completed-color)' }}
              >
                Xác nhận
              </AntButton>
            </div>
          </div>
        )}

        {/* ─── Card 4: Phiếu nhập kho đã tạo từ phiếu này ────────────── */}
        {!isCreate && (shipment?.receipts ?? []).length > 0 && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '20px 24px', marginBottom: 16 }}>
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
          <AntButton onClick={() => hook.navigate('/shipments')}>Quay lại</AntButton>

          {!isView && !hook.receiveMode && (
            <AntButton
              type="primary"
              htmlType="submit"
              disabled={isEdit && !isDirty}
              loading={hook.createMutation.isPending || hook.updateMutation.isPending}
            >
              {isCreate ? 'Tạo phiếu nhận hàng' : isDirty ? 'Lưu thay đổi' : 'Sửa'}
            </AntButton>
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
                      <AntButton size="small" danger onClick={() => remove(f.name)}>Xóa</AntButton>
                    </>
                  ),
                },
              ]}
            />
          </div>
          {!hook.poId && (
            <AntButton style={{ marginTop: 8 }} onClick={() => add({ qty_expected: 1 })}>
              + Thêm dòng
            </AntButton>
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
    background: 'var(--bg-subtle)',
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
