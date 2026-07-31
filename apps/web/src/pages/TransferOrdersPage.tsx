import { Table, Input, Button } from 'antd'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { useTransferOrders } from '../hooks/useTransferOrders'
import { PageHeader } from '../components/ui/PageHeader'
import { TableCard, FilterChip } from '../components/ui/TableCard'
import { StatusBadge } from '../components/ui/StatusBadge'

const STATUS_OPTIONS = ['draft', 'pending_approval', 'approved', 'completed', 'cancelled'] as const

const TRANSFER_TYPE_LABEL: Record<string, string> = {
  transfer: 'Chuyển kho', warranty_in: 'Nhận lại BH', demo_in: 'Nhận lại demo',
  qc_pass: 'QC đạt', sn_ready: 'Đã nhập SN',
}

export default function TransferOrdersPage() {
  const hook = useTransferOrders()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader
        title="Phiếu chuyển kho"
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => hook.navigate('/transfers/new')}>
            Tạo phiếu chuyển
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
            placeholder="Tìm mã phiếu…"
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
          onRow={(record: any) => ({ onClick: () => hook.navigate(`/transfers/${record.id}`), style: { cursor: 'pointer' } })}
          columns={[
            { title: 'STT', width: 52, align: 'center' as const, render: (_: any, __: any, i: number) => i + 1 },
            { title: 'Mã phiếu', dataIndex: 'code', width: 130 },
            { title: 'Loại chuyển', dataIndex: 'transfer_type', render: (v: string) => TRANSFER_TYPE_LABEL[v] ?? v },
            { title: 'Kho nguồn', dataIndex: 'from_warehouse_name' },
            { title: 'Kho đích', dataIndex: 'to_warehouse_name' },
            { title: 'Trạng thái', dataIndex: 'status', render: (s: string) => <StatusBadge status={s} /> },
            { title: 'Ngày tạo', dataIndex: 'created_at', width: 110, render: (d: string) => d ? new Date(d).toLocaleDateString('vi-VN') : '—' },
          ]}
        />
      </TableCard>
    </div>
  )
}
