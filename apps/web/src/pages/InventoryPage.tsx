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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { CodeText } from '@/components/ui/CodeText'
import { useResizableColumns } from '@/hooks/useResizableColumns'
import { ResizeHandle } from '@/components/ui/ResizeHandle'
import { PageSizeSelector } from '@/components/ui/PageSizeSelector'

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

function ReservedSheet({
  variantId, variantName, unit, onClose,
}: { variantId: string; variantName: string; unit: string | null; onClose: () => void }) {
  const navigate = useNavigate()
  const { data, isFetching } = useQuery({
    queryKey: ['inventory', 'reserved', variantId],
    queryFn: async () => (await api.get('/inventory/reserved', { params: { variant_id: variantId } })).data as any[],
    staleTime: 30_000,
  })

  const SOURCE_PATH: Record<string, string> = { quotation: '/quotations', delivery_order: '/deliveries' }
  const SOURCE_LABEL: Record<string, string> = { quotation: 'Báo giá', delivery_order: 'Phiếu xuất' }

  return (
    <>
      <div className="mb-4 text-sm text-muted-foreground">{variantName}</div>
      {isFetching ? (
        <div className="py-8 text-center text-sm text-muted-foreground">Đang tải…</div>
      ) : !data?.length ? (
        <div className="py-8 text-center text-sm text-muted-foreground">Không có dữ liệu giữ chỗ</div>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
          {data.map((r: any) => (
            <button
              key={r.source_id}
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
              onClick={() => { navigate(`${SOURCE_PATH[r.source_type]}/${r.source_id}`); onClose() }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {SOURCE_LABEL[r.source_type]}
                </span>
                <span className="font-mono text-sm font-medium text-foreground">{r.doc_code}</span>
                {r.customer_name && (
                  <span className="truncate text-sm text-muted-foreground">{r.customer_name}</span>
                )}
              </div>
              <span className="ml-3 shrink-0 text-sm font-semibold tabular-nums text-foreground">
                {r.qty}{unit ? ` ${unit}` : ''}
              </span>
            </button>
          ))}
        </div>
      )}
    </>
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
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            {['Serial No', 'Mã hàng', 'Tên SP', 'Trạng thái', 'Kho', 'Phiếu nhập · Ngày', 'MAC', 'Hết BH hãng', 'Hết BH cty'].map((h) => (
              <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {isLoading ? (
            <tr><td colSpan={9} className="px-4 py-12 text-center text-xs text-muted-foreground">Đang tìm…</td></tr>
          ) : rows.length === 0 ? (
            <tr><td colSpan={9} className="px-4 py-12 text-center text-xs text-muted-foreground">Không tìm thấy Serial No nào khớp</td></tr>
          ) : rows.map((r) => (
            <tr key={r.id} onClick={() => setSelected(r)} className="cursor-pointer transition-colors hover:bg-muted/40">
              <td className="px-4 py-2 font-mono font-medium text-foreground">{r.serial_no}</td>
              <td className="px-4 py-2">
                <CodeText>{r.item_code}</CodeText>
              </td>
              <td className="px-4 py-2 text-muted-foreground">{r.variant_name}</td>
              <td className="px-4 py-2"><StatusBadge status={r.status} /></td>
              <td className="px-4 py-2 text-muted-foreground">{r.warehouse_name ?? '—'}</td>
              <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{fmtReceipt(r.receipt_code, r.completed_at)}</td>
              <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{r.mac_address ?? '—'}</td>
              <td className="px-4 py-2 text-muted-foreground">{fmt(r.manufacturer_warranty_end)}</td>
              <td className="px-4 py-2 text-muted-foreground">{fmt(r.customer_warranty_end)}</td>
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
  const [searchType, setSearchType] = useState<'sku' | 'sn'>('sku')
  const [searchValue, setSearchValue] = useState('')
  const { colWidths, tableRef, startResize } = useResizableColumns([3, 10, 20, 12, 13, 7, 7, 8, 11, 9])
  const [reservedSheet, setReservedSheet] = useState<{ variantId: string; variantName: string; unit: string | null } | null>(null)

  function handleSearchTypeChange(type: 'sku' | 'sn') {
    setSearchType(type)
    setSearchValue('')
    hook.setSearchInput('')
    hook.setSnSearchInput('')
  }

  function handleSearchValueChange(v: string) {
    setSearchValue(v)
    if (searchType === 'sku') {
      hook.setSearchInput(v)
      hook.setSnSearchInput('')
    } else {
      hook.setSnSearchInput(v)
      hook.setSearchInput('')
    }
  }

  const rows: any[] = hook.data?.data ?? []
  const total: number = hook.data?.total ?? 0
  const from = total === 0 ? 0 : (hook.page - 1) * hook.limit + 1
  const to = Math.min(hook.page * hook.limit, total)
  const warehouses: any[] = hook.warehouses ?? []
  const categories: any[] = hook.categories ?? []
  const brands: any[] = hook.brands ?? []

  return (
    <div className="flex flex-col gap-6">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tồn kho</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Theo dõi số lượng tồn kho theo SKU</p>
        </div>
      </div>

      <Sheet open={!!reservedSheet} onOpenChange={(o) => { if (!o) setReservedSheet(null) }}>
        <SheetContent side="right" className="w-[480px] sm:max-w-[480px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Đang giữ chỗ</SheetTitle>
          </SheetHeader>
          <div className="px-1 mt-2">
          {reservedSheet && (
            <ReservedSheet
              variantId={reservedSheet.variantId}
              variantName={reservedSheet.variantName}
              unit={reservedSheet.unit}
              onClose={() => setReservedSheet(null)}
            />
          )}
          </div>
        </SheetContent>
      </Sheet>

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

            {/* Combined search */}
            <Select value={searchType} onValueChange={(v) => handleSearchTypeChange(v as 'sku' | 'sn')}>
              <SelectTrigger className="h-9 w-32 text-sm shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sku">Mã hàng / Tên</SelectItem>
                <SelectItem value="sn">Serial No</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={searchType === 'sku' ? 'Tìm mã hàng / tên sản phẩm…' : 'Nhập serial number…'}
                value={searchValue}
                onChange={(e) => handleSearchValueChange(e.target.value)}
                className="h-9 w-56 pl-9 text-sm shadow-none focus-visible:ring-1"
              />
            </div>

            {/* Product type filter */}
            <Select
              value={hook.productType ?? '__all__'}
              onValueChange={(v) => hook.setProductType(v === '__all__' ? undefined : v)}
            >
              <SelectTrigger className="h-9 w-40 text-sm shadow-none">
                <SelectValue placeholder="Loại SP" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Tất cả loại</SelectItem>
                <SelectItem value="storable">Có SN</SelectItem>
                <SelectItem value="consumable">Vật tư</SelectItem>
              </SelectContent>
            </Select>

            {/* Category filter */}
            {categories.length > 0 && (
              <Select
                value={hook.categoryId ?? '__all__'}
                onValueChange={(v) => hook.setCategoryId(v === '__all__' ? undefined : v)}
              >
                <SelectTrigger className="h-9 w-44 text-sm shadow-none">
                  <SelectValue placeholder="Danh mục" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Tất cả danh mục</SelectItem>
                  {categories.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Brand filter */}
            {brands.length > 0 && (
              <Select
                value={hook.brandId ?? '__all__'}
                onValueChange={(v) => hook.setBrandId(v === '__all__' ? undefined : v)}
              >
                <SelectTrigger className="h-9 w-40 text-sm shadow-none">
                  <SelectValue placeholder="Hãng" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Tất cả hãng</SelectItem>
                  {brands.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

          </div>
          {!hook.snSearch && (
            <span className="text-sm text-muted-foreground">{total.toLocaleString('vi-VN')} SKU</span>
          )}
        </div>

        {hook.snSearch ? (
          <SnSearchTable search={hook.snSearch} />
        ) : (
          <>
            {/* Main inventory table — click dòng storable để xem danh sách SN, kéo border header để resize cột */}
            <div className="overflow-x-auto">
            <table ref={tableRef} className="w-full table-fixed">
              <colgroup>
                {colWidths.map((w, i) => <col key={i} style={{ width: `${w}%` }} />)}
              </colgroup>
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {([
                    ['#', 'center'],
                    ['Mã hàng', 'center'],
                    ['Tên SKU', 'left'],
                    ['Model', 'center'],
                    ['P/N', 'center'],
                    ['Tồn kho', 'center'],
                    ['Giữ chỗ', 'center'],
                    ['Khả dụng', 'center'],
                    ['Kho', 'center'],
                    ['', 'center'],
                  ] as [string, string][]).map(([label, align], i) => (
                    <th
                      key={i}
                      style={{ width: `${colWidths[i]}%` }}
                      className={`relative px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-foreground/70 select-none ${align === 'left' ? 'text-left' : 'text-center'}`}
                    >
                      {label}
                      {i < 9 && <ResizeHandle onMouseDown={(e) => startResize(e, i)} />}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {hook.isFetching && rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-xs text-muted-foreground">Đang tải…</td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-xs text-muted-foreground">
                      {hook.searchInput ? 'Không tìm thấy kết quả.' : 'Chưa có tồn kho nào.'}
                    </td>
                  </tr>
                ) : (
                  rows.map((row, i) => (
                    <tr
                      key={row.variant_id}
                      className={cn('transition-colors hover:bg-muted/40', row.product_type === 'storable' && 'cursor-pointer')}
                      onClick={() => {
                        if (row.product_type === 'storable') {
                          navigate(`/inventory/serials/${row.variant_id}?code=${encodeURIComponent(row.item_code ?? '')}&name=${encodeURIComponent(row.variant_name ?? '')}`)
                        }
                      }}
                    >
                      <td className="px-3 py-2 text-center text-xs text-muted-foreground">{from + i}</td>
                      <td className="px-3 py-2 text-center">
                        <CodeText>{row.item_code}</CodeText>
                      </td>
                      <td className="px-3 py-2 font-medium text-foreground truncate max-w-0" title={row.variant_name}>{row.variant_name}</td>
                      <td className="px-3 py-2 text-center font-mono text-sm text-foreground truncate max-w-0" title={row.model ?? ''}>{row.model || <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-3 py-2 text-center font-mono text-sm text-foreground truncate max-w-0" title={row.part_number ?? ''}>{row.part_number || <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-3 py-2 text-center text-foreground tabular-nums">
                        {row.qty_on_hand}{row.unit ? ` ${row.unit}` : ''}
                      </td>
                      <td className="px-3 py-2 text-center tabular-nums text-foreground">
                        {row.qty_reserved ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); setReservedSheet({ variantId: row.variant_id, variantName: row.variant_name, unit: row.unit }) }}
                            className="tabular-nums underline decoration-dashed underline-offset-2 hover:text-primary transition-colors"
                          >
                            {row.qty_reserved}{row.unit ? ` ${row.unit}` : ''}
                          </button>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-3 py-2 text-center tabular-nums">
                        <span className={cn('font-semibold', row.qty_available > 0 ? 'text-emerald-600' : 'text-red-500')}>
                          {row.qty_available}{row.unit ? ` ${row.unit}` : ''}
                        </span>
                      </td>
                      <td className="px-3 py-2 overflow-hidden text-center">
                        {(row.warehouse_breakdown ?? []).length > 0
                          ? (row.warehouse_breakdown as any[]).map((w: any) => (
                              <div key={w.name} className="flex items-center justify-center gap-1.5 text-xs text-foreground leading-5">
                                <span className="text-muted-foreground">{w.name}</span>
                                <span className="font-semibold tabular-nums">({w.qty})</span>
                              </div>
                            ))
                          : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {row.product_type === 'storable' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/inventory/serials/${row.variant_id}?code=${encodeURIComponent(row.item_code ?? '')}&name=${encodeURIComponent(row.variant_name ?? '')}`) }}
                            className="rounded px-2 py-1 text-xs text-primary hover:bg-primary/10 transition-colors whitespace-nowrap"
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
            </div>

            {/* Pagination */}
            {total > 0 && (
              <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{from}–{to} / {total} SKU</span>
                  <PageSizeSelector value={hook.limit} onChange={hook.setLimit} />
                </div>
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
                    {hook.page} / {Math.ceil(total / hook.limit)}
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
