import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Form, Drawer, Descriptions, Divider, message, Table, Tag } from 'antd'
import { Input as AntInput, Button as AntButton } from 'antd'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useInventory } from '../hooks/useInventory'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/ui/StatusBadge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

const REF_DOCUMENT_PATH: Record<string, string> = {
  receipt: '/receipts',
  delivery_order: '/deliveries',
  transfer_order: '/transfers',
}
const REF_DOCUMENT_LABEL: Record<string, string> = {
  receipt: 'Phiếu nhập',
  delivery_order: 'Phiếu xuất',
  transfer_order: 'Phiếu chuyển',
}

function fmt(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('vi-VN')
}

function fmtReceipt(code: string | null, completedAt: string | null) {
  if (!code) return '—'
  if (!completedAt) return code
  return `${code} · ${fmt(completedAt)}`
}

function SnDetailDrawer({ sn, onClose, listQueryKey }: { sn: any | null; onClose: () => void; listQueryKey: unknown[] }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)

  const { data: movements, isLoading: movLoading } = useQuery({
    queryKey: ['inventory', 'serials', sn?.id, 'movements'],
    queryFn: async () => (await api.get(`/inventory/serials/${sn!.id}/movements`)).data,
    enabled: !!sn,
  })

  useEffect(() => {
    if (sn && editOpen) {
      form.setFieldsValue({ serial_no: sn.serial_no, mac_address: sn.mac_address ?? '', note: sn.note ?? '' })
    }
  }, [sn, editOpen, form])

  async function onSave() {
    const values = form.getFieldsValue()
    setSaving(true)
    try {
      await api.patch(`/inventory/serials/${sn!.id}`, {
        serial_no: values.serial_no, mac_address: values.mac_address || null, note: values.note || null,
      })
      message.success('Đã cập nhật')
      qc.invalidateQueries({ queryKey: listQueryKey })
      setEditOpen(false)
      onClose()
    } catch { message.error('Lưu thất bại') } finally { setSaving(false) }
  }

  return (
    <Drawer
      title={sn?.serial_no ?? ''}
      open={!!sn}
      onClose={() => { setEditOpen(false); onClose() }}
      width={520}
      extra={<AntButton onClick={() => setEditOpen((v) => !v)}>{editOpen ? 'Huỷ sửa' : 'Sửa'}</AntButton>}
    >
      {sn && (
        <>
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="Trạng thái"><StatusBadge status={sn.status} /></Descriptions.Item>
            <Descriptions.Item label="Kho">{sn.warehouse_name ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="MAC">{sn.mac_address ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Phiếu nhập · Ngày">
              <span style={{ fontFamily: 'monospace' }}>{fmtReceipt(sn.receipt_code, sn.completed_at)}</span>
            </Descriptions.Item>
            <Descriptions.Item label="Hết BH hãng">{fmt(sn.manufacturer_warranty_end)}</Descriptions.Item>
            <Descriptions.Item label="Hết BH cty">{fmt(sn.customer_warranty_end)}</Descriptions.Item>
          </Descriptions>
          {editOpen && (
            <>
              <Divider />
              <Form form={form} layout="vertical">
                <Form.Item name="serial_no" label="Serial No" rules={[{ required: true }]}><AntInput /></Form.Item>
                <Form.Item name="mac_address" label="MAC Address"><AntInput placeholder="AA:BB:CC:DD:EE:FF" allowClear /></Form.Item>
                <Form.Item name="note" label="Ghi chú"><AntInput.TextArea rows={2} allowClear /></Form.Item>
                <AntButton type="primary" loading={saving} onClick={onSave}>Lưu</AntButton>
              </Form>
            </>
          )}
          <Divider>Lịch sử di chuyển</Divider>
          <Table rowKey="id" loading={movLoading} dataSource={movements} pagination={false} size="small"
            locale={{ emptyText: 'Chưa có lịch sử' }}
            columns={[
              { title: 'Loại', dataIndex: 'movement_type', width: 60, render: (v: string) => <Tag color={v === 'in' ? 'green' : 'red'}>{v === 'in' ? 'Nhập' : 'Xuất'}</Tag> },
              { title: 'Kho', dataIndex: 'warehouse_name' },
              { title: 'Thời gian', dataIndex: 'created_at', render: (d) => new Date(d).toLocaleString('vi-VN') },
              { title: 'Phiếu', render: (_: any, r: any) => REF_DOCUMENT_PATH[r.ref_document_type] ? <a onClick={() => navigate(`${REF_DOCUMENT_PATH[r.ref_document_type]}/${r.ref_document_id}`)}>{REF_DOCUMENT_LABEL[r.ref_document_type]}</a> : '—' },
            ]}
          />
        </>
      )}
    </Drawer>
  )
}

function SnSearchTable({ search }: { search: string }) {
  const queryKey = ['inventory', 'serials', 'search', search]
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => (await api.get('/inventory/serials', { params: { search } })).data,
  })
  const [selected, setSelected] = useState<any>(null)
  const rows: any[] = data ?? []

  return (
    <>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            {['Serial No', 'Mã hàng', 'Tên SP', 'Trạng thái', 'Kho', 'Phiếu nhập · Ngày', 'MAC', 'Hết BH hãng', 'Hết BH cty'].map((h) => (
              <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {isLoading ? (
            <tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">Đang tìm…</td></tr>
          ) : rows.length === 0 ? (
            <tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">Không tìm thấy Serial No nào khớp</td></tr>
          ) : rows.map((r) => (
            <tr key={r.id} onClick={() => setSelected(r)} className="cursor-pointer transition-colors hover:bg-muted/40">
              <td className="px-4 py-3 font-mono font-medium text-foreground">{r.serial_no}</td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center rounded-md border border-border bg-muted/60 px-2 py-0.5 font-mono text-xs font-medium text-foreground">{r.item_code}</span>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{r.variant_name}</td>
              <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
              <td className="px-4 py-3 text-muted-foreground">{r.warehouse_name ?? '—'}</td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{fmtReceipt(r.receipt_code, r.completed_at)}</td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.mac_address ?? '—'}</td>
              <td className="px-4 py-3 text-muted-foreground">{fmt(r.manufacturer_warranty_end)}</td>
              <td className="px-4 py-3 text-muted-foreground">{fmt(r.customer_warranty_end)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <SnDetailDrawer sn={selected} onClose={() => setSelected(null)} listQueryKey={queryKey} />
    </>
  )
}

export default function InventoryPage() {
  const hook = useInventory()
  const navigate = useNavigate()

  const rows: any[] = hook.data?.data ?? []
  const total: number = hook.data?.total ?? 0
  const pageSize = 20
  const from = total === 0 ? 0 : (hook.page - 1) * pageSize + 1
  const to = Math.min(hook.page * pageSize, total)
  const warehouses: any[] = hook.warehouses ?? []

  return (
    <div className="flex flex-col gap-6">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tồn kho</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Theo dõi số lượng tồn kho theo SKU</p>
        </div>
      </div>

      {/* Table card */}
      <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">

        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            {/* Warehouse filter */}
            <Select
              value={hook.warehouseId ?? '__all__'}
              onValueChange={(v) => hook.setWarehouseId(v === '__all__' ? undefined : v)}
            >
              <SelectTrigger className="h-9 w-44 text-sm shadow-none">
                <SelectValue placeholder="Tất cả kho" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Tất cả kho</SelectItem>
                {warehouses.map((w: any) => (
                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* SKU search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tìm SKU / tên sản phẩm"
                value={hook.searchInput}
                onChange={(e) => hook.setSearchInput(e.target.value)}
                className="h-9 w-52 pl-9 text-sm shadow-none focus-visible:ring-1"
              />
            </div>

            {/* SN search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tra SN (không cần biết SKU)"
                value={hook.snSearchInput}
                onChange={(e) => hook.setSnSearchInput(e.target.value)}
                className="h-9 w-72 pl-9 text-sm shadow-none focus-visible:ring-1"
              />
            </div>
          </div>
          {!hook.snSearch && (
            <span className="text-sm text-muted-foreground">{total.toLocaleString('vi-VN')} SKU</span>
          )}
        </div>

        {hook.snSearch ? (
          <SnSearchTable search={hook.snSearch} />
        ) : (
          <>
            {/* Main inventory table */}
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="w-12 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">#</th>
                  <th className="w-40 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mã hàng</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tên sản phẩm</th>
                  <th className="w-24 px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tồn kho</th>
                  <th className="w-24 px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Đang giữ</th>
                  <th className="w-24 px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Khả dụng</th>
                  <th className="w-48 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Kho</th>
                  <th className="w-32 px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Giá vốn TB</th>
                  <th className="w-20 px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {hook.isFetching && rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">Đang tải…</td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      {hook.searchInput ? 'Không tìm thấy kết quả.' : 'Chưa có tồn kho nào.'}
                    </td>
                  </tr>
                ) : (
                  rows.map((row, i) => (
                    <tr key={row.variant_id} className="transition-colors hover:bg-muted/40">
                      <td className="px-4 py-3 text-center text-xs text-muted-foreground">{from + i}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-md border border-border bg-muted/60 px-2 py-0.5 font-mono text-xs font-medium text-foreground">
                          {row.item_code}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">{row.variant_name}</td>
                      <td className="px-4 py-3 text-right text-foreground tabular-nums">
                        {row.qty_on_hand}{row.unit ? ` ${row.unit}` : ''}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                        {row.qty_reserved ? `${row.qty_reserved}${row.unit ? ` ${row.unit}` : ''}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <span className={cn('font-semibold', row.qty_available > 0 ? 'text-emerald-600' : 'text-red-500')}>
                          {row.qty_available}{row.unit ? ` ${row.unit}` : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {(row.warehouse_breakdown ?? []).map((w: any) => (
                          <span key={w.name} className="mr-2 whitespace-nowrap">
                            {w.name}<span className="text-muted-foreground/60 ml-1">({w.qty})</span>
                          </span>
                        )) || '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                        {row.avg_cost ? Number(row.avg_cost).toLocaleString('vi-VN') + ' ₫' : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {row.product_type === 'storable' && (
                          <button
                            onClick={() => navigate(`/inventory/serials/${row.variant_id}?code=${encodeURIComponent(row.item_code ?? '')}&name=${encodeURIComponent(row.variant_name ?? '')}`)}
                            className="rounded-md px-2 py-1 text-xs text-primary hover:bg-primary/10 transition-colors"
                          >
                            Xem SN
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {total > 0 && (
              <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
                <span className="text-xs text-muted-foreground">{from}–{to} / {total} SKU</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost" size="sm"
                    disabled={hook.page <= 1}
                    onClick={() => hook.setPage(hook.page - 1)}
                    className="h-7 w-7 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="min-w-[3rem] text-center text-xs text-muted-foreground">
                    {hook.page} / {Math.ceil(total / pageSize)}
                  </span>
                  <Button
                    variant="ghost" size="sm"
                    disabled={to >= total}
                    onClick={() => hook.setPage(hook.page + 1)}
                    className="h-7 w-7 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
