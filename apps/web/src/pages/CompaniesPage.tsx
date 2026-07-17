import { useNavigate } from 'react-router-dom'
import { Table, Input, Select, Form, Button, Modal, Space, Tag, Checkbox, Spin, Tooltip } from 'antd'
import { SearchOutlined, PlusOutlined, SyncOutlined } from '@ant-design/icons'
import { useCompanies } from '../hooks/useCompanies'
import { EntityFormModal } from '../components/EntityFormModal'
import { PageHeader, TableCard, FilterChip, CodeText } from '../components/ui'

// ── Type badge ──────────────────────────────────────────
function TypeBadge({ type }: { type: 'customer' | 'supplier' }) {
  return type === 'customer'
    ? <Tag color="blue"   style={{ margin: 0 }}>Khách hàng</Tag>
    : <Tag color="purple" style={{ margin: 0 }}>NCC</Tag>
}

export default function CompaniesPage() {
  const hook = useCompanies()
  const navigate = useNavigate()
  const total = hook.data?.total ?? 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Header ── */}
      <PageHeader
        title="Đối tác"
        meta={`${total.toLocaleString('vi-VN')} công ty`}
        actions={
          <>
            <Button icon={<SyncOutlined />} onClick={hook.openSync}>
              Đồng bộ Bitrix
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => hook.openCreate()}>
              Tạo mới
            </Button>
          </>
        }
      />

      {/* ── Table ── */}
      <TableCard
        toolbar={
          <Input
            prefix={<SearchOutlined style={{ color: 'var(--text-2)', fontSize: 13 }} />}
            placeholder="Tìm tên, mã…"
            allowClear
            style={{ width: 220, height: 28, fontSize: 13, color: 'var(--text-1)' }}
            value={hook.search}
            onChange={(e) => hook.setSearch(e.target.value)}
          />
        }
        actions={
          <>
            <FilterChip label="Tất cả"    active={hook.typeFilter === 'all'}      onClick={() => hook.setTypeFilter('all')} />
            <FilterChip label="Khách hàng" active={hook.typeFilter === 'customer'} onClick={() => hook.setTypeFilter('customer')} />
            <FilterChip label="NCC"        active={hook.typeFilter === 'supplier'} onClick={() => hook.setTypeFilter('supplier')} />
          </>
        }
      >
        <Table
          rowKey="id"
          loading={hook.isLoading}
          dataSource={hook.data?.data}
          pagination={false}
          size="small"
          onRow={(record) => ({
            onClick: () => navigate(`/companies/${record.id}`),
            style: { cursor: 'pointer' },
          })}
          columns={[
            { title: 'STT', width: 52, align: 'center' as const, render: (_: any, __: any, i: number) => i + 1 },
            {
              title: 'Mã',
              dataIndex: 'code',
              width: 120,
              align: 'center' as const,
              render: (v: string) => <CodeText>{v}</CodeText>,
            },
            {
              title: 'Tên công ty',
              dataIndex: 'name',
              ellipsis: { showTitle: false },
              render: (name: string) => (
                <Tooltip title={name} placement="topLeft">
                  <span style={{ fontWeight: 500, color: 'var(--text-1)' }}>{name}</span>
                </Tooltip>
              ),
            },
            {
              title: 'Loại',
              dataIndex: 'types',
              width: 180,
              align: 'center' as const,
              render: (types: string[]) => (
                <Space size={4}>
                  {types?.map((t) => <TypeBadge key={t} type={t as any} />)}
                </Space>
              ),
            },
            {
              title: 'SĐT',
              dataIndex: 'phone',
              width: 130,
              align: 'center' as const,
              render: (v: string) => <span style={{ color: 'var(--text-2)', fontSize: 13 }}>{v ?? '—'}</span>,
            },
            {
              title: 'MST',
              dataIndex: 'tax_code',
              width: 120,
              align: 'center' as const,
              render: (v: string) => <span style={{ color: 'var(--text-2)', fontSize: 13 }}>{v ?? '—'}</span>,
            },
          ]}
        />
      </TableCard>

      {/* ── Form tạo công ty ── */}
      <EntityFormModal
        title={hook.editing ? `Sửa — ${hook.editing.name}` : 'Tạo công ty mới'}
        okText={hook.editing ? 'Lưu' : 'Tạo công ty'}
        open={hook.open}
        onCancel={hook.close}
        onFinish={(v) => (hook.editing ? hook.updateMutation.mutate(v) : hook.createMutation.mutate(v))}
        confirmLoading={hook.createMutation.isPending || hook.updateMutation.isPending}
        form={hook.form}
      >
        <Form.Item name="code" label="Mã" extra="Để trống → tự sinh CTY-XXXX">
          <Input placeholder="CTY-0001" />
        </Form.Item>
        <Form.Item name="name" label="Tên công ty" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="types" label="Loại" rules={[{ required: true }]}>
          <Select
            mode="multiple"
            options={[
              { value: 'supplier',  label: 'NCC (Nhà cung cấp)' },
              { value: 'customer',  label: 'Khách hàng' },
            ]}
          />
        </Form.Item>
        <Form.Item name="phone" label="Số điện thoại">
          <Input />
        </Form.Item>
        <Form.Item name="email" label="Email" rules={[{ type: 'email' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="tax_code" label="Mã số thuế">
          <Input />
        </Form.Item>
        <Form.Item name="country" label="Quốc gia" initialValue="VN">
          <Input maxLength={2} style={{ textTransform: 'uppercase', width: 80 }} />
        </Form.Item>
        <Form.Item name="address" label="Địa chỉ">
          <Input />
        </Form.Item>
        <Form.Item name="bank_account" label="Số tài khoản">
          <Input />
        </Form.Item>
        <Form.Item name="bank_name" label="Ngân hàng">
          <Input />
        </Form.Item>
        <Form.Item name="bitrix_company_id" label="Bitrix Company ID">
          <Input />
        </Form.Item>
        <Form.Item name="note" label="Ghi chú">
          <Input.TextArea rows={2} />
        </Form.Item>
      </EntityFormModal>

      {/* ── Sync Bitrix modal ── */}
      <SyncBitrixModal hook={hook} />
    </div>
  )
}

const FIELD_LABEL: Record<string, string> = {
  name: 'Tên', phone: 'SĐT', email: 'Email',
  tax_code: 'MST', address: 'Địa chỉ',
  bank_account: 'Tài khoản', bank_name: 'Ngân hàng',
}

function SyncBitrixModal({ hook }: { hook: any }) {
  const preview = hook.syncPreview
  const newList: any[]     = preview?.new_companies     ?? []
  const changedList: any[] = preview?.changed_companies ?? []

  function toggleId(id: string) {
    hook.setSelectedBxIds((prev: string[]) =>
      prev.includes(id) ? prev.filter((x: string) => x !== id) : [...prev, id]
    )
  }

  function toggleAll(ids: string[], checked: boolean) {
    hook.setSelectedBxIds((prev: string[]) =>
      checked ? [...new Set([...prev, ...ids])] : prev.filter((x: string) => !ids.includes(x))
    )
  }

  const newIds     = newList.map((c: any) => c.bitrix_id)
  const changedIds = changedList.map((c: any) => c.bitrix_id)
  const allNewSel     = newIds.length > 0     && newIds.every((id: string) => hook.selectedBxIds.includes(id))
  const allChangedSel = changedIds.length > 0 && changedIds.every((id: string) => hook.selectedBxIds.includes(id))

  return (
    <Modal
      title="Đồng bộ công ty từ Bitrix"
      open={hook.syncOpen}
      onCancel={() => hook.setSyncOpen(false)}
      width={820}
      okText={`Áp dụng (${hook.selectedBxIds.length})`}
      okButtonProps={{
        disabled: hook.selectedBxIds.length === 0 || hook.previewLoading,
        loading: hook.syncMutation.isPending,
      }}
      onOk={() => hook.syncMutation.mutate()}
      cancelText="Đóng"
    >
      {hook.previewLoading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin tip="Đang tải dữ liệu từ Bitrix…" />
        </div>
      ) : preview ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* ── summary ── */}
          <div style={{ display: 'flex', gap: 20, fontSize: 13, color: 'var(--text-2)' }}>
            <span>Tổng Bitrix: <strong style={{ color: 'var(--text-1)' }}>{preview.total_bitrix}</strong></span>
            <span>Mới: <strong style={{ color: '#15803d' }}>{newList.length}</strong></span>
            <span>Có thay đổi: <strong style={{ color: '#d97706' }}>{changedList.length}</strong></span>
            <span>Không đổi: <strong>{preview.unchanged_count}</strong></span>
          </div>

          {/* ── new companies ── */}
          {newList.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Checkbox
                  checked={allNewSel}
                  indeterminate={!allNewSel && newIds.some((id: string) => hook.selectedBxIds.includes(id))}
                  onChange={(e) => toggleAll(newIds, e.target.checked)}
                />
                <span style={{ fontWeight: 600, fontSize: 13 }}>
                  Công ty mới ({newList.length})
                </span>
              </div>
              <Table
                size="small"
                pagination={false}
                rowKey="bitrix_id"
                dataSource={newList}
                columns={[
                  {
                    width: 36,
                    render: (_: any, r: any) => (
                      <Checkbox
                        checked={hook.selectedBxIds.includes(r.bitrix_id)}
                        onChange={() => toggleId(r.bitrix_id)}
                      />
                    ),
                  },
                  { title: 'Tên', dataIndex: 'name' },
                  { title: 'MST', dataIndex: 'tax_code', width: 120, render: (v: string) => v ?? '—' },
                  { title: 'SĐT', dataIndex: 'phone', width: 120, render: (v: string) => v ?? '—' },
                  {
                    title: 'Loại',
                    dataIndex: 'types',
                    width: 100,
                    render: (t: string[]) => t?.map((x) => (
                      <Tag key={x} color={x === 'customer' ? 'blue' : 'purple'} style={{ margin: 0 }}>
                        {x === 'customer' ? 'KH' : 'NCC'}
                      </Tag>
                    )),
                  },
                ]}
              />
            </div>
          )}

          {/* ── changed companies ── */}
          {changedList.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Checkbox
                  checked={allChangedSel}
                  indeterminate={!allChangedSel && changedIds.some((id: string) => hook.selectedBxIds.includes(id))}
                  onChange={(e) => toggleAll(changedIds, e.target.checked)}
                />
                <span style={{ fontWeight: 600, fontSize: 13 }}>
                  Có thay đổi ({changedList.length})
                </span>
              </div>
              <Table
                size="small"
                pagination={false}
                rowKey="bitrix_id"
                dataSource={changedList}
                expandable={{
                  expandedRowRender: (r: any) => (
                    <div style={{ paddingLeft: 24 }}>
                      {r.changes.map((ch: any) => (
                        <div key={ch.field} style={{ display: 'flex', gap: 8, marginBottom: 4, fontSize: 13 }}>
                          <span style={{ width: 90, color: 'var(--text-3)', flexShrink: 0 }}>
                            {FIELD_LABEL[ch.field] ?? ch.field}
                          </span>
                          <span style={{ color: '#b91c1c', textDecoration: 'line-through' }}>
                            {ch.old ?? '—'}
                          </span>
                          <span style={{ color: 'var(--text-3)' }}>→</span>
                          <span style={{ color: '#15803d' }}>{ch.new ?? '—'}</span>
                        </div>
                      ))}
                    </div>
                  ),
                  rowExpandable: (r: any) => r.changes?.length > 0,
                }}
                columns={[
                  {
                    width: 36,
                    render: (_: any, r: any) => (
                      <Checkbox
                        checked={hook.selectedBxIds.includes(r.bitrix_id)}
                        onChange={() => toggleId(r.bitrix_id)}
                      />
                    ),
                  },
                  { title: 'Mã WMS', dataIndex: 'wms_code', width: 110 },
                  { title: 'Tên hiện tại', dataIndex: 'name' },
                  {
                    title: 'Thay đổi',
                    dataIndex: 'changes',
                    render: (changes: any[]) => (
                      <Space size={4} wrap>
                        {changes.map((c: any) => (
                          <Tooltip key={c.field} title={`${c.old ?? '—'} → ${c.new ?? '—'}`}>
                            <Tag style={{ cursor: 'default' }}>{FIELD_LABEL[c.field] ?? c.field}</Tag>
                          </Tooltip>
                        ))}
                      </Space>
                    ),
                  },
                ]}
              />
            </div>
          )}

          {newList.length === 0 && changedList.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: '20px 0' }}>
              Tất cả công ty đã đồng bộ, không có gì thay đổi.
            </div>
          )}
        </div>
      ) : null}
    </Modal>
  )
}
