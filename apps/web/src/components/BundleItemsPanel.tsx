// Quản lý sản phẩm con của 1 variant loại "bundle" — CLAUDE.md mục 4: bundle gồm nhiều
// sản phẩm con với quantity riêng, không lồng bundle trong bundle. Render trong slot
// `extra` của EntityFormModal (ngoài <Form> chính) vì có Form riêng, giống CustomFieldsPanel.
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Table, Select, InputNumber, Button, Typography, Space } from 'antd'
import { api } from '../lib/api'
import { useApiMutation } from '../hooks/useApiMutation'

interface Props {
  productId: string
  variantId: string
}

export default function BundleItemsPanel({ productId, variantId }: Props) {
  const [itemProductId, setItemProductId] = useState<string | undefined>()
  const [itemVariantId, setItemVariantId] = useState<string | undefined>()
  const [quantity, setQuantity] = useState<number>(1)

  const { data: items, isLoading } = useQuery({
    queryKey: ['products', productId, 'variants', variantId, 'bundle-items'],
    queryFn: async () => (await api.get(`/products/${productId}/variants/${variantId}/bundle-items`)).data,
  })

  const { data: products } = useQuery({
    queryKey: ['products', 'all'],
    queryFn: async () => (await api.get('/products', { params: { limit: 100 } })).data,
  })

  const { data: itemProductDetail } = useQuery({
    queryKey: ['products', itemProductId],
    queryFn: async () => (await api.get(`/products/${itemProductId}`)).data,
    enabled: !!itemProductId,
  })

  const invalidate = { invalidateKey: ['products', productId, 'variants', variantId, 'bundle-items'] }

  const addMutation = useApiMutation(
    () => api.post(`/products/${productId}/variants/${variantId}/bundle-items`, { item_variant_id: itemVariantId, quantity }),
    {
      successMessage: 'Thêm sản phẩm con thành công',
      ...invalidate,
      onSuccess: () => {
        setItemProductId(undefined)
        setItemVariantId(undefined)
        setQuantity(1)
      },
    },
  )

  const deleteMutation = useApiMutation(
    (itemId: string) => api.delete(`/products/${productId}/variants/${variantId}/bundle-items/${itemId}`),
    { successMessage: 'Đã xoá', ...invalidate },
  )

  return (
    <div style={{ marginTop: 24, borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
      <Typography.Title level={5}>Sản phẩm con trong bundle</Typography.Title>

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
              <Button size="small" danger onClick={() => deleteMutation.mutate(r.id)}>
                Xoá
              </Button>
            ),
          },
        ]}
      />

      <Space style={{ marginTop: 12 }}>
        <Select
          placeholder="Chọn sản phẩm con"
          style={{ width: 200 }}
          options={products?.data
            .filter((p: any) => p.id !== productId && p.product_type !== 'bundle')
            .map((p: any) => ({ value: p.id, label: p.name }))}
          value={itemProductId}
          onChange={(v) => {
            setItemProductId(v)
            setItemVariantId(undefined)
          }}
        />
        <Select
          placeholder="Chọn SKU"
          style={{ width: 220 }}
          disabled={!itemProductId}
          options={itemProductDetail?.variants.map((v: any) => ({ value: v.id, label: `${v.sku} — ${v.name}` }))}
          value={itemVariantId}
          onChange={setItemVariantId}
        />
        <InputNumber min={1} value={quantity} onChange={(v) => setQuantity(v ?? 1)} />
        <Button type="primary" disabled={!itemVariantId} loading={addMutation.isPending} onClick={() => addMutation.mutate()}>
          + Thêm
        </Button>
      </Space>
    </div>
  )
}
