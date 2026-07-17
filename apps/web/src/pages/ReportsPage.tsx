import { Select, DatePicker, Table, Space, Divider } from 'antd'
import {
  InboxOutlined,
  FileTextOutlined,
  SwapOutlined,
  AuditOutlined,
  ClockCircleOutlined,
  AppstoreOutlined,
  TeamOutlined,
  DatabaseOutlined,
  RiseOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { useReports } from '../hooks/useReports'
import { PageHeader } from '../components/ui/PageHeader'
import { StatCard } from '../components/ui/StatCard'
import { TableCard } from '../components/ui/TableCard'

const { RangePicker } = DatePicker

function fmt(v: number | undefined) {
  return Number(v ?? 0).toLocaleString('vi-VN')
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', margin: '8px 0 14px' }}>
      {children}
    </div>
  )
}

export default function ReportsPage() {
  const hook = useReports()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <PageHeader title="Dashboard & Báo cáo" />

      {/* ── Tổng quan hoạt động ── */}
      <div>
        <SectionTitle>Hoạt động đang chờ xử lý</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          <StatCard
            label="Phiếu nhập chờ duyệt"
            value={hook.dashboard?.pending_receipts ?? '—'}
            icon={<InboxOutlined style={{ fontSize: 18 }} />}
            iconColor="blue"
            loading={hook.dashboardLoading}
          />
          <StatCard
            label="Phiếu xuất chờ duyệt"
            value={hook.dashboard?.pending_deliveries ?? '—'}
            icon={<FileTextOutlined style={{ fontSize: 18 }} />}
            iconColor="amber"
            loading={hook.dashboardLoading}
          />
          <StatCard
            label="Phiếu chuyển chờ duyệt"
            value={hook.dashboard?.pending_transfers ?? '—'}
            icon={<SwapOutlined style={{ fontSize: 18 }} />}
            iconColor="purple"
            loading={hook.dashboardLoading}
          />
          <StatCard
            label="Kiểm kê đang diễn ra"
            value={hook.dashboard?.active_stocktakes ?? '—'}
            icon={<AuditOutlined style={{ fontSize: 18 }} />}
            iconColor="green"
            loading={hook.dashboardLoading}
          />
        </div>
      </div>

      <div>
        <SectionTitle>Tổng quan hệ thống</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          <StatCard
            label="Báo giá sắp hết hạn (7 ngày)"
            value={hook.dashboard?.quotations_expiring_soon ?? '—'}
            icon={<ClockCircleOutlined style={{ fontSize: 18 }} />}
            iconColor="red"
            loading={hook.dashboardLoading}
          />
          <StatCard
            label="Sản phẩm đang hoạt động"
            value={hook.dashboard?.total_products ?? '—'}
            icon={<AppstoreOutlined style={{ fontSize: 18 }} />}
            iconColor="blue"
            loading={hook.dashboardLoading}
          />
          <StatCard
            label="Tổng đối tác (KH / NCC)"
            value={hook.dashboard?.total_companies ?? '—'}
            icon={<TeamOutlined style={{ fontSize: 18 }} />}
            iconColor="purple"
            loading={hook.dashboardLoading}
          />
        </div>
      </div>

      <Divider style={{ margin: '4px 0' }} />

      {/* ── Tồn kho ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <SectionTitle>Tồn kho</SectionTitle>
          <Select
            allowClear
            placeholder="Tất cả kho"
            style={{ width: 220 }}
            value={hook.warehouseId}
            onChange={hook.setWarehouseId}
            options={hook.warehouses?.map((w: any) => ({ value: w.id, label: w.name }))}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 18 }}>
          <StatCard
            label="Số SKU"
            value={fmt(hook.invSummary?.total_skus)}
            icon={<AppstoreOutlined style={{ fontSize: 18 }} />}
            iconColor="blue"
            loading={hook.invSummaryLoading}
          />
          <StatCard
            label="Tổng tồn kho"
            value={fmt(hook.invSummary?.total_qty_on_hand)}
            icon={<DatabaseOutlined style={{ fontSize: 18 }} />}
            iconColor="green"
            loading={hook.invSummaryLoading}
          />
          <StatCard
            label="Đang giữ chỗ"
            value={fmt(hook.invSummary?.total_qty_reserved)}
            icon={<ClockCircleOutlined style={{ fontSize: 18 }} />}
            iconColor="amber"
            loading={hook.invSummaryLoading}
          />
          <StatCard
            label="Giá trị tồn kho"
            value={`${fmt(hook.invSummary?.total_value)} đ`}
            icon={<DatabaseOutlined style={{ fontSize: 18 }} />}
            iconColor="purple"
            loading={hook.invSummaryLoading}
          />
        </div>

        <TableCard title="Tồn kho theo danh mục">
          <Table
            rowKey="category_id"
            loading={hook.invByCategoryLoading}
            dataSource={hook.invByCategory}
            pagination={false}
            size="small"
            columns={[
              {
                title: 'Danh mục',
                dataIndex: 'category_name',
                render: (v: string) => v ?? <span style={{ color: 'var(--text-3)' }}>(Không có danh mục)</span>,
              },
              { title: 'Số SKU', dataIndex: 'total_skus', align: 'right', width: 100 },
              { title: 'Tổng tồn', dataIndex: 'total_qty_on_hand', align: 'right', width: 120 },
              {
                title: 'Giá trị tồn kho',
                dataIndex: 'total_value',
                align: 'right',
                width: 160,
                render: (v: number) => `${fmt(v)} đ`,
              },
            ]}
          />
        </TableCard>
      </div>

      <Divider style={{ margin: '4px 0' }} />

      {/* ── Doanh thu ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <SectionTitle>Doanh thu</SectionTitle>
          <Space>
            <RangePicker
              onChange={(_, s) => hook.setDateRange([s[0] || undefined, s[1] || undefined])}
            />
            <Select
              value={hook.groupBy}
              onChange={hook.setGroupBy}
              style={{ width: 130 }}
              options={[
                { value: 'day',   label: 'Theo ngày' },
                { value: 'month', label: 'Theo tháng' },
              ]}
            />
          </Space>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 18 }}>
          <StatCard
            label="Tổng doanh thu"
            value={`${fmt(hook.revSummary?.total_revenue)} đ`}
            icon={<RiseOutlined style={{ fontSize: 18 }} />}
            iconColor="green"
            loading={hook.revSummaryLoading}
          />
          <StatCard
            label="Số phiếu xuất hoàn thành"
            value={fmt(hook.revSummary?.total_orders)}
            icon={<FileTextOutlined style={{ fontSize: 18 }} />}
            iconColor="blue"
            loading={hook.revSummaryLoading}
          />
          <StatCard
            label="Tổng số lượng đã xuất"
            value={fmt(hook.revSummary?.total_qty)}
            icon={<ShoppingCartOutlined style={{ fontSize: 18 }} />}
            iconColor="purple"
            loading={hook.revSummaryLoading}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <TableCard title={hook.groupBy === 'month' ? 'Doanh thu theo tháng' : 'Doanh thu theo ngày'}>
            <Table
              rowKey="period"
              loading={hook.revSeriesLoading}
              dataSource={hook.revSeries}
              pagination={false}
              size="small"
              columns={[
                {
                  title: hook.groupBy === 'month' ? 'Tháng' : 'Ngày',
                  dataIndex: 'period',
                  render: (v: string) => dayjs(v).format(hook.groupBy === 'month' ? 'MM/YYYY' : 'DD/MM/YYYY'),
                },
                {
                  title: 'Doanh thu',
                  dataIndex: 'revenue',
                  align: 'right',
                  render: (v: number) => `${fmt(v)} đ`,
                },
                { title: 'Phiếu xuất', dataIndex: 'orders', align: 'right', width: 90 },
              ]}
            />
          </TableCard>

          <TableCard
            title="Top sản phẩm bán chạy"
            actions={
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-2)' }}>
                Top
                <input
                  type="number"
                  min={1} max={50}
                  value={hook.topLimit}
                  onChange={(e) => hook.setTopLimit(Number(e.target.value) || 10)}
                  style={{
                    width: 52,
                    height: 26,
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    padding: '0 6px',
                    fontSize: 13,
                    textAlign: 'center',
                  }}
                />
              </div>
            }
          >
            <Table
              rowKey="variant_id"
              loading={hook.topProductsLoading}
              dataSource={hook.topProducts}
              pagination={false}
              size="small"
              columns={[
                { title: '#', render: (_: any, __: any, i: number) => i + 1, width: 36 },
                { title: 'Mã hàng', dataIndex: 'item_code', width: 120 },
                { title: 'Tên sản phẩm', dataIndex: 'variant_name' },
                { title: 'SL bán', dataIndex: 'total_qty', align: 'right', width: 80 },
                {
                  title: 'Doanh thu',
                  dataIndex: 'total_revenue',
                  align: 'right',
                  width: 140,
                  render: (v: number) => `${fmt(v)} đ`,
                },
              ]}
            />
          </TableCard>
        </div>
      </div>
    </div>
  )
}
