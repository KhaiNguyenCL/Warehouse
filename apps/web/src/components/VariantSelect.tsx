import React, { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Select } from 'antd'
import { api } from '../lib/api'

export interface VariantData {
  id: string
  sku: string
  item_code: string | null
  name: string | null
  unit: string | null
  description: string | null
  cost_price: number | null
  sale_price: number | null
  manufacturer_warranty_months: number | null
  vat_percent: number | null
  product_id: string
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
  excludeIds?: string[]
  productId?: string
  disabled?: boolean
  inStockOnly?: boolean
  // Khi true: mỗi option hiện thêm dòng nhỏ giá bán + BH hãng + VAT ngay trong dropdown
  // (tag đã chọn vẫn hiện tên ngắn gọn). Dùng cho QuotationLineItem.
  showMeta?: boolean
  // Pass-through cho pattern "click-vào-ô-mới-hiện-input" (xem ReceiptFormPage) — cần tự mở
  // dropdown + focus ngay khi ô chuyển sang chế độ edit, và biết khi nào rời ô để đóng lại.
  autoFocus?: boolean
  defaultOpen?: boolean
  onBlur?: () => void
}

function fmtPrice(n: number | null | undefined) {
  if (n == null) return null
  return Number(n).toLocaleString('en-US')
}

export default function VariantSelect({
  value,
  onChange,
  onSelectVariant,
  style,
  placeholder = 'Tìm mã hàng / tên...',
  excludeTypes,
  excludeIds,
  productId,
  disabled,
  inStockOnly = false,
  showMeta = false,
  autoFocus,
  defaultOpen,
  onBlur,
}: Props) {
  const { data: allVariants } = useQuery<VariantData[]>({
    queryKey: ['products', 'variants', 'all', inStockOnly],
    queryFn: async () => (await api.get('/products/variants', { params: { limit: 200, in_stock_only: inStockOnly || undefined } })).data,
  })

  const variantMap = useMemo(() => {
    const m = new Map<string, VariantData>()
    for (const v of allVariants ?? []) m.set(v.id, v)
    return m
  }, [allVariants])

  const groupedOptions = useMemo(() => {
    if (!allVariants) return []
    const filtered = allVariants.filter((v) =>
      !excludeTypes?.includes(v.product_type) &&
      (!productId || v.product_id === productId) &&
      (!excludeIds?.length || !excludeIds.includes(v.id)),
    )
    const groups = new Map<string, { label: React.ReactNode; options: any[] }>()
    for (const v of filtered) {
      if (!groups.has(v.product_name)) {
        groups.set(v.product_name, {
          label: <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>{v.product_name}</span>,
          options: [],
        })
      }
      const label = `${v.item_code ?? v.sku}${v.name ? ` - ${v.name}` : ''}`
      groups.get(v.product_name)!.options.push({
        value: v.id,
        label,
        searchText: `${v.product_name} ${v.item_code ?? ''} ${v.sku} ${v.name ?? ''}`.toLowerCase(),
        sale_price: v.sale_price,
        manufacturer_warranty_months: v.manufacturer_warranty_months,
        vat_percent: v.vat_percent,
      })
    }
    return Array.from(groups.values())
  }, [allVariants, excludeTypes, excludeIds, productId])

  function handleChange(val: string | undefined) {
    onChange?.(val)
    onSelectVariant?.(val ? (variantMap.get(val) ?? null) : null)
  }

  return (
    <Select
      showSearch
      allowClear
      className="kv-variant-select"
      value={value}
      onChange={handleChange}
      style={style}
      placeholder={placeholder}
      disabled={disabled}
      autoFocus={autoFocus}
      defaultOpen={defaultOpen}
      onBlur={onBlur}
      filterOption={(input, option) => {
        if (option && 'searchText' in option) {
          return (option.searchText as string).includes(input.toLowerCase())
        }
        return false
      }}
      options={groupedOptions}
      optionRender={showMeta ? (option) => {
        const d = option.data as any
        const priceParts: string[] = []
        const priceStr = fmtPrice(d.sale_price)
        if (priceStr) priceParts.push(`${priceStr} VND`)
        else priceParts.push('Chưa có giá')
        if (d.manufacturer_warranty_months != null) {
          priceParts.push(
            d.manufacturer_warranty_months === 0 ? 'Không BH' : `BH ${d.manufacturer_warranty_months}T`,
          )
        }
        if (d.vat_percent) priceParts.push(`VAT ${d.vat_percent}%`)
        return (
          <div style={{ lineHeight: 1.35, padding: '1px 0' }}>
            <div style={{ fontSize: 13 }}>{option.label as string}</div>
            <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 1 }}>
              {priceParts.join(' · ')}
            </div>
          </div>
        )
      } : undefined}
    />
  )
}
