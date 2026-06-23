import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Table, Input, Select, Space } from 'antd'
import { api } from '../lib/api'
import { PageHeader } from '../components/PageHeader'
import { StatusTag } from '../components/StatusTag'

const SN_STATUS_COLOR: Record<string, string> = { active: 'blue', sold: 'default', disposed: 'red' }

// Drill-down sâu nhất: từng SN vật lý của 1 lô — mở bằng expand row (không phải popup) khi
// bấm mũi tên trên 1 dòng của LotsTable.
function SerialsTable({ receiptLineId }: { receiptLineId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['inventory', 'serials', receiptLineId],
    queryFn: async () => (await api.get('/inventory/serials', { params: { receipt_line_id: receiptLineId } })).data,
  })

  return (
    <Table
      rowKey="id"
      loading={isLoading}
      dataSource={data}
      pagination={false}
      size="small"
      columns={[
        { title: 'Serial No', dataIndex: 'serial_no' },
        { title: 'Trạng thái', dataIndex: 'status', render: (s) => <StatusTag status={s} colorMap={SN_STATUS_COLOR} /> },
        { title: 'Kho hiện tại', dataIndex: 'warehouse_name' },
        { title: 'MAC', dataIndex: 'mac_address' },
        { title: 'Hết bảo hành', dataIndex: 'warranty_end', render: (d) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—') },
      ]}
    />
  )
}

// Breakdown theo lô (receipt_line) của 1 SKU/kho — mở bằng expand row khi bấm mũi tên trên
// 1 dòng của bảng Tồn kho chính, thay cho Modal "Xem lô" cũ.
function LotsTable({ variantId, warehouseId }: { variantId: string; warehouseId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['inventory', 'lots', variantId, warehouseId],
    queryFn: async () =>
      (await api.get('/inventory/lots', { params: { variant_id: variantId, warehouse_id: warehouseId } })).data,
  })

  return (
    <Table
      rowKey="receipt_line_id"
      loading={isLoading}
      dataSource={data}
      pagination={false}
      size="small"
      columns={[
        { title: 'Phiếu nhập', dataIndex: 'receipt_code' },
        { title: 'NCC', dataIndex: 'company_name' },
        { title: 'Ngày hoàn thành', dataIndex: 'completed_at', render: (d) => new Date(d).toLocaleDateString('vi-VN') },
        { title: 'SL nhập', dataIndex: 'quantity' },
        { title: 'Còn lại', dataIndex: 'qty_remaining' },
        { title: 'Giá nhập', dataIndex: 'cost_price' },
        { title: 'Bảo hành (tháng)', dataIndex: 'warranty_months' },
      ]}
      expandable={{ expandedRowRender: (r: any) => <SerialsTable receiptLineId={r.receipt_line_id} /> }}
    />
  )
}

export default function InventoryPage() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [warehouseId, setWarehouseId] = useState<string | undefined>()

  // Debounce nhẹ để gõ tới đâu lọc tới đó mà không bắn request mỗi lần nhấn phím.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', search, warehouseId],
    queryFn: async () =>
      (await api.get('/inventory', { params: { search: search || undefined, warehouse_id: warehouseId, limit: 100 } })).data,
    refetchInterval: 5000, // tự refetch để thấy số liệu cập nhật ngay sau khi Complete Receipt ở tab khác
  })

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => (await api.get('/warehouses')).data,
  })

  return (
    <div>
      <PageHeader title="Tồn kho" />

      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder="Tìm theo SKU hoặc tên sản phẩm"
          allowClear
          style={{ width: 280 }}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <Select
          allowClear
          placeholder="Tất cả kho"
          style={{ width: 220 }}
          options={warehouses?.map((w: any) => ({ value: w.id, label: w.name }))}
          onChange={setWarehouseId}
        />
      </Space>

      <Table
        rowKey={(r: any) => `${r.variant_id}-${r.warehouse_id}`}
        loading={isLoading}
        dataSource={data?.data}
        pagination={false}
        columns={[
          { title: 'SKU', dataIndex: 'sku' },
          { title: 'Tên', dataIndex: 'variant_name' },
          { title: 'Kho', dataIndex: 'warehouse_name' },
          { title: 'Tồn (qty_on_hand)', dataIndex: 'qty_on_hand' },
          { title: 'Đang giữ chỗ (qty_reserved)', dataIndex: 'qty_reserved' },
          { title: 'Khả dụng', dataIndex: 'qty_available' },
          { title: 'Giá vốn TB (avg_cost)', dataIndex: 'avg_cost' },
        ]}
        expandable={{ expandedRowRender: (r: any) => <LotsTable variantId={r.variant_id} warehouseId={r.warehouse_id} /> }}
      />
    </div>
  )
}
