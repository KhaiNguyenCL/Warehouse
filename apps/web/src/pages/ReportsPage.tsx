import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Row, Col, Statistic, Card, Select, DatePicker, Table, Typography, InputNumber, Space } from 'antd'
import dayjs from 'dayjs'
import { api } from '../lib/api'
import { PageHeader } from '../components/PageHeader'

const { RangePicker } = DatePicker

function formatMoney(v: number) {
  return Number(v ?? 0).toLocaleString('vi-VN')
}

export default function ReportsPage() {
  const [warehouseId, setWarehouseId] = useState<string | undefined>()
  const [dateRange, setDateRange] = useState<[string | undefined, string | undefined]>([undefined, undefined])
  const [groupBy, setGroupBy] = useState<'day' | 'month'>('day')
  const [topLimit, setTopLimit] = useState(10)
  const [from, to] = dateRange

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => (await api.get('/warehouses')).data,
  })

  const { data: dashboard, isLoading: dashboardLoading } = useQuery({
    queryKey: ['reports', 'dashboard'],
    queryFn: async () => (await api.get('/reports/dashboard')).data,
  })

  const { data: invSummary, isLoading: invSummaryLoading } = useQuery({
    queryKey: ['reports', 'inventory', 'summary', warehouseId],
    queryFn: async () => (await api.get('/reports/inventory/summary', { params: { warehouse_id: warehouseId } })).data,
  })

  const { data: invByCategory, isLoading: invByCategoryLoading } = useQuery({
    queryKey: ['reports', 'inventory', 'by-category', warehouseId],
    queryFn: async () => (await api.get('/reports/inventory/by-category', { params: { warehouse_id: warehouseId } })).data,
  })

  const { data: revSummary, isLoading: revSummaryLoading } = useQuery({
    queryKey: ['reports', 'revenue', 'summary', from, to],
    queryFn: async () => (await api.get('/reports/revenue/summary', { params: { from, to } })).data,
  })

  const { data: revSeries, isLoading: revSeriesLoading } = useQuery({
    queryKey: ['reports', 'revenue', 'timeseries', from, to, groupBy],
    queryFn: async () => (await api.get('/reports/revenue/timeseries', { params: { from, to, group_by: groupBy } })).data,
  })

  const { data: topProducts, isLoading: topProductsLoading } = useQuery({
    queryKey: ['reports', 'revenue', 'top-products', from, to, topLimit],
    queryFn: async () => (await api.get('/reports/revenue/top-products', { params: { from, to, limit: topLimit } })).data,
  })

  return (
    <div>
      <PageHeader title="Báo cáo & Dashboard" />

      <Typography.Title level={5}>Tổng quan</Typography.Title>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}><Card loading={dashboardLoading}><Statistic title="Phiếu nhập chờ duyệt" value={dashboard?.pending_receipts} /></Card></Col>
        <Col span={6}><Card loading={dashboardLoading}><Statistic title="Phiếu xuất chờ duyệt" value={dashboard?.pending_deliveries} /></Card></Col>
        <Col span={6}><Card loading={dashboardLoading}><Statistic title="Phiếu chuyển chờ duyệt" value={dashboard?.pending_transfers} /></Card></Col>
        <Col span={6}><Card loading={dashboardLoading}><Statistic title="Kiểm kê đang diễn ra" value={dashboard?.active_stocktakes} /></Card></Col>
      </Row>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}><Card loading={dashboardLoading}><Statistic title="Báo giá sắp hết hạn (7 ngày)" value={dashboard?.quotations_expiring_soon} /></Card></Col>
        <Col span={6}><Card loading={dashboardLoading}><Statistic title="Tổng sản phẩm đang hoạt động" value={dashboard?.total_products} /></Card></Col>
        <Col span={6}><Card loading={dashboardLoading}><Statistic title="Tổng đối tác (KH/NCC)" value={dashboard?.total_companies} /></Card></Col>
      </Row>

      <Typography.Title level={5}>Tồn kho</Typography.Title>
      <Space style={{ marginBottom: 16 }}>
        <Select
          allowClear
          placeholder="Tất cả kho"
          style={{ width: 240 }}
          value={warehouseId}
          onChange={setWarehouseId}
          options={warehouses?.map((w: any) => ({ value: w.id, label: w.name }))}
        />
      </Space>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card loading={invSummaryLoading}><Statistic title="Số SKU" value={invSummary?.total_skus} /></Card></Col>
        <Col span={6}><Card loading={invSummaryLoading}><Statistic title="Tổng tồn" value={invSummary?.total_qty_on_hand} /></Card></Col>
        <Col span={6}><Card loading={invSummaryLoading}><Statistic title="Đang giữ chỗ" value={invSummary?.total_qty_reserved} /></Card></Col>
        <Col span={6}><Card loading={invSummaryLoading}><Statistic title="Giá trị tồn kho" value={formatMoney(invSummary?.total_value)} suffix="đ" /></Card></Col>
      </Row>
      <Table
        rowKey="category_id"
        loading={invByCategoryLoading}
        dataSource={invByCategory}
        pagination={false}
        size="small"
        style={{ marginBottom: 32 }}
        columns={[
          { title: 'Category', dataIndex: 'category_name', render: (v) => v ?? '(Không có category)' },
          { title: 'Số SKU', dataIndex: 'total_skus' },
          { title: 'Tổng tồn', dataIndex: 'total_qty_on_hand' },
          { title: 'Giá trị tồn kho', dataIndex: 'total_value', render: (v) => `${formatMoney(v)} đ` },
        ]}
      />

      <Typography.Title level={5}>Doanh thu</Typography.Title>
      <Space style={{ marginBottom: 16 }}>
        <RangePicker
          onChange={(_, dateStrings) => setDateRange([dateStrings[0] || undefined, dateStrings[1] || undefined])}
        />
        <Select
          value={groupBy}
          onChange={setGroupBy}
          options={[
            { value: 'day', label: 'Theo ngày' },
            { value: 'month', label: 'Theo tháng' },
          ]}
        />
      </Space>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}><Card loading={revSummaryLoading}><Statistic title="Tổng doanh thu" value={formatMoney(revSummary?.total_revenue)} suffix="đ" /></Card></Col>
        <Col span={8}><Card loading={revSummaryLoading}><Statistic title="Số phiếu xuất" value={revSummary?.total_orders} /></Card></Col>
        <Col span={8}><Card loading={revSummaryLoading}><Statistic title="Tổng số lượng đã xuất" value={revSummary?.total_qty} /></Card></Col>
      </Row>
      <Table
        rowKey="period"
        loading={revSeriesLoading}
        dataSource={revSeries}
        pagination={false}
        size="small"
        style={{ marginBottom: 32 }}
        columns={[
          { title: groupBy === 'month' ? 'Tháng' : 'Ngày', dataIndex: 'period', render: (v) => dayjs(v).format(groupBy === 'month' ? 'MM/YYYY' : 'DD/MM/YYYY') },
          { title: 'Doanh thu', dataIndex: 'revenue', render: (v) => `${formatMoney(v)} đ` },
          { title: 'Số phiếu xuất', dataIndex: 'orders' },
        ]}
      />

      <Typography.Title level={5}>
        Top sản phẩm bán chạy{' '}
        <InputNumber size="small" min={1} max={50} value={topLimit} onChange={(v) => setTopLimit(v || 10)} style={{ width: 70 }} />
      </Typography.Title>
      <Table
        rowKey="variant_id"
        loading={topProductsLoading}
        dataSource={topProducts}
        pagination={false}
        size="small"
        columns={[
          { title: 'SKU', dataIndex: 'sku' },
          { title: 'Tên', dataIndex: 'variant_name' },
          { title: 'Số lượng đã bán', dataIndex: 'total_qty' },
          { title: 'Doanh thu', dataIndex: 'total_revenue', render: (v) => `${formatMoney(v)} đ` },
        ]}
      />
    </div>
  )
}
