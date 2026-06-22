import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Table, Button, Modal } from 'antd'
import { api } from '../lib/api'
import { PageHeader } from '../components/PageHeader'
import { StatusTag } from '../components/StatusTag'

const SN_STATUS_COLOR: Record<string, string> = { active: 'blue', sold: 'default', disposed: 'red' }

export default function InventoryPage() {
  const [lotsFor, setLotsFor] = useState<{ variant_id: string; warehouse_id: string; label: string } | null>(null)
  const [serialsFor, setSerialsFor] = useState<{ receipt_line_id: string; label: string } | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => (await api.get('/inventory')).data,
    refetchInterval: 5000, // tự refetch để thấy số liệu cập nhật ngay sau khi Complete Receipt ở tab khác
  })

  const { data: lots, isLoading: lotsLoading } = useQuery({
    queryKey: ['inventory', 'lots', lotsFor?.variant_id, lotsFor?.warehouse_id],
    queryFn: async () =>
      (
        await api.get('/inventory/lots', {
          params: { variant_id: lotsFor!.variant_id, warehouse_id: lotsFor!.warehouse_id },
        })
      ).data,
    enabled: !!lotsFor,
  })

  // Chi tiết từng SN vật lý của 1 lô — drill-down sâu hơn /lots.
  const { data: serials, isLoading: serialsLoading } = useQuery({
    queryKey: ['inventory', 'serials', serialsFor?.receipt_line_id],
    queryFn: async () =>
      (await api.get('/inventory/serials', { params: { receipt_line_id: serialsFor!.receipt_line_id } })).data,
    enabled: !!serialsFor,
  })

  return (
    <div>
      <PageHeader title="Tồn kho" />
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
          {
            title: '',
            render: (_: any, r: any) => (
              <Button
                size="small"
                onClick={() =>
                  setLotsFor({ variant_id: r.variant_id, warehouse_id: r.warehouse_id, label: `${r.sku} — ${r.warehouse_name}` })
                }
              >
                Xem lô
              </Button>
            ),
          },
        ]}
      />

      <Modal
        title={`Lô hàng — ${lotsFor?.label ?? ''}`}
        open={!!lotsFor}
        onCancel={() => setLotsFor(null)}
        footer={null}
        width={900}
      >
        <Table
          rowKey="receipt_line_id"
          loading={lotsLoading}
          dataSource={lots}
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
            {
              title: '',
              render: (_: any, r: any) => (
                <Button
                  size="small"
                  onClick={() => setSerialsFor({ receipt_line_id: r.receipt_line_id, label: r.receipt_code })}
                >
                  Xem SN
                </Button>
              ),
            },
          ]}
        />
      </Modal>

      <Modal
        title={`Serial Number — lô ${serialsFor?.label ?? ''}`}
        open={!!serialsFor}
        onCancel={() => setSerialsFor(null)}
        footer={null}
        width={700}
      >
        <Table
          rowKey="id"
          loading={serialsLoading}
          dataSource={serials}
          pagination={false}
          size="small"
          columns={[
            { title: 'Serial No', dataIndex: 'serial_no' },
            { title: 'Trạng thái', dataIndex: 'status', render: (s) => <StatusTag status={s} colorMap={SN_STATUS_COLOR} /> },
            { title: 'Kho hiện tại', dataIndex: 'warehouse_name' },
            { title: 'MAC', dataIndex: 'mac_address' },
            {
              title: 'Hết bảo hành',
              dataIndex: 'warranty_end',
              render: (d) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—'),
            },
          ]}
        />
      </Modal>
    </div>
  )
}
