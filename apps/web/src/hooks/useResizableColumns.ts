import { useRef, useState } from 'react'

const MIN_PCT = 3

/**
 * Resizable columns — Excel style:
 * kéo divider cột idx sang phải → cột idx rộng ra, tất cả cột bên phải thu lại tỷ lệ.
 * initialWidths: mảng % tổng = 100.
 */
export function useResizableColumns(initialWidths: number[]) {
  const tableRef = useRef<HTMLTableElement>(null)
  const [colWidths, setColWidths] = useState(initialWidths)

  function startResize(e: React.MouseEvent, idx: number) {
    e.preventDefault()
    const startX = e.clientX
    const tableWidth = tableRef.current?.offsetWidth ?? 1200
    const startWidths = [...colWidths]
    const rightSlice = startWidths.slice(idx + 1)
    const rightTotal = rightSlice.reduce((a, b) => a + b, 0)
    const numRight = rightSlice.length

    function onMove(ev: MouseEvent) {
      const pctDelta = (ev.clientX - startX) / tableWidth * 100
      setColWidths(() => {
        const n = [...startWidths]
        if (numRight === 0) {
          n[idx] = Math.max(MIN_PCT, startWidths[idx] + pctDelta)
          return n
        }
        const maxGrow = rightTotal - MIN_PCT * numRight
        const d = Math.max(-(startWidths[idx] - MIN_PCT), Math.min(pctDelta, maxGrow))
        n[idx] = startWidths[idx] + d
        const newRightTotal = rightTotal - d
        for (let j = idx + 1; j < n.length; j++) {
          n[j] = (startWidths[j] / rightTotal) * newRightTotal
        }
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
