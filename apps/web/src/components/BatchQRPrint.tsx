import { useRef } from 'react'
import { Modal, Button } from 'antd'
import { PrinterOutlined } from '@ant-design/icons'
import { QRCodeSVG } from 'qrcode.react'

interface BatchLine {
  id: string
  item_code: string
  variant_name: string
  product_type: string
  quantity: number
  qty_remaining?: number
}

interface Props {
  open: boolean
  onClose: () => void
  receiptCode: string
  completedAt: string | null
  warehouseName: string
  lines: BatchLine[]
}

function fmt(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('vi-VN')
}

export function BatchQRPrint({ open, onClose, receiptCode, completedAt, warehouseName, lines }: Props) {
  const printRef = useRef<HTMLDivElement>(null)

  const printableLines = lines.filter(l => l.product_type !== 'service')
  const qrValue = receiptCode

  function handlePrint() {
    const el = printRef.current
    if (!el) return
    const html = el.innerHTML
    const win = window.open('', '_blank', 'width=600,height=500')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head><title>Nhãn lô — ${receiptCode}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; background: #fff; display: flex; justify-content: center; padding: 24px; }
  .label {
    border: 2px solid #000;
    border-radius: 8px;
    padding: 16px;
    display: flex;
    gap: 16px;
    align-items: flex-start;
    width: 340px;
  }
  .label svg { flex-shrink: 0; }
  .info { flex: 1; min-width: 0; }
  .code { font-size: 18px; font-weight: 700; margin-bottom: 6px; letter-spacing: 0.5px; }
  .meta { font-size: 11px; color: #444; line-height: 1.8; }
  .meta b { color: #000; }
  .items { margin-top: 8px; border-top: 1px solid #ccc; padding-top: 8px; font-size: 11px; line-height: 1.7; }
  @media print { body { padding: 8px; } }
</style>
</head><body>${html}</body></html>`)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 300)
  }

  return (
    <Modal
      title={`Nhãn QR lô — ${receiptCode}`}
      open={open}
      onCancel={onClose}
      width={500}
      footer={
        <Button type="primary" icon={<PrinterOutlined />} onClick={handlePrint}>
          In nhãn
        </Button>
      }
    >
      {/* Preview */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 16px' }}>
        <LabelCard
          receiptCode={receiptCode}
          completedAt={completedAt}
          warehouseName={warehouseName}
          lines={printableLines}
          qrValue={qrValue}
        />
      </div>

      {/* Hidden for print */}
      <div ref={printRef} style={{ display: 'none' }}>
        <LabelCardPrintable
          receiptCode={receiptCode}
          completedAt={completedAt}
          warehouseName={warehouseName}
          lines={printableLines}
          qrValue={qrValue}
        />
      </div>
    </Modal>
  )
}

interface CardProps {
  receiptCode: string
  completedAt: string | null
  warehouseName: string
  lines: BatchLine[]
  qrValue: string
}

// ── Preview card ─────────────────────────────────────────────────────────────

function LabelCard({ receiptCode, completedAt, warehouseName, lines, qrValue }: CardProps) {
  return (
    <div style={{
      border: '2px solid #1e293b',
      borderRadius: 8,
      padding: '14px 16px',
      display: 'flex',
      gap: 16,
      alignItems: 'flex-start',
      background: '#fff',
      width: 340,
    }}>
      <QRCodeSVG value={qrValue} size={100} level="M" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, letterSpacing: 0.5 }}>
          {receiptCode}
        </div>
        <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.8 }}>
          <div>Ngày: <strong style={{ color: '#0f172a' }}>{fmt(completedAt)}</strong></div>
          <div>Kho: <strong style={{ color: '#0f172a' }}>{warehouseName}</strong></div>
        </div>
        {lines.length > 0 && (
          <div style={{ marginTop: 8, borderTop: '1px solid #e2e8f0', paddingTop: 8, fontSize: 11, lineHeight: 1.7 }}>
            {lines.map(l => (
              <div key={l.id}><strong>{l.item_code}</strong> · {l.quantity} {l.product_type === 'storable' ? 'SN' : 'cái'}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Print-only card (innerHTML extraction) ───────────────────────────────────

function LabelCardPrintable({ receiptCode, completedAt, warehouseName, lines, qrValue }: CardProps) {
  return (
    <div className="label">
      <QRCodeSVG value={qrValue} size={100} level="M" />
      <div className="info">
        <div className="code">{receiptCode}</div>
        <div className="meta">
          <div>Ngày: <b>{fmt(completedAt)}</b></div>
          <div>Kho: <b>{warehouseName}</b></div>
        </div>
        {lines.length > 0 && (
          <div className="items">
            {lines.map(l => (
              <div key={l.id}><b>{l.item_code}</b> · {l.quantity} {l.product_type === 'storable' ? 'SN' : 'cái'}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
