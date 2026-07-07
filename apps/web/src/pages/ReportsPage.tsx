import { Row, Col, Statistic, Card, Select, DatePicker, Table, Typography, InputNumber, Space } from 'antd'
import dayjs from 'dayjs'
import { useReports } from '../hooks/useReports'
import { PageHeader } from '../components/PageHeader'

const { RangePicker } = DatePicker

function formatMoney(v: number) {
  return Number(v ?? 0).toLocaleString('vi-VN')
}

export default function ReportsPage() {
  const hook = useReports()

  return (
    <div>
      <PageHeader title="Báo cáo & Dashboard" />

      <Typography.Title level={5}>Tổng quan</Typography.Title>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}><Card loading={hook.dashboardLoading}><Statistic title="Phiếu nhập chờ duyệt" value={hook.dashboard?.pending_receipts} /></Card></Col>
        <Col span={6}><Card loading={hook.dashboardLoading}><Statistic title="Phiếu xuất chờ duyệt" value={hook.dashboard?.pending_deliveries} /></Card></Col>
        <Col span={6}><Card loading={hook.dashboardLoading}><Statistic title="Phiếu chuyển chờ duyệt" value={hook.dashboard?.pending_transfers} /></Card></Col>
        <Col span={6}><Card loading={hook.dashboardLoading}><Statistic title="Kiểm kê đang diễn ra" value={hook.dashboard?.active_stocktakes} /></Card></Col>
      </Row>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}><Card loading={hook.dashboardLoading}><Statistic title="Báo giá sắp hết hạn (7 ngày)" value={hook.dashboard?.quotations_expiring_soon} /></Card></Col>
        <Col span={6}><Card loading={hook.dashboardLoading}><Statistic title="Tổng sản phẩm đang hoạt động" value={hook.dashboard?.total_products} /></Card></Col>
        <Col span={6}><Card loading={hook.dashboardLoading}><Statistic title="Tổng đối tác (KH/NCC)" value={hook.dashboard?.total_companies} /></Card></Col>
      </Row>

      <Typography.Title level={5}>Tồn kho</Typography.Title>
      <Space style={{ marginBottom: 16 }}>
        <Select
          allowClear
          placeholder="Tất cả kho"
          style={{ width: 240 }}
          value={hook.warehouseId}
          onChange={hook.setWarehouseId}
          options={hook.warehouses?.map((w: any) => ({ value: w.id, label: w.name }))}
        />
      </Space>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card loading={hook.invSummaryLoading}><Statistic title="Số SKU" value={hook.invSummary?.total_skus} /></Card></Col>
        <Col span={6}><Card loading={hook.invSummaryLoading}><Statistic title="Tổng tồn" value={hook.invSummary?.total_qty_on_hand} /></Card></Col>
        <Col span={6}><Card loading={hook.invSummaryLoading}><Statistic title="Đang giữ chỗ" value={hook.invSummary?.total_qty_reserved} /></Card></Col>
        <Col span={6}><Card loading={hook.invSummaryLoading}><Statistic title="Giá trị tồn kho" value={formatMoney(hook.invSummary?.total_value)} suffix="đ" /></Card></Col>
      </Row>
      <Table
        rowKey="category_id"
        loading={hook.invByCategoryLoading}
        dataSource={hook.invByCategory}
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
          onChange={(_, dateStrings) => hook.setDateRange([dateStrings[0] || undefined, dateStrings[1] || undefined])}
        />
        <Select
          value={hook.groupBy}
          onChange={hook.setGroupBy}
          options={[
            { value: 'day', label: 'Theo ngày' },
            { value: 'month', label: 'Theo tháng' },
          ]}
        />
      </Space>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}><Card loading={hook.revSummaryLoading}><Statistic title="Tổng doanh thu" value={formatMoney(hook.revSummary?.total_revenue)} suffix="đ" /></Card></Col>
        <Col span={8}><Card loading={hook.revSummaryLoading}><Statistic title="Số phiếu xuất" value={hook.revSummary?.total_orders} /></Card></Col>
        <Col span={8}><Card loading={hook.revSummaryLoading}><Statistic title="Tổng số lượng đã xuất" value={hook.revSummary?.total_qty} /></Card></Col>
      </Row>
      <Table
        rowKey="period"
        loading={hook.revSeriesLoading}
        dataSource={hook.revSeries}
        pagination={false}
        size="small"
        style={{ marginBottom: 32 }}
        columns={[
          { title: hook.groupBy === 'month' ? 'Tháng' : 'Ngày', dataIndex: 'period', render: (v) => dayjs(v).format(hook.groupBy === 'month' ? 'MM/YYYY' : 'DD/MM/YYYY') },
          { title: 'Doanh thu', dataIndex: 'revenue', render: (v) => `${formatMoney(v)} đ` },
          { title: 'Số phiếu xuất', dataIndex: 'orders' },
        ]}
      />

      <Typography.Title level={5}>
        Top sản phẩm bán chạy{' '}
        <InputNumber size="small" min={1} max={50} value={hook.topLimit} onChange={(v) => hook.setTopLimit(v || 10)} style={{ width: 70 }} />
      </Typography.Title>
      <Table
        rowKey="variant_id"
        loading={hook.topProductsLoading}
        dataSource={hook.topProducts}
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
