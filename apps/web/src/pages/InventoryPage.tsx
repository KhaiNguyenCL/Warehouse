import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Table, Input, Select, Space, Tag } from 'antd'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { PageHeader } from '../components/PageHeader'
import { StatusTag } from '../components/StatusTag'

const SN_STATUS_COLOR: Record<string, string> = { active: 'blue', sold: 'default', disposed: 'red' }

// ref_document_type (polymorphic, CLAUDE.md mục 19) → đường dẫn trang chi tiết tương ứng,
// dùng để "Xem phiếu" thẳng từ 1 dòng lịch sử di chuyển — không cần biết mã phiếu vì
// click thẳng vào trang chi tiết sẽ tự hiện đúng code của phiếu đó.
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

// Lịch sử di chuyển (nhập/xuất/chuyển kho) của ĐÚNG 1 SN — mở bằng expand row trên kết quả
// SnSearchTable. stock_movements.serial_id chỉ có ở dòng storable (CLAUDE.md mục 19).
function MovementsTable({ serialId }: { serialId: string }) {
  const navigate = useNavigate()
  const { data, isLoading } = useQuery({
    queryKey: ['inventory', 'serials', serialId, 'movements'],
    queryFn: async () => (await api.get(`/inventory/serials/${serialId}/movements`)).data,
  })

  return (
    <Table
      rowKey="id"
      loading={isLoading}
      dataSource={data}
      pagination={false}
      size="small"
      locale={{ emptyText: 'Chưa có lịch sử di chuyển' }}
      columns={[
        {
          title: 'Loại',
          dataIndex: 'movement_type',
          render: (v: string) => <Tag color={v === 'in' ? 'green' : 'red'}>{v === 'in' ? 'Nhập' : 'Xuất'}</Tag>,
        },
        { title: 'Kho', dataIndex: 'warehouse_name' },
        { title: 'Giá vốn', dataIndex: 'unit_cost' },
        { title: 'Thời gian', dataIndex: 'created_at', render: (d) => new Date(d).toLocaleString('vi-VN') },
        {
          title: 'Phiếu',
          render: (_: any, r: any) =>
            REF_DOCUMENT_PATH[r.ref_document_type] ? (
              <a onClick={() => navigate(`${REF_DOCUMENT_PATH[r.ref_document_type]}/${r.ref_document_id}`)}>
                Xem {REF_DOCUMENT_LABEL[r.ref_document_type]}
              </a>
            ) : (
              '—'
            ),
        },
      ]}
    />
  )
}

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

// Tra ngược trực tiếp theo serial_no — dùng khi chỉ có 1 SN vật lý trong tay (vd lúc xử lý
// bảo hành), không biết trước SKU/kho/lô nên không thể đi đường drill-down 3 tầng bình
// thường (SKU → Lô → SN). serial_numbers.serial_no UNIQUE nên tra thẳng được.
function SnSearchTable({ search }: { search: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['inventory', 'serials', 'search', search],
    queryFn: async () => (await api.get('/inventory/serials', { params: { search } })).data,
  })

  return (
    <Table
      rowKey="id"
      loading={isLoading}
      dataSource={data}
      pagination={false}
      locale={{ emptyText: 'Không tìm thấy Serial No nào khớp' }}
      columns={[
        { title: 'Serial No', dataIndex: 'serial_no' },
        { title: 'SKU', dataIndex: 'sku' },
        { title: 'Tên SP', dataIndex: 'variant_name' },
        { title: 'Trạng thái', dataIndex: 'status', render: (s) => <StatusTag status={s} colorMap={SN_STATUS_COLOR} /> },
        { title: 'Kho hiện tại', dataIndex: 'warehouse_name' },
        { title: 'Phiếu nhập', dataIndex: 'receipt_code' },
        { title: 'MAC', dataIndex: 'mac_address' },
        { title: 'Hết bảo hành', dataIndex: 'warranty_end', render: (d) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—') },
      ]}
      expandable={{ expandedRowRender: (r: any) => <MovementsTable serialId={r.id} /> }}
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
  const [snSearchInput, setSnSearchInput] = useState('')
  const [snSearch, setSnSearch] = useState('')
  const [warehouseId, setWarehouseId] = useState<string | undefined>()

  // Debounce nhẹ để gõ tới đâu lọc tới đó mà không bắn request mỗi lần nhấn phím.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    const t = setTimeout(() => setSnSearch(snSearchInput), 300)
    return () => clearTimeout(t)
  }, [snSearchInput])

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
        <Input
          placeholder="Tìm theo Serial No (không cần biết trước SKU/kho/lô)"
          allowClear
          style={{ width: 320 }}
          value={snSearchInput}
          onChange={(e) => setSnSearchInput(e.target.value)}
        />
      </Space>

      {snSearch ? (
        <SnSearchTable search={snSearch} />
      ) : (
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
      )}
    </div>
  )
}
