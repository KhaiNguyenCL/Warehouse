import { useRef } from 'react'

export interface SnRow {
  serial_no: string
  mac_address: string
  note: string
}

interface Props {
  quantity: number
  rows: SnRow[]
  onChange: (rows: SnRow[]) => void
}

// Grid nhập serial number kiểu Excel — hỗ trợ scanner và keyboard navigation.
// Enter trong SN → nhảy sang MAC; Enter trong MAC → nhảy xuống SN dòng tiếp.
// Paste nhiều SN cùng lúc vào cột SN → auto split theo dòng.
export function SnScanGrid({ quantity, rows, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  const fullRows: SnRow[] = Array.from({ length: quantity }, (_, i) =>
    rows[i] ?? { serial_no: '', mac_address: '', note: '' },
  )

  function update(idx: number, field: keyof SnRow, val: string) {
    const next = fullRows.map((r, i) => (i === idx ? { ...r, [field]: val } : r))
    onChange(next)
  }

  function focusCell(rowIdx: number, field: 'sn' | 'mac') {
    if (rowIdx >= quantity) return
    containerRef.current
      ?.querySelector<HTMLInputElement>(`[data-r="${rowIdx}"][data-f="${field}"]`)
      ?.focus()
  }

  function handleSnKey(e: React.KeyboardEvent, idx: number) {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      focusCell(idx, 'mac')
    }
  }

  function handleMacKey(e: React.KeyboardEvent, idx: number) {
    if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
      e.preventDefault()
      focusCell(idx + 1, 'sn')
    }
  }

  function handleSnPaste(e: React.ClipboardEvent, startIdx: number) {
    const lines = e.clipboardData.getData('text')
      .split(/[\r\n]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (lines.length <= 1) return
    e.preventDefault()
    const next = [...fullRows]
    lines.forEach((sn, i) => {
      const idx = startIdx + i
      if (idx < quantity) next[idx] = { ...next[idx], serial_no: sn }
    })
    onChange(next)
    setTimeout(() => focusCell(Math.min(startIdx + lines.length, quantity - 1), 'sn'), 30)
  }

  const filled = fullRows.filter((r) => r.serial_no.trim()).length

  return (
    <div ref={containerRef}>
      {/* Header */}
      <div style={gridStyle}>
        <span style={headerCell}>#</span>
        <span style={headerCell}>Serial Number *</span>
        <span style={headerCell}>MAC Address</span>
      </div>

      {fullRows.map((row, idx) => {
        const done = !!row.serial_no.trim()
        return (
          <div key={idx} style={{ ...gridStyle, marginBottom: 3 }}>
            <span style={{ ...indexCell, color: done ? '#52c41a' : '#bbb', fontWeight: done ? 600 : 400 }}>
              {idx + 1}
            </span>
            <input
              data-r={idx}
              data-f="sn"
              value={row.serial_no}
              onChange={(e) => update(idx, 'serial_no', e.target.value)}
              onKeyDown={(e) => handleSnKey(e, idx)}
              onPaste={(e) => handleSnPaste(e, idx)}
              placeholder="Scan hoặc gõ SN..."
              style={{ ...cellInput, borderColor: done ? '#b7eb8f' : '#d9d9d9', background: done ? '#f6ffed' : '#fff' }}
            />
            <input
              data-r={idx}
              data-f="mac"
              value={row.mac_address}
              onChange={(e) => update(idx, 'mac_address', e.target.value)}
              onKeyDown={(e) => handleMacKey(e, idx)}
              placeholder="AA:BB:CC:DD:EE:FF"
              style={cellInput}
            />
          </div>
        )
      })}

      <div style={{ fontSize: 12, color: '#888', marginTop: 8 }}>
        Đã nhập: <strong style={{ color: filled === quantity ? '#52c41a' : 'inherit' }}>{filled}/{quantity}</strong>
        {filled === quantity && ' ✓ Đủ số lượng'}
      </div>
    </div>
  )
}

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '28px 1fr 1fr',
  gap: 6,
  alignItems: 'center',
}

const headerCell: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: '#888',
  paddingLeft: 2,
}

const indexCell: React.CSSProperties = {
  textAlign: 'center',
  fontSize: 12,
  transition: 'color 0.2s',
}

const cellInput: React.CSSProperties = {
  width: '100%',
  padding: '4px 8px',
  border: '1px solid #d9d9d9',
  borderRadius: 6,
  fontSize: 13,
  fontFamily: 'monospace',
  outline: 'none',
  transition: 'border-color 0.2s, background 0.2s',
}
