import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Table, InputNumber, Button, Space } from 'antd'
import { api } from '../lib/api'
import { useApiMutation } from '../hooks/useApiMutation'
import { fw } from '../styles/fieldWidths'
import VariantSelect from './VariantSelect'

interface Props {
  productId: string
  variantId: string
}

export default function BundleItemsPanel({ productId, variantId }: Props) {
  const [itemVariantId, setItemVariantId] = useState<string | undefined>()
  const [quantity, setQuantity] = useState<number>(1)

  const { data: items, isLoading } = useQuery({
    queryKey: ['products', productId, 'variants', variantId, 'bundle-items'],
    queryFn: async () => (await api.get(`/products/${productId}/variants/${variantId}/bundle-items`)).data,
  })

  const invalidate = { invalidateKey: ['products', productId, 'variants', variantId, 'bundle-items'] }

  const addMutation = useApiMutation(
    () => api.post(`/products/${productId}/variants/${variantId}/bundle-items`, { item_variant_id: itemVariantId, quantity }),
    {
      successMessage: 'Thêm sản phẩm con thành công',
      ...invalidate,
      onSuccess: () => { setItemVariantId(undefined); setQuantity(1) },
    },
  )

  const deleteMutation = useApiMutation(
    (itemId: string) => api.delete(`/products/${productId}/variants/${variantId}/bundle-items/${itemId}`),
    { successMessage: 'Đã xoá', ...invalidate },
  )

  return (
    <div>
      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={items}
        pagination={false}
        size="small"
        columns={[
          { title: 'SKU', dataIndex: 'item_sku' },
          { title: 'Tên', dataIndex: 'item_name' },
          { title: 'Số lượng', dataIndex: 'quantity' },
          {
            title: '',
            render: (_: any, r: any) => (
              <Button size="small" danger onClick={() => deleteMutation.mutate(r.id)}>Xoá</Button>
            ),
          },
        ]}
      />

      <Space style={{ marginTop: 12 }}>
        <VariantSelect
          style={{ width: fw.sku + fw.product }}
          value={itemVariantId}
          onChange={setItemVariantId}
          excludeTypes={['bundle', 'service']}
          placeholder="Tìm sản phẩm / SKU..."
        />
        <InputNumber min={1} value={quantity} onChange={(v) => setQuantity(v ?? 1)} style={{ width: 80 }} />
        <Button
          type="primary"
          disabled={!itemVariantId}
          loading={addMutation.isPending}
          onClick={() => addMutation.mutate()}
        >
          + Thêm
        </Button>
      </Space>
    </div>
  )
}
