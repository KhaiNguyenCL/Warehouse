import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Table, Input, Select, Space, Tag, Button, Form, Modal, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useInventory } from '../hooks/useInventory'
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

// Modal edit SN — chỉ cho sửa mac_address và note
function EditSnModal({
  sn,
  onClose,
  queryKey,
}: {
  sn: { id: string; serial_no: string; mac_address: string | null; note: string | null } | null
  onClose: () => void
  queryKey: unknown[]
}) {
  const [form] = Form.useForm()
  const qc = useQueryClient()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (sn) form.setFieldsValue({ serial_no: sn.serial_no, mac_address: sn.mac_address ?? '', note: sn.note ?? '' })
  }, [sn, form])

  async function onOk() {
    const values = form.getFieldsValue()
    setSaving(true)
    try {
      await api.patch(`/inventory/serials/${sn!.id}`, {
        serial_no:   values.serial_no,
        mac_address: values.mac_address || null,
        note:        values.note || null,
      })
      message.success('Đã cập nhật')
      qc.invalidateQueries({ queryKey })
      onClose()
    } catch {
      message.error('Lưu thất bại')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={`Sửa SN: ${sn?.serial_no}`}
      open={!!sn}
      onCancel={onClose}
      onOk={onOk}
      confirmLoading={saving}
      okText="Lưu"
      width={420}
    >
      <Form form={form} layout="vertical">
        <Form.Item name="serial_no" label="Serial No" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="mac_address" label="MAC Address">
          <Input placeholder="AA:BB:CC:DD:EE:FF" allowClear />
        </Form.Item>
        <Form.Item name="note" label="Ghi chú">
          <Input.TextArea rows={2} allowClear />
        </Form.Item>
      </Form>
    </Modal>
  )
}

// Drill-down sâu nhất: từng SN vật lý của 1 lô — mở bằng expand row (không phải popup) khi
// bấm mũi tên trên 1 dòng của LotsTable.
function SerialsTable({ receiptLineId }: { receiptLineId: string }) {
  const queryKey = ['inventory', 'serials', receiptLineId]
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => (await api.get('/inventory/serials', { params: { receipt_line_id: receiptLineId } })).data,
  })
  const [editSn, setEditSn] = useState<any>(null)

  return (
    <>
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
          { title: 'MAC', dataIndex: 'mac_address', render: (v: string | null) => v ?? <span style={{ color: '#bbb' }}>Chưa có</span> },
          { title: 'Hết BH hãng', dataIndex: 'manufacturer_warranty_end', render: (d: string | null) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—') },
          { title: 'Hết BH cty', dataIndex: 'customer_warranty_end', render: (d: string | null) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—') },
          {
            title: '',
            width: 60,
            render: (_: any, r: any) => (
              <Button size="small" onClick={() => setEditSn(r)}>Sửa</Button>
            ),
          },
        ]}
      />
      <EditSnModal sn={editSn} onClose={() => setEditSn(null)} queryKey={queryKey} />
    </>
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
        { title: 'Hết BH hãng', dataIndex: 'manufacturer_warranty_end', render: (d: string | null) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—') },
        { title: 'Hết BH cty', dataIndex: 'customer_warranty_end', render: (d: string | null) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—') },
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
        { title: 'PO', dataIndex: 'po_code', render: (v: string | null) => v ?? '—' },
        { title: 'NCC', dataIndex: 'company_name' },
        { title: 'Ngày hoàn thành', dataIndex: 'completed_at', render: (d) => new Date(d).toLocaleDateString('vi-VN') },
        { title: 'SL nhập', dataIndex: 'quantity' },
        { title: 'Còn lại', dataIndex: 'qty_remaining' },
        { title: 'Giá nhập', dataIndex: 'cost_price' },
        { title: 'BH hãng (tháng)', dataIndex: 'manufacturer_warranty_months' },
        { title: 'BH cty (tháng)', dataIndex: 'customer_warranty_months' },
      ]}
      expandable={{ expandedRowRender: (r: any) => <SerialsTable receiptLineId={r.receipt_line_id} /> }}
    />
  )
}

export default function InventoryPage() {
  const hook = useInventory()

  return (
    <div>
      <PageHeader title="Tồn kho" />

      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder="Tìm theo SKU hoặc tên sản phẩm"
          allowClear
          style={{ width: 280 }}
          value={hook.searchInput}
          onChange={(e) => hook.setSearchInput(e.target.value)}
        />
        <Select
          allowClear
          placeholder="Tất cả kho"
          style={{ width: 220 }}
          options={hook.warehouses?.map((w: any) => ({ value: w.id, label: w.name }))}
          onChange={hook.setWarehouseId}
        />
        <Input
          placeholder="Tìm theo Serial No (không cần biết trước SKU/kho/lô)"
          allowClear
          style={{ width: 320 }}
          value={hook.snSearchInput}
          onChange={(e) => hook.setSnSearchInput(e.target.value)}
        />
      </Space>

      {hook.snSearch ? (
        <SnSearchTable search={hook.snSearch} />
      ) : (
        <Table
          rowKey={(r: any) => `${r.variant_id}-${r.warehouse_id}`}
          loading={hook.isLoading}
          dataSource={hook.data?.data}
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
