// 1 dòng chọn SKU trong Form.List "scope_ids" (scope_type=by_sku) — không có endpoint list
// tất cả variant trực tiếp, phải cascading qua Product trước giống POLineItem/QuotationLineItem.
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Form, Select, Button } from 'antd'
import type { FormInstance } from 'antd'
import { api } from '../lib/api'

interface Props {
  form: FormInstance
  name: number
  remove: () => void
}

export default function StocktakeSkuPicker({ form, name, remove }: Props) {
  const [productId, setProductId] = useState<string | undefined>()

  const { data: products } = useQuery({
    queryKey: ['products', 'all'],
    queryFn: async () => (await api.get('/products', { params: { limit: 100 } })).data,
  })

  const { data: productDetail } = useQuery({
    queryKey: ['products', productId],
    queryFn: async () => (await api.get(`/products/${productId}`)).data,
    enabled: !!productId,
  })

  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
      <Select
        placeholder="Chọn sản phẩm"
        style={{ width: 220 }}
        options={products?.data.map((p: any) => ({ value: p.id, label: p.name }))}
        onChange={(v) => setProductId(v)}
      />
      <Form.Item name={[name]} rules={[{ required: true, message: 'Chọn SKU' }]} noStyle>
        <Select
          placeholder="Chọn SKU"
          style={{ width: 240 }}
          disabled={!productId}
          options={productDetail?.variants.map((v: any) => ({ value: v.id, label: `${v.item_code ?? v.sku} — ${v.name}` }))}
        />
      </Form.Item>
      <Button danger onClick={remove}>
        Xoá
      </Button>
    </div>
  )
}
