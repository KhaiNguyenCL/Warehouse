import { Table, Input, Button } from 'antd'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { useQuotations } from '../hooks/useQuotations'
import { PageHeader } from '../components/PageHeader'
import { TableCard, FilterChip } from '../components/ui/TableCard'
import { StatusBadge } from '../components/ui/StatusBadge'

const STATUS_OPTIONS = ['draft', 'confirmed', 'expired', 'cancelled'] as const

export default function QuotationsPage() {
  const hook = useQuotations()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader
        title="Báo giá"
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => hook.navigate('/quotations/new')}>
            Tạo báo giá
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
            placeholder="Tìm mã, tên dự án…"
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
          onRow={(record: any) => ({ onClick: () => hook.navigate(`/quotations/${record.id}`), style: { cursor: 'pointer' } })}
          columns={[
            { title: 'STT', width: 52, align: 'center' as const, render: (_: any, __: any, i: number) => i + 1 },
            { title: 'Mã báo giá', dataIndex: 'code' },
            { title: 'Khách hàng', dataIndex: 'company_name' },
            { title: 'Dự án', dataIndex: 'project_name' },
            { title: 'Trạng thái', dataIndex: 'status', render: (s: string) => <StatusBadge status={s} /> },
            { title: 'Tổng tiền', dataIndex: 'grand_total', align: 'right' as const, render: (v: any) => v != null ? Number(v).toLocaleString('en-US') : '—' },
            { title: 'Hết hạn', dataIndex: 'expired_at', render: (d: string) => d ? new Date(d).toLocaleDateString('vi-VN') : '—' },
            { title: 'Ngày tạo', dataIndex: 'created_at', render: (d: string) => new Date(d).toLocaleDateString('vi-VN') },
          ]}
        />
      </TableCard>
    </div>
  )
}
