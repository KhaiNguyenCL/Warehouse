import { useState } from 'react'
import { Table, Button } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { PageHeader } from '../components/PageHeader'
import { TableCard } from '../components/ui/TableCard'
import { StatusBadge } from '../components/ui/StatusBadge'

export default function ReceiptsPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['receipts', page],
    queryFn: async () => (await api.get('/receipts', { params: { page, limit: 20 } })).data,
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader
        title="Phiếu nhập kho"
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/receipts/new')}>
            Tạo phiếu nhập
          </Button>
        }
      />
      <TableCard>
        <Table
          rowKey="id"
          loading={isLoading}
          dataSource={data?.data}
          pagination={{
            current: page,
            pageSize: 20,
            total: data?.total,
            onChange: setPage,
            showSizeChanger: false,
            showTotal: (t) => `Tổng ${t}`,
          }}
          onRow={(record: any) => ({
            onClick: () => navigate(`/receipts/${record.id}`),
            style: { cursor: 'pointer' },
          })}
          columns={[
            { title: 'STT', width: 52, align: 'center' as const, render: (_: any, __: any, i: number) => (page - 1) * 20 + i + 1 },
            { title: 'Mã phiếu', dataIndex: 'code' },
            { title: 'Loại nhập', dataIndex: 'import_type' },
            { title: 'Kho', dataIndex: 'warehouse_name' },
            { title: 'Trạng thái', dataIndex: 'status', render: (s: string) => <StatusBadge status={s} /> },
          ]}
        />
      </TableCard>
    </div>
  )
}
