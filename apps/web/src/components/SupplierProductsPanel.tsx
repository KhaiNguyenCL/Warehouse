import { useQuery } from '@tanstack/react-query'
import { Table, Tag } from 'antd'
import { api } from '../lib/api'

export default function SupplierProductsPanel({ companyId }: { companyId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['companies', companyId, 'supplied-variants'],
    queryFn: async () => (await api.get(`/companies/${companyId}/supplied-variants`)).data,
  })

  if (!isLoading && (!data || data.length === 0)) return null

  return (
    <div>
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
          { title: 'Mã hàng', dataIndex: 'item_code' },
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
