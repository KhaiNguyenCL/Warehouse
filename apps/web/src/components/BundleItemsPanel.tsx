import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Table, Select, InputNumber, Button, Space } from 'antd'
import { api } from '../lib/api'
import { useApiMutation } from '../hooks/useApiMutation'
import { fw } from '../styles/fieldWidths'

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

  const { data: allVariants } = useQuery({
    queryKey: ['products', 'variants', 'all'],
    queryFn: async () => (await api.get('/products/variants', { params: { limit: 200 } })).data,
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

  // Group variants by product_name, loại bỏ bundle/service và chính sản phẩm hiện tại
  const groupedOptions = (() => {
    if (!allVariants) return []
    const eligible = allVariants.filter(
      (v: any) => v.product_type !== 'bundle' && v.product_type !== 'service',
    )
    const groups = new Map<string, { label: string; options: any[] }>()
    for (const v of eligible) {
      if (!groups.has(v.product_name)) {
        groups.set(v.product_name, { label: v.product_name, options: [] })
      }
      groups.get(v.product_name)!.options.push({
        value: v.id,
        label: `${v.item_code ?? v.sku}${v.name ? ` — ${v.name}` : ''}`,
        searchText: `${v.product_name} ${v.item_code ?? ''} ${v.sku} ${v.name ?? ''}`.toLowerCase(),
      })
    }
    return Array.from(groups.values())
  })()

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
        <Select
          showSearch
          placeholder="Tìm sản phẩm / SKU..."
          style={{ width: fw.sku + fw.product }}
          value={itemVariantId}
          onChange={setItemVariantId}
          filterOption={(input, option) => {
            if (option && 'searchText' in option) {
              return (option.searchText as string).includes(input.toLowerCase())
            }
            return false
          }}
          options={groupedOptions}
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
