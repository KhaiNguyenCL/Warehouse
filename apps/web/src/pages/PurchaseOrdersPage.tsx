import { Table, Button } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { usePurchaseOrders } from '../hooks/usePurchaseOrders'
import { PageHeader } from '../components/PageHeader'
import { TableCard } from '../components/ui/TableCard'
import { StatusBadge } from '../components/ui/StatusBadge'

export default function PurchaseOrdersPage() {
  const hook = usePurchaseOrders()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader
        title="Phiếu mua hàng"
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => hook.navigate('/purchase-orders/new')}>
            Tạo phiếu mua hàng
          </Button>
        }
      />
      <TableCard>
        <Table
          rowKey="id"
          loading={hook.isLoading}
          dataSource={hook.data?.data}
          pagination={{ current: hook.page, pageSize: 20, total: hook.data?.total, onChange: hook.setPage, showSizeChanger: false, showTotal: (t) => `Tổng ${t}` }}
          onRow={(record: any) => ({ onClick: () => hook.navigate(`/purchase-orders/${record.id}`), style: { cursor: 'pointer' } })}
          columns={[
            { title: 'STT', width: 52, align: 'center' as const, render: (_: any, __: any, i: number) => i + 1 },
            { title: 'Bitrix ID', dataIndex: 'bitrix_deal_id', render: (v: string) => v ?? '—' },
            { title: 'Tên', dataIndex: 'deal_title', render: (v: string) => v ?? '—' },
            {
              title: 'Tổng tiền', dataIndex: 'total_amount', align: 'right' as const,
              render: (v: number) => v ? Math.round(v).toLocaleString('en-US') : '—',
            },
            { title: 'Trạng thái', dataIndex: 'status', render: (s: string) => <StatusBadge status={s} /> },
            { title: 'Người tạo', dataIndex: 'created_by_name', render: (v: string) => v ?? '—' },
            { title: 'Người duyệt', dataIndex: 'confirmed_by_name', render: (v: string) => v ?? '—' },
            { title: 'Ngày tạo', dataIndex: 'created_at', render: (d: string) => new Date(d).toLocaleDateString('vi-VN') },
          ]}
        />
      </TableCard>
    </div>
  )
}
