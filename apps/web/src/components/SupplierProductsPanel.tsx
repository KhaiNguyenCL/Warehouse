import { useQuery } from '@tanstack/react-query'
import { Table, Tag, Typography } from 'antd'
import { api } from '../lib/api'

export default function SupplierProductsPanel({ companyId }: { companyId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['companies', companyId, 'supplied-variants'],
    queryFn: async () => (await api.get(`/companies/${companyId}/supplied-variants`)).data,
  })

  if (!isLoading && (!data || data.length === 0)) return null

  return (
    <div style={{ marginTop: 24, borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
      <Typography.Title level={5} style={{ margin: '0 0 12px' }}>Hàng hóa cung cấp</Typography.Title>
      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={data}
        pagination={false}
        size="small"
        columns={[
          {
            title: 'Sản phẩm',
            render: (_: any, r: any) => `${r.product_code} — ${r.product_name}`,
          },
          { title: 'SKU', dataIndex: 'sku' },
          { title: 'Tên SKU', dataIndex: 'variant_name' },
          { title: 'SKU của NCC', dataIndex: 'supplier_sku' },
          {
            title: 'Giá NCC',
            dataIndex: 'supplier_price',
            render: (v: number) => v != null ? v.toLocaleString('vi-VN') : '—',
          },
          { title: 'Lead time', dataIndex: 'lead_time_days', render: (v: number) => v != null ? `${v} ngày` : '—' },
          {
            title: 'Ưu tiên',
            dataIndex: 'is_preferred',
            width: 80,
            render: (v: boolean) => v ? <Tag color="blue">Ưu tiên</Tag> : null,
          },
        ]}
      />
    </div>
  )
}
