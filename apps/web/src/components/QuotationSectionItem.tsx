import { useMemo, useState } from 'react'
import { Form, Input, AutoComplete, Button, Select, Tooltip } from 'antd'
import { DeleteOutlined, AppstoreAddOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import type { FormInstance } from 'antd'
import QuotationLineItem from './QuotationLineItem'
import { api } from '../lib/api'
import type { VariantData } from './VariantSelect'
import { useSectionNamePresets } from '../hooks/useSectionNamePresets'

function toRoman(n: number): string {
  const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1]
  const syms = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I']
  let s = ''
  for (let i = 0; i < vals.length; i++) {
    while (n >= vals[i]) { s += syms[i]; n -= vals[i] }
  }
  return s
}

interface Props {
  form: FormInstance
  name: number
  sectionIndex: number
  remove: () => void
}

function fmt(n: number) {
  return n.toLocaleString('en-US')
}

function calcItems(items: any[]): number {
  return (items ?? []).reduce((sum, item) => {
    const qty   = Number(item?.quantity   ?? 0)
    const price = Number(item?.unit_price ?? 0)
    const vat   = Number(item?.vat_percent ?? 0)
    const lt = qty * price
    return sum + lt + lt * (vat / 100)
  }, 0)
}

// ── Sub-section block ──────────────────────────────────────────────────────────
interface SubSectionProps {
  form: FormInstance
  sectionName: number
  name: number
  subIndex: number
  allVariants: VariantData[]
  remove: () => void
}

function SubSectionBlock({ form, sectionName, name, subIndex, allVariants, remove }: SubSectionProps) {
  // Local state for product filter — ensures Select re-renders immediately on change
  const [filterProductId, setFilterProductId] = useState<string | undefined>()

  // Danh sách sản phẩm duy nhất từ cache variants
  const productOptions = useMemo(() => {
    const seen = new Set<string>()
    const opts: { value: string; label: string }[] = []
    for (const v of allVariants) {
      if (!seen.has(v.product_id)) {
        seen.add(v.product_id)
        opts.push({ value: v.product_id, label: v.product_name })
      }
    }
    return opts.sort((a, b) => a.label.localeCompare(b.label))
  }, [allVariants])

  function onSelectProduct(pid: string | undefined) {
    setFilterProductId(pid)
    form.setFieldValue(['sections', sectionName, 'sub_sections', name, 'product_id'], pid)
    if (pid) {
      const found = allVariants.find((v) => v.product_id === pid)
      const existingName = form.getFieldValue(['sections', sectionName, 'sub_sections', name, 'name'])
      if (!existingName && found) {
        form.setFieldValue(['sections', sectionName, 'sub_sections', name, 'name'], found.product_name)
      }
    }
  }

  const parentPath = ['sections', sectionName, 'sub_sections', name, 'line_items']

  return (
    <div style={{
      border: '1px solid color-mix(in srgb, var(--accent) 35%, transparent)',
      borderRadius: 6,
      marginBottom: 10,
      background: 'var(--accent-bg)',
      overflow: 'hidden',
    }}>
      {/* Sub-section header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '5px 10px',
        background: 'var(--accent-bg)',
        borderBottom: '1px solid var(--accent)',
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-text)', whiteSpace: 'nowrap', minWidth: 20 }}>
          {subIndex + 1}.
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-text)', whiteSpace: 'nowrap' }}>
          Sản phẩm
        </span>
        <Select
          showSearch
          allowClear
          placeholder="Chọn sản phẩm để lọc SKU..."
          style={{ minWidth: 200 }}
          size="small"
          options={productOptions}
          value={filterProductId}
          onChange={onSelectProduct}
          filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
        />
        <Form.Item name={[name, 'product_id']} hidden><Input /></Form.Item>
        <Form.Item name={[name, 'name']} noStyle rules={[{ required: true, message: 'Nhập tên sub-section' }]}>
          <Input placeholder="Tên sub-section" style={{ maxWidth: 240 }} size="small" />
        </Form.Item>
        <Tooltip title="Xoá sub-section">
          <Button type="text" danger icon={<DeleteOutlined />} size="small" onClick={remove} style={{ marginLeft: 'auto' }} />
        </Tooltip>
      </div>

      {/* Line items */}
      <div style={{ padding: '8px 10px 6px' }}>
        <Form.List name={[name, 'line_items']}>
          {(fields, { add, remove: removeLine }) => (
            <div className="overflow-x-auto">
              <table className="kv-table kv-lines" style={{ minWidth: 1100 }}>
                <QuotationLineTableHead />
                <tbody>
                  {fields.length === 0 && (
                    <tr><td colSpan={12} className="kv-muted" style={{ textAlign: 'center', padding: '12px 0' }}>Chưa có dòng hàng</td></tr>
                  )}
                  {fields.map(({ key, name: lineName }) => (
                    <QuotationLineItem
                      key={key}
                      form={form}
                      parentPath={parentPath}
                      name={lineName}
                      productId={filterProductId}
                      remove={() => removeLine(lineName)}
                    />
                  ))}
                </tbody>
                <tfoot>
                  <tr className="kv-addline">
                    <td></td>
                    <td colSpan={11}>
                      <button type="button" className="kv-btn" onClick={() => add()}>+ Thêm dòng</button>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Form.List>
      </div>
    </div>
  )
}

function QuotationLineTableHead() {
  return (
    <thead>
      <tr>
        <th></th>
        <th className="text-left">Sản phẩm</th>
        <th className="text-center">ĐVT</th>
        <th className="num">SL</th>
        <th className="num">Đơn giá</th>
        <th className="num">VAT%</th>
        <th className="num">Thành tiền</th>
        <th className="num">Tiền VAT</th>
        <th className="text-left">Bảo hành</th>
        <th className="text-center">Giữ chỗ</th>
        <th className="text-left">Ghi chú</th>
        <th></th>
      </tr>
    </thead>
  )
}

// ── Main section component ────────────────────────────────────────────────────
export default function QuotationSectionItem({ form, name, sectionIndex, remove }: Props) {
  const { data: allVariants = [] } = useQuery<VariantData[]>({
    queryKey: ['products', 'variants', 'all', false],
    queryFn: async () => (await api.get('/products/variants', { params: { limit: 200 } })).data,
  })

  const { data: presets = [] } = useSectionNamePresets()
  const presetOptions = useMemo(
    () => presets.map((p) => ({ value: p.name, label: p.name })),
    [presets],
  )

  const sectionData: any = Form.useWatch(['sections', name], form) ?? {}

  const sectionTotal = useMemo(() => {
    const subTotal = (sectionData.sub_sections ?? []).reduce(
      (sum: number, ss: any) => sum + calcItems(ss?.line_items ?? []),
      0,
    )
    const freeTotal = calcItems(sectionData.line_items ?? [])
    return subTotal + freeTotal
  }, [sectionData])

  const freeParentPath = ['sections', name, 'line_items']

  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 8,
      marginBottom: 12,
      overflow: 'hidden',
    }}>
      {/* Section header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        background: 'var(--bg-hover)',
        borderBottom: '1px solid var(--border)',
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', whiteSpace: 'nowrap', flexShrink: 0, minWidth: 28 }}>
          {toRoman(sectionIndex + 1)}.
        </span>
        <Form.Item name={[name, 'name']} noStyle rules={[{ required: true, message: 'Nhập tên nhóm' }]}>
          <AutoComplete
            options={presetOptions}
            placeholder="Tên nhóm (VD: Thiết bị mạng)"
            style={{ flex: 1, minWidth: 0 }}
            filterOption={false}
          />
        </Form.Item>
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={remove}
          style={{ marginLeft: 'auto', flexShrink: 0 }}
        />
      </div>

      {/* Body */}
      <div style={{ padding: '10px 12px 8px' }}>

        {/* Sub-sections */}
        <Form.List name={[name, 'sub_sections']}>
          {(subFields, { add: addSub, remove: removeSub }) => (
            <>
              {subFields.map(({ key, name: subName }, subIdx) => (
                <SubSectionBlock
                  key={key}
                  form={form}
                  sectionName={name}
                  name={subName}
                  subIndex={subIdx}
                  allVariants={allVariants}
                  remove={() => removeSub(subName)}
                />
              ))}
              <Button
                size="small"
                icon={<AppstoreAddOutlined />}
                style={{ marginBottom: 10, borderColor: 'var(--accent)', color: 'var(--accent-text)' }}
                onClick={() => addSub({ name: '', product_id: undefined, line_items: [{}] })}
              >
                + Thêm sub-section (sản phẩm)
              </Button>
            </>
          )}
        </Form.List>

        {/* Free lines */}
        <Form.List name={[name, 'line_items']}>
          {(fields, { add, remove: removeLine }) => (
            <>
              {fields.length > 0 && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', marginBottom: 4 }}>
                    Dòng tự do (tất cả SKU)
                  </div>
                  <div className="overflow-x-auto">
                    <table className="kv-table kv-lines" style={{ minWidth: 1100, marginBottom: 8 }}>
                      <QuotationLineTableHead />
                      <tbody>
                        {fields.map(({ key, name: lineName }) => (
                          <QuotationLineItem
                            key={key}
                            form={form}
                            parentPath={freeParentPath}
                            name={lineName}
                            remove={() => removeLine(lineName)}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              <Button size="small" style={{ marginTop: 4 }} onClick={() => add()}>
                + Thêm dòng tự do
              </Button>
            </>
          )}
        </Form.List>

        {/* Section total */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 8,
          marginTop: 10,
          paddingTop: 8,
          borderTop: '1px solid var(--border)',
          fontSize: 13,
          paddingRight: 38,
        }}>
          <span style={{ color: 'var(--text-2)' }}>Tổng tiền nhóm:</span>
          <strong style={{ color: 'var(--text-1)', minWidth: 120, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
            {fmt(Math.round(sectionTotal * 100) / 100)}
          </strong>
        </div>
      </div>
    </div>
  )
}
