import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Select } from 'antd'
import { api } from '../lib/api'

export interface VariantData {
  id: string
  sku: string
  item_code: string | null
  name: string | null
  unit: string | null
  cost_price: number | null
  sale_price: number | null
  warranty_months: number | null
  product_name: string
  product_type: string
}

interface Props {
  value?: string
  onChange?: (value: string | undefined) => void
  onSelectVariant?: (variant: VariantData | null) => void
  style?: React.CSSProperties
  placeholder?: string
  excludeTypes?: string[]
  disabled?: boolean
}

export default function VariantSelect({
  value,
  onChange,
  onSelectVariant,
  style,
  placeholder = 'Tìm mã hàng / tên...',
  excludeTypes,
  disabled,
}: Props) {
  const { data: allVariants } = useQuery<VariantData[]>({
    queryKey: ['products', 'variants', 'all'],
    queryFn: async () => (await api.get('/products/variants', { params: { limit: 200 } })).data,
  })

  const variantMap = useMemo(() => {
    const m = new Map<string, VariantData>()
    for (const v of allVariants ?? []) m.set(v.id, v)
    return m
  }, [allVariants])

  const groupedOptions = useMemo(() => {
    if (!allVariants) return []
    const filtered = allVariants.filter((v) => !excludeTypes?.includes(v.product_type))
    const groups = new Map<string, { label: string; options: any[] }>()
    for (const v of filtered) {
      if (!groups.has(v.product_name)) {
        groups.set(v.product_name, { label: v.product_name, options: [] })
      }
      const label = `${v.item_code ?? v.sku}${v.name ? ` — ${v.name}` : ''}`
      groups.get(v.product_name)!.options.push({
        value: v.id,
        label,
        searchText: `${v.product_name} ${v.item_code ?? ''} ${v.sku} ${v.name ?? ''}`.toLowerCase(),
      })
    }
    return Array.from(groups.values())
  }, [allVariants, excludeTypes])

  function handleChange(val: string | undefined) {
    onChange?.(val)
    onSelectVariant?.(val ? (variantMap.get(val) ?? null) : null)
  }

  return (
    <Select
      showSearch
      allowClear
      value={value}
      onChange={handleChange}
      style={style}
      placeholder={placeholder}
      disabled={disabled}
      filterOption={(input, option) => {
        if (option && 'searchText' in option) {
          return (option.searchText as string).includes(input.toLowerCase())
        }
        return false
      }}
      options={groupedOptions}
    />
  )
}
