import { useState } from 'react'
import { Button, Form, Input, Space, Divider, Tag, Popconfirm, message } from 'antd'
import { DeleteOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { usePurchaseOrderForm } from '../hooks/usePurchaseOrderForm'
import POLineItem from '../components/POLineItem'
import { StatusBadge } from '../components/ui/StatusBadge'

// Label cho field tự động điền từ Bitrix
function BLabel({ children }: { children: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {children}
      <Tag color="blue" style={{ fontSize: 10, padding: '0 4px', lineHeight: '16px', marginInlineEnd: 0 }}>Bitrix</Tag>
    </span>
  )
}

// Ô hiển thị trông như input nhưng không tương tác, không bị mờ
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

function BText({ value }: { value?: string; onChange?: any }) {
  return <BBox>{value || ph}</BBox>
}

function BLink({ value }: { value?: string; onChange?: any }) {
  return (
    <BBox>
      {value
        ? <a href={value} target="_blank" rel="noreferrer" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</a>
        : ph}
    </BBox>
  )
}

function BDate({ value }: { value?: any; onChange?: any }) {
  const text = value?.format?.('DD/MM/YYYY') ?? null
  return <BBox>{text ?? ph}</BBox>
}

function BSelect({ value, options }: { value?: string; options?: { value: string; label: React.ReactNode }[]; onChange?: any }) {
  const label = options?.find((o) => o.value === value)?.label
  return <BBox>{label ?? ph}</BBox>
}

export default function PurchaseOrderCreatePage() {
  const [isDirty, setIsDirty] = useState(false)
  const hook = usePurchaseOrderForm({ onUpdateSuccess: () => setIsDirty(false) })
  const { mode, po } = hook
  const isView = mode === 'view'
  const isCreate = mode === 'create'

  if (!isCreate && hook.isLoading) return null

  function handleSubmit(v: any) {
    if (!v.company_id) {
      message.error('Vui lòng Fetch từ Bitrix Deal ID để lấy Nhà cung cấp')
      return
    }

    const filledLines = (v.lines ?? []).filter((l: any) => l?.variant_id)

    if (filledLines.length === 0) {
      message.error('Cần ít nhất 1 dòng sản phẩm')
      return
    }

    const incomplete = filledLines.filter((l: any) => !l.quantity || l.unit_price == null)
    if (incomplete.length > 0) {
      message.error('Các dòng sản phẩm đã chọn cần nhập đủ số lượng và đơn giá')
      return
    }

    const payload = {
      ...v,
      lines: filledLines,
      start_date: v.start_date?.format('YYYY-MM-DD') ?? undefined,
      end_date:   v.end_date?.format('YYYY-MM-DD') ?? undefined,
    }

    if (isCreate) {
      hook.createMutation.mutate(payload)
    } else {
      hook.updateMutation.mutate(payload)
    }
  }

  const statusColors: Record<string, string> = { draft: 'default', confirmed: 'blue', cancelled: 'red' }
  const statusLabels: Record<string, string> = { draft: 'Nháp', confirmed: 'Đã xác nhận', cancelled: 'Đã huỷ' }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 0 48px' }}>
      {/* Breadcrumb + action buttons trên */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => hook.navigate('/purchase-orders')}
          style={{ padding: '4px 8px' }}
        />
        <span
          style={{ color: 'var(--text-3)', fontSize: 14, cursor: 'pointer' }}
          onClick={() => hook.navigate('/purchase-orders')}
        >
          Phiếu mua hàng
        </span>
        <span style={{ color: 'var(--text-3)', fontSize: 14 }}>/</span>
        <span style={{ fontSize: 14 }}>
          {isCreate ? 'Tạo mới' : (po?.code ?? hook.id)}
        </span>
        {po?.status && <StatusBadge status={po.status} />}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Tạo phiếu nhập — luôn hiện khi xem chi tiết, chỉ enable khi confirmed */}
          {!isCreate && (
            <Button
              type="primary"
              disabled={po?.status !== 'confirmed'}
              onClick={() => hook.navigate(`/receipts/new?po_id=${po?.id}`)}
            >
              Tạo phiếu nhập
            </Button>
          )}

          {/* Confirm — Nháp → Đã xác nhận */}
          {mode === 'edit' && (
            <Button
              type="primary"
              onClick={() => hook.confirmMutation.mutate()}
              loading={hook.confirmMutation.isPending}
              style={{ background: '#52c41a', borderColor: '#52c41a' }}
            >
              Confirm
            </Button>
          )}

          {/* Huỷ phiếu — đổi status → Đã huỷ */}
          {!isCreate && po?.status !== 'cancelled' && (
            <Popconfirm title="Huỷ phiếu mua hàng này?" onConfirm={() => hook.cancelMutation.mutate()}>
              <Button loading={hook.cancelMutation.isPending}>Huỷ phiếu</Button>
            </Popconfirm>
          )}

          {/* Xoá — xoá hẳn khỏi hệ thống */}
          {!isCreate && (
            <Popconfirm
              title="Xoá phiếu mua hàng này?"
              description="Phiếu sẽ bị xoá khỏi hệ thống, không thể hoàn tác."
              okText="Xoá"
              okButtonProps={{ danger: true }}
              cancelText="Không"
              onConfirm={() => hook.deleteMutation.mutate()}
            >
              <Button danger icon={<DeleteOutlined />} loading={hook.deleteMutation.isPending}>Xoá</Button>
            </Popconfirm>
          )}
        </div>
      </div>

      <Form
        form={hook.form}
        layout="vertical"
        initialValues={isCreate ? { lines: Array.from({ length: 3 }, () => ({})) } : undefined}
        onFinish={isView ? undefined : handleSubmit}
        onValuesChange={() => { if (!isCreate) setIsDirty(true) }}
        onFinishFailed={({ errorFields }) => {
          setTimeout(() => {
            hook.form.setFields(errorFields.map((f) => ({ name: f.name, errors: [] })))
          }, 3000)
        }}
      >
        {/* ─── Thông tin phiếu ─────────────────────────────────────────── */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '20px 24px', marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, color: 'var(--text-1)' }}>
            Thông tin phiếu
          </div>

          {/* Row 1: Deal ID + Link deal */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <Form.Item name="bitrix_deal_id" label="Bitrix Deal ID" style={{ flex: '0 0 280px' }}>
              {!isView ? (
                <Space.Compact style={{ width: '100%' }}>
                  <Form.Item name="bitrix_deal_id" noStyle>
                    <Input placeholder="Deal ID" />
                  </Form.Item>
                  <Button loading={hook.dealResolving} onClick={hook.resolveDeal}>
                    Fetch
                  </Button>
                </Space.Compact>
              ) : (
                <BText />
              )}
            </Form.Item>
            <Form.Item name="bitrix_deal_url" label={<BLabel>Link deal</BLabel>} style={{ flex: 1 }}>
              <BLink />
            </Form.Item>
          </div>

          {/* Row 2: Tên deal */}
          <Form.Item name="deal_title" label={<BLabel>Tên deal</BLabel>}>
            <BText />
          </Form.Item>

          {/* Row 3: Số hợp đồng - Ngày bắt đầu - Ngày kết thúc */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="contract_number" label={<BLabel>Số hợp đồng</BLabel>}>
              <BText />
            </Form.Item>
            <Form.Item name="start_date" label={<BLabel>Ngày bắt đầu</BLabel>}>
              <BDate />
            </Form.Item>
            <Form.Item name="end_date" label={<BLabel>Ngày kết thúc</BLabel>}>
              <BDate />
            </Form.Item>
          </div>

          {/* Row 4: Khu vực - Địa chỉ */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0 16px' }}>
            <Form.Item name="region" label={<BLabel>Khu vực</BLabel>}>
              <BText />
            </Form.Item>
            <Form.Item name="delivery_location" label={<BLabel>Địa chỉ</BLabel>}>
              <BText />
            </Form.Item>
          </div>

          <Divider style={{ margin: '4px 0 16px' }} />

          {/* Row 5: NCC + Người liên hệ */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="company_id" label={<BLabel>Nhà cung cấp</BLabel>}>
              <BSelect options={hook.companyOptions} />
            </Form.Item>
            <Form.Item name="contact_id" label={<BLabel>Người liên hệ</BLabel>}>
              <BSelect options={hook.companyDetail?.contacts?.map((c: any) => ({ value: c.id, label: c.full_name }))} />
            </Form.Item>
          </div>

          {/* Row 6: Ghi chú */}
          <Form.Item name="note" label="Ghi chú" style={{ marginBottom: 0 }}>
            {isView ? (
              <div style={{
                minHeight: 54, padding: '6px 11px',
                border: '1px solid var(--border, #d9d9d9)', borderRadius: 6,
                background: 'var(--surface)', fontSize: 14, userSelect: 'text',
                whiteSpace: 'pre-wrap', lineHeight: 1.5,
                color: po?.note ? undefined : 'var(--text-3, #bbb)',
              }}>
                {po?.note || '—'}
              </div>
            ) : (
              <Input.TextArea rows={2} />
            )}
          </Form.Item>
        </div>

        {/* ─── Danh sách sản phẩm ─────────────────────────────────────── */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '20px 24px', marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, color: 'var(--text-1)' }}>
            Danh sách sản phẩm
          </div>

          {isView ? (
            /* View mode: table với received/pending/remaining */
            <ViewLinesTable lines={po?.lines ?? []} />
          ) : (
            /* Create/Edit mode: POLineItem form rows */
            <div style={{ overflowX: 'auto' }}>
              <Form.List name="lines">
                {(fields, { add, remove }) => (
                  <div style={{ minWidth: 900 }}>
                    {fields.map(({ key, name }) => (
                      <div key={key} style={{ marginBottom: key < fields.length - 1 ? 4 : 0 }}>
                        <POLineItem
                          form={hook.form}
                          name={name}
                          remove={() => remove(name)}
                          showLabel={key === 0}
                        />
                      </div>
                    ))}
                    <Button onClick={() => add()} style={{ marginTop: 8 }}>
                      + Thêm dòng
                    </Button>
                  </div>
                )}
              </Form.List>
            </div>
          )}

          {/* Tổng tiền */}
          {isView ? (
            <ViewTotal lines={po?.lines ?? []} />
          ) : (
            <Form.Item shouldUpdate noStyle>
              {({ getFieldValue }) => {
                const lines: any[] = getFieldValue('lines') ?? []
                const total = lines.reduce((sum, l) => {
                  if (!l?.variant_id || !l?.quantity || l?.unit_price == null) return sum
                  return sum + Math.round(l.quantity * l.unit_price * (1 + (l.vat_percent ?? 0) / 100))
                }, 0)
                return (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border, #f0f0f0)' }}>
                    <span style={{ fontSize: 14, color: 'var(--text-2, #555)', marginRight: 12 }}>Tổng tiền</span>
                    <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)', minWidth: 140, textAlign: 'right' }}>
                      {total > 0 ? total.toLocaleString('en-US') : '—'}
                    </span>
                  </div>
                )
              }}
            </Form.Item>
          )}
        </div>

        {/* ─── Actions ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Quay lại — thoát về danh sách, không lưu gì */}
          <Button onClick={() => hook.navigate('/purchase-orders')}>Quay lại</Button>

          {/* Lưu / Sửa — hiện "Sửa" khi chưa có thay đổi, "Lưu thay đổi" khi đã sửa */}
          {!isView && (
            <Button
              type="primary"
              htmlType="submit"
              disabled={mode === 'edit' && !isDirty}
              loading={hook.createMutation.isPending || hook.updateMutation.isPending}
            >
              {isCreate ? 'Tạo phiếu mua hàng' : isDirty ? 'Lưu thay đổi' : 'Sửa'}
            </Button>
          )}

          {/* Về nháp — mở khoá để sửa lại */}
          {mode === 'view' && po?.status === 'confirmed' && (
            <Button onClick={() => hook.unconfirmMutation.mutate()} loading={hook.unconfirmMutation.isPending}>
              Về nháp
            </Button>
          )}
        </div>
      </Form>
    </div>
  )
}

// ─── Sub-components cho view mode ───────────────────────────────────────────

function fmt(n: any) {
  if (n == null) return '—'
  return Number(n).toLocaleString('en-US')
}

function ViewLinesTable({ lines }: { lines: any[] }) {
  const cols = [
    { key: 'code',     label: 'Mã hàng',         render: (l: any) => l.variant_item_code ?? l.variant_sku ?? '—' },
    { key: 'name',     label: 'Tên',              render: (l: any) => l.variant_name ?? '—' },
    { key: 'qty',      label: 'SL',               render: (l: any) => fmt(l.quantity) },
    { key: 'price',    label: 'Đơn giá',          render: (l: any) => fmt(l.unit_price) },
    { key: 'vat',      label: 'VAT %',            render: (l: any) => l.vat_percent != null ? `${l.vat_percent}%` : '—' },
    { key: 'total',    label: 'Thành tiền',       render: (l: any) => l.quantity && l.unit_price != null ? fmt(Math.round(l.quantity * l.unit_price * (1 + (l.vat_percent ?? 0) / 100))) : '—' },
    { key: 'mfg_wty',  label: 'BH hãng',         render: (l: any) => l.manufacturer_warranty_months != null ? `${l.manufacturer_warranty_months}` : '—' },
    { key: 'cust_wty', label: 'BH công ty',      render: (l: any) => l.customer_warranty_months != null ? `${l.customer_warranty_months}` : '—' },
    { key: 'received', label: 'Đã nhận',          render: (l: any) => fmt(l.received_qty) },
    { key: 'pending',  label: 'Đang chờ',        render: (l: any) => fmt(l.pending_qty) },
    { key: 'remain',   label: 'Còn lại',         render: (l: any) => fmt(l.remaining_qty) },
    { key: 'note',     label: 'Ghi chú',          render: (l: any) => l.note ?? '—' },
  ]

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

function ViewTotal({ lines }: { lines: any[] }) {
  const total = lines.reduce((sum, l) => {
    if (!l?.quantity || l?.unit_price == null) return sum
    return sum + Math.round(l.quantity * l.unit_price * (1 + (l.vat_percent ?? 0) / 100))
  }, 0)
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border, #f0f0f0)' }}>
      <span style={{ fontSize: 14, color: 'var(--text-2, #555)', marginRight: 12 }}>Tổng tiền</span>
      <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)', minWidth: 140, textAlign: 'right' }}>
        {total > 0 ? total.toLocaleString('en-US') : '—'}
      </span>
    </div>
  )
}
