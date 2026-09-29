// Input số thuần (không dùng antd InputNumber) — style `kv-input` giống mọi input khác trong
// app (border/height/bo góc đồng nhất), thay vì antd InputNumber tự vẽ khung riêng (bo tròn
// hơn, border nhạt hơn, khác hẳn các field kv-input xung quanh — lý do tách file này, port từ
// ReceiptFormPage.tsx::PlainNumberInput để POLineItem.tsx/các nơi khác dùng chung, không copy
// lại định nghĩa). Tương thích Form.Item: nhận value/onChange theo đúng convention antd tự
// inject.
export function PlainNumberInput({
  value, onChange, onBlur, autoFocus, align, className, format, decimal, placeholder = '0',
}: {
  value?: number
  onChange?: (v: number | undefined) => void
  onBlur?: () => void
  autoFocus?: boolean
  align?: 'left' | 'center' | 'right'
  className?: string
  format?: boolean
  // Cho phép 1 dấu chấm thập phân (VD VAT %) — mặc định chỉ số nguyên.
  decimal?: boolean
  placeholder?: string
}) {
  // value có thể là string thập phân từ backend (Postgres NUMERIC serialize dạng "2500000.00")
  const numValue = value != null ? Number(value) : undefined
  const display = numValue != null && !Number.isNaN(numValue) ? (format ? numValue.toLocaleString('en-US') : String(numValue)) : ''
  return (
    <input
      type="text"
      inputMode={decimal ? 'decimal' : 'numeric'}
      autoFocus={autoFocus}
      value={display}
      placeholder={placeholder}
      onChange={(e) => {
        const raw = decimal
          ? e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1')
          : e.target.value.replace(/[^0-9]/g, '')
        onChange?.(raw === '' || raw === '.' ? undefined : Number(raw))
      }}
      onBlur={onBlur}
      className={`kv-input ${align === 'right' ? 'kv-input--num' : ''} ${className ?? ''}`}
      style={{ height: 32 }}
    />
  )
}
