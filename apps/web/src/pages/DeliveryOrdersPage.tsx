import { Table, Input, Button } from 'antd'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { useDeliveryOrders } from '../hooks/useDeliveryOrders'
import { PageHeader } from '../components/ui/PageHeader'
import { TableCard, FilterChip } from '../components/ui/TableCard'
import { StatusBadge } from '../components/ui/StatusBadge'

const STATUS_OPTIONS = ['draft', 'pending_approval', 'approved', 'completed', 'cancelled'] as const

const EXPORT_TYPE_LABEL: Record<string, string> = {
  sale: 'Bán hàng', internal: 'Xuất nội bộ', demo_out: 'Cho mượn demo',
  warranty_out: 'Gửi bảo hành', return_out: 'Trả NCC', dispose: 'Huỷ hàng', adjustment: 'Điều chỉnh',
}

export default function DeliveryOrdersPage() {
  const hook = useDeliveryOrders()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader
        title="Phiếu xuất kho"
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => hook.navigate('/deliveries/new')}>
            Tạo phiếu xuất
          </Button>
        }
      />

      <TableCard
        toolbar={STATUS_OPTIONS.map((s) => (
          <FilterChip key={s} label={<StatusBadge status={s} />} active={hook.status === s} onClick={() => hook.setStatus(hook.status === s ? undefined : s)} />
        ))}
        actions={
          <Input
            prefix={<SearchOutlined style={{ color: 'var(--text-3)', fontSize: 13 }} />}
            placeholder="Tìm mã phiếu, lý do…"
            allowClear
            style={{ width: 220, height: 28, fontSize: 13 }}
            value={hook.searchInput}
            onChange={(e) => hook.setSearchInput(e.target.value)}
          />
        }
      >
        <Table
          rowKey="id"
          loading={hook.isLoading}
          dataSource={hook.data?.data}
          pagination={{ current: hook.page, pageSize: 20, total: hook.data?.total, onChange: hook.setPage, showSizeChanger: false, showTotal: (t) => `Tổng ${t}` }}
          onRow={(record: any) => ({ onClick: () => hook.navigate(`/deliveries/${record.id}`), style: { cursor: 'pointer' } })}
          columns={[
            { title: 'STT', width: 52, align: 'center' as const, render: (_: any, __: any, i: number) => i + 1 },
            { title: 'Mã phiếu', dataIndex: 'code', width: 130 },
            { title: 'Loại xuất', dataIndex: 'export_type', render: (v: string) => EXPORT_TYPE_LABEL[v] ?? v },
            { title: 'Khách hàng / NCC', dataIndex: 'company_name' },
            { title: 'Kho', dataIndex: 'warehouse_name' },
            { title: 'Trạng thái', dataIndex: 'status', render: (s: string) => <StatusBadge status={s} /> },
            { title: 'Ngày tạo', dataIndex: 'created_at', width: 110, render: (d: string) => d ? new Date(d).toLocaleDateString('vi-VN') : '—' },
          ]}
        />
      </TableCard>
    </div>
  )
}
