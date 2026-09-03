import { useRef, useState } from 'react'

const MIN_PCT = 3

/**
 * Resizable columns — fill-column approach:
 * kéo divider cột idx → chỉ cột idx và cột CUỐI thay đổi (cột cuối là fill column).
 * initialWidths: mảng % tổng = 100, không đặt ResizeHandle trên cột cuối.
 */
export function useResizableColumns(initialWidths: number[]) {
  const tableRef = useRef<HTMLTableElement>(null)
  const [colWidths, setColWidths] = useState(initialWidths)

  function startResize(e: React.MouseEvent, idx: number) {
    e.preventDefault()
    const lastIdx = colWidths.length - 1
    if (idx >= lastIdx) return // cột cuối là fill column, không resize được

    const startX = e.clientX
    const tableWidth = tableRef.current?.offsetWidth ?? 1200
    const startWidths = [...colWidths]

    function onMove(ev: MouseEvent) {
      const pctDelta = (ev.clientX - startX) / tableWidth * 100
      setColWidths(() => {
        const n = [...startWidths]
        const d = Math.max(
          -(startWidths[idx] - MIN_PCT),      // không co nhỏ hơn MIN_PCT
          Math.min(pctDelta, startWidths[lastIdx] - MIN_PCT), // fill column không co nhỏ hơn MIN_PCT
        )
        n[idx] = startWidths[idx] + d
        n[lastIdx] = startWidths[lastIdx] - d
        return n
      })
    }

    function onUp() {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  return { colWidths, tableRef, startResize }
}
