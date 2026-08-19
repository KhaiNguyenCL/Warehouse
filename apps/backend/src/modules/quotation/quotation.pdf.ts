// Build HTML string cho báo giá — Puppeteer render thành PDF A4 ngang.
// Layout lấy từ quotation_preview.html (user thiết kế), data inject qua template literal.

import fs from 'fs'
import path from 'path'

// Logo nhúng dưới dạng base64 để Puppeteer setContent() dùng được (không có base URL).
// __dirname trỏ đúng cả khi chạy ts-node lẫn compiled js.
function loadLogoDataUri(): string {
  try {
    const logoPath = path.resolve(__dirname, '../../../../..', 'apps/web/public/logodns3.png')
    const data = fs.readFileSync(logoPath)
    return `data:image/png;base64,${data.toString('base64')}`
  } catch {
    return ''
  }
}
const LOGO_DATA_URI = loadLogoDataUri()

// ── Helpers ──────────────────────────────────────────────────────────────────

function toRoman(n: number): string {
  const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1]
  const syms = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I']
  let s = ''
  for (let i = 0; i < vals.length; i++) {
    while (n >= vals[i]) { s += syms[i]; n -= vals[i] }
  }
  return s
}

function fmtDate(val: string | Date | null | undefined): string {
  if (!val) return '—'
  const d = typeof val === 'string' ? new Date(val + (val.includes('T') ? '' : 'T00:00:00Z')) : val
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' })
}

function fmtMoney(val: number | string | null | undefined): string {
  if (val == null || val === '') return '—'
  return Number(val).toLocaleString('en-US')
}

function esc(s: unknown): string {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Chuyển số sang chữ tiếng Việt — dùng cho "Số tiền bằng chữ"
function numberToWords(n: number): string {
  if (!n || n === 0) return 'Không đồng'
  n = Math.round(n)

  const ones = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín']

  function readGroup(num: number, isFirst: boolean): string {
    const h = Math.floor(num / 100)
    const rem = num % 100
    const t = Math.floor(rem / 10)
    const u = rem % 10
    let s = ''

    if (h > 0) {
      s += ones[h] + ' trăm'
    } else if (!isFirst && (t > 0 || u > 0)) {
      s += 'không trăm'
    }

    if (t === 0 && u === 0) return s
    if (s) s += ' '

    if (t === 0) {
      s += (h > 0 ? 'lẻ ' : '') + ones[u]
    } else if (t === 1) {
      s += 'mười'
      if (u === 5) s += ' lăm'
      else if (u > 0) s += ' ' + ones[u]
    } else {
      s += ones[t] + ' mươi'
      if (u === 1) s += ' mốt'
      else if (u === 5) s += ' lăm'
      else if (u > 0) s += ' ' + ones[u]
    }
    return s
  }

  const tỷ    = Math.floor(n / 1_000_000_000)
  const triệu = Math.floor((n % 1_000_000_000) / 1_000_000)
  const nghìn = Math.floor((n % 1_000_000) / 1_000)
  const đơn   = n % 1_000

  const parts: string[] = []
  if (tỷ)    parts.push(readGroup(tỷ, parts.length === 0) + ' tỷ')
  if (triệu) parts.push(readGroup(triệu, parts.length === 0) + ' triệu')
  if (nghìn) parts.push(readGroup(nghìn, parts.length === 0) + ' nghìn')
  if (đơn)   parts.push(readGroup(đơn, parts.length === 0))

  const result = parts.join(' ')
  return result.charAt(0).toUpperCase() + result.slice(1) + ' đồng'
}

// ── Build HTML ────────────────────────────────────────────────────────────────

export function buildQuotationHtml(q: any): string {
  const sections: any[] = q.sections ?? []

  // Build rows: section → sub-sections (optional) → line items
  let rowIndex = 0

  function buildItemRows(items: any[]): string {
    return items.map((li: any) => {
      rowIndex++
      const sku = li.variant_item_code ?? li.bundle_item_code ?? ''
      const vatAmount = Number(li.vat_amount ?? 0)
      return `
    <tr>
      <td class="center">${rowIndex}</td>
      <td>${esc(sku) || '—'}</td>
      <td class="desc"><span class="product-name">${esc(li.description || li.variant_name || li.bundle_name || '')}</span></td>
      <td class="center">${esc(li.unit || li.variant_unit || li.bundle_unit || '')}</td>
      <td class="center">${Number(li.quantity).toLocaleString('vi-VN')}</td>
      <td class="center">${esc(li.warranty ?? '') || '—'}</td>
      <td class="right">${fmtMoney(li.unit_price)}</td>
      <td class="right money">${fmtMoney(li.line_total)}</td>
      <td class="right">${li.vat_percent != null ? Number(li.vat_percent) : 0}</td>
      <td class="right">${fmtMoney(vatAmount)}</td>
      <td>${esc(li.note ?? '') || '—'}</td>
    </tr>`
    }).join('')
  }

  const lineRows = sections.map((s: any, sIdx: number) => {
    const subSections: any[] = s.sub_sections ?? []
    const freeItems: any[]   = s.line_items ?? []

    const allItems = [
      ...subSections.flatMap((ss: any) => ss.line_items ?? []),
      ...freeItems,
    ]
    if (allItems.length === 0) return ''

    const secLineTotal = allItems.reduce((acc: number, li: any) => acc + Number(li.line_total ?? 0), 0)
    const secVatAmount = allItems.reduce((acc: number, li: any) => acc + Number(li.vat_amount ?? 0), 0)

    const sectionLabel = s.name ? `${toRoman(sIdx + 1)}. ${esc(s.name)}` : ''
    const sectionRow = sectionLabel ? `
    <tr class="section-row">
      <td colspan="7">${sectionLabel}</td>
      <td class="right sec-val">${fmtMoney(secLineTotal)}</td>
      <td class="sec-val"></td>
      <td class="right sec-val">${fmtMoney(secVatAmount)}</td>
      <td class="sec-val"></td>
    </tr>` : ''

    const subRows = subSections.map((ss: any, ssIdx: number) => {
      const ssItems: any[] = ss.line_items ?? []
      if (ssItems.length === 0) return ''
      const ssLineTotal = ssItems.reduce((acc: number, li: any) => acc + Number(li.line_total ?? 0), 0)
      const ssVatAmount = ssItems.reduce((acc: number, li: any) => acc + Number(li.vat_amount ?? 0), 0)
      const subRow = `
    <tr class="sub-section-row">
      <td colspan="7">${ssIdx + 1}. ${esc(ss.name)}</td>
      <td class="right ss-val">${fmtMoney(ssLineTotal)}</td>
      <td class="ss-val"></td>
      <td class="right ss-val">${fmtMoney(ssVatAmount)}</td>
      <td class="ss-val"></td>
    </tr>`
      return subRow + buildItemRows(ssItems)
    }).join('')

    return sectionRow + subRows + buildItemRows(freeItems)
  }).join('')

  const grandTotal  = Number(q.grand_total ?? 0)
  const hasDiscount = Number(q.discount ?? 0) > 0
  const inWords     = numberToWords(grandTotal)

  // Điều khoản: tách theo số thứ tự "1. ", "2. "...
  // Trong mỗi item: dòng đầu = VN, dòng tiếp theo (nếu có) = EN in nghiêng.
  function buildTermItems(text: string): string {
    const byNumber = text.split(/(?=\d+\.\s)/).map(s => s.trim()).filter(Boolean)
    if (byNumber.length > 1) {
      return byNumber.map(item => {
        const lines = item.split('\n').map(l => l.trim()).filter(Boolean)
        const [vi, ...enLines] = lines
        const enHtml = enLines.map(l => `<p class="en">${esc(l)}</p>`).join('')
        return `<div class="term-item"><p>${esc(vi)}</p>${enHtml}</div>`
      }).join('')
    }
    // Fallback: không có số thứ tự — render từng dòng, dòng lẻ VN dòng chẵn EN
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length > 1) {
      const items: string[] = []
      for (let i = 0; i < lines.length; i += 2) {
        const vi = lines[i]
        const en = lines[i + 1]
        items.push(`<div class="term-item"><p>${esc(vi)}</p>${en ? `<p class="en">${esc(en)}</p>` : ''}</div>`)
      }
      return items.join('')
    }
    return `<div class="term-item"><p>${esc(text)}</p></div>`
  }

  const termsHtml = q.terms
    ? `<div class="terms-block"><h4>Điều khoản và Điều kiện / Terms &amp; Conditions</h4>${buildTermItems(q.terms)}</div>`
    : `<div class="terms-block">
        <h4>Điều khoản / Terms &amp; Conditions</h4>
        <div class="term-item">
          <p>1. Bảng báo giá được niêm yết bằng Việt Nam Đồng (VNĐ) và đã bao gồm thuế VAT (nếu có).</p>
          <p class="en">The quotation is quoted in Vietnam Dong (VND) and includes VAT (if any).</p>
        </div>
        <div class="term-item">
          <p>2. Giao hàng tận nơi theo yêu cầu.</p>
          <p class="en">Delivery upon request.</p>
        </div>
        <div class="term-item">
          <p>3. Thanh toán 100% giá trị trong 30 ngày sau khi bên mua nghiệm thu và nhận hóa đơn tài chính.</p>
          <p class="en">Payment of 100% value within 30 days after purchase and acceptance and receipt of financial units.</p>
        </div>
        <div class="term-item">
          <p>4. Giao hàng từ 03-05 ngày sau khi bên Mua xác nhận đơn hàng.</p>
          <p class="en">Delivery from 03-05 days after the Purchaser confirms the quotation.</p>
        </div>
      </div>`

  const noteHtml = q.note
    ? `<div class="terms-block"><h4>Ghi chú / Note</h4><p>${esc(q.note)}</p></div>`
    : ''

  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8"/>
<style>
  :root {
    --blue:      #4472c4;
    --blue-dark: #3560b0;
    --blue-tint: #EEF3FE;
    --ink:       #16213A;
    --text:      #1F2937;
    --muted:     #6B7280;
    --line:      #D5DAE3;
    --line-soft: #E7EBF2;
    --zebra:     #F7F9FC;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    font-family: 'Tahoma', 'DejaVu Sans', 'Verdana', sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  body {
    font-family: 'Tahoma', 'DejaVu Sans', 'Verdana', sans-serif;
    font-size: 11pt;
    color: var(--text);
    background: #fff;
    padding: 0;
  }

  @page {
    size: A4 landscape;
    margin: 12mm 12mm 14mm 12mm;
  }

  /* ══ PHẦN 1 — HEADER 3 CỘT ═══════════════════════════════ */
  .header {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 18px;
    align-items: center;
    margin-bottom: 16px;
  }

  .h-logo { text-align: left; }
  .h-logo img {
    max-width: 168px; max-height: 96px;
    object-fit: contain;
  }
  .h-logo .logo-ph {
    width: 100px; height: 90px;
    border: 1px dashed var(--line);
    border-radius: 6px;
    display: flex; align-items: center; justify-content: center;
    color: #AAB0BA; font-size: 8.5pt; letter-spacing: 2px;
  }

  .h-title { text-align: center; }
  .h-title .t-vi {
    font-size: 20pt; font-weight: bold;
    color: var(--blue); letter-spacing: 1px; line-height: 1.1;
  }
  .h-title .t-en {
    font-size: 10.5pt; color: var(--muted);
    text-transform: uppercase; margin-top: 3px;
  }
  .h-title .t-no { font-size: 9.5pt; color: var(--ink); margin-top: 6px; }
  .h-title .t-no strong { color: var(--blue); font-weight: bold; }

  .h-company { text-align: right; font-size: 8pt; line-height: 1.45; color: var(--text); font-style: italic; }
  .h-company .c-name {
    font-size: 9.5pt; font-weight: bold; color: var(--ink);
    margin-bottom: 3px; letter-spacing: 0.2px; font-style: normal;
  }
  .h-company a { color: var(--blue); text-decoration: none; }

  /* ══ PHẦN 2 — KHỐI THÔNG TIN 4 CỘT ═══════════════════════ */
  .party {
    display: grid;
    grid-template-columns: auto 15fr auto 1fr;
    gap: 5px 12px;
    align-items: baseline;
    padding: 2px 0 12px;
    margin-bottom: 12px;
  }
  .f-label {
    font-size: 10pt; color: #000;
    text-align: left; white-space: nowrap;
  }
  .f-label.f-label-r { text-align: right; }
  .f-label-en {
    font-size: 8pt; font-style: italic;
    color: #9AA1AD; white-space: nowrap;
  }
  .f-val {
    font-size: 10pt; color: var(--ink); font-weight: bold;
  }
  .f-val-en {
    font-size: 8pt; font-style: italic; color: #9AA1AD;
  }

  /* ══ TABLE ═══════════════════════════════════════════════ */
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 8.5pt;
  }
  thead tr { background: var(--blue); color: #fff; }
  thead th {
    padding: 6px 4px;
    font-weight: bold;
    font-size: 8pt;
    border: 1px solid #000;
  }
  thead th .th-en {
    display: block;
    font-weight: normal;
    font-style: italic;
    font-size: 6.5pt;
    margin-top: 1px;
    opacity: 0.9;
  }
  tbody tr { border-bottom: 1px solid #000; }
  tbody tr.section-row { background: var(--blue-tint) !important; }
  tbody tr.sub-section-row { background: #f0f5ff !important; }
  tbody tr.sub-section-row td {
    font-weight: 600;
    color: #4472c4;
    font-size: 9pt;
    padding: 4px 8px 4px 16px;
    border-bottom: 1px solid #000;
    font-style: normal;
  }
  tbody tr.sub-section-row td.ss-val {
    color: var(--text);
    font-style: normal;
    padding-left: 4px;
  }
  tbody tr.section-row td {
    font-weight: bold;
    color: var(--blue);
    font-size: 9pt;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    padding: 5px 8px;
    border-bottom: 1px solid #000;
  }
  tbody tr.section-row td.sec-val {
    color: var(--text);
    text-transform: none;
    letter-spacing: 0;
  }
  td {
    padding: 5px 4px;
    vertical-align: middle;
    border-left: 1px solid #000;
    border-right: 1px solid #000;
  }
  td:first-child { border-left: 1px solid #000; }
  td:last-child  { border-right: 1px solid #000; }
  .center { text-align: center; }
  .right  { text-align: right !important; }
  .desc   { max-width: 280px; }
  .product-name { display: block; }
  .sku { display: block; font-size: 8.5pt; color: #9AA1AD; margin-top: 1px; }
  .money { font-weight: 500; }

  /* ══ SUMMARY: totals căn phải, số bằng chữ bên dưới ══════ */
  .summary { margin-top: 12px; }
  .totals { width: 190px; margin-left: auto; }
  .tot-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 4px 2px; font-size: 10.5pt; }
  .tot-row .tot-label { color: #000; font-weight: bold; }
  .tot-row .tot-label .en { display: block; font-style: italic; font-weight: normal; font-size: 8pt; color: var(--muted); }
  .tot-row .tot-val { font-weight: 500; white-space: nowrap; }
  .tot-row.grand { margin-top: 4px; padding-top: 7px; border-top: 1px solid #000; font-size: 10.5pt; font-weight: bold; color: #000; }
  .tot-row.grand .tot-label { color: #000; }
  .in-words { margin-top: 10px; font-size: 10pt; color: var(--ink); }
  .in-words .iw-label { font-weight: bold; }
  .in-words .iw-val { font-style: italic; }

  /* ══ TERMS ═══════════════════════════════════════════════ */
  .terms-section {
    display: grid;
    grid-template-columns: 1fr;
    gap: 14px;
    margin-top: 16px;
  }
  .terms-block h4 {
    font-size: 8.5pt;
    font-weight: bold;
    color: var(--blue);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 5px;
  }
  .terms-block p {
    font-size: 9.5pt;
    color: #444;
    line-height: 1.65;
    white-space: pre-wrap;
  }
  .terms-block .term-item { margin-bottom: 4px; }
  .terms-block .term-item:last-child { margin-bottom: 0; }
  .terms-block .term-item p { white-space: normal; margin: 0; line-height: 1.4; }
  .terms-block .term-item .en {
    font-style: italic;
    color: var(--muted);
    font-size: 9pt;
    line-height: 1.3;
    padding-left: 16px;
    margin-top: 1px;
  }

  /* ══ CLOSING NOTE ════════════════════════════════════════ */
  .closing {
    margin-top: 18px;
    font-size: 9.5pt;
    color: var(--text);
    font-style: italic;
    line-height: 1.3;
  }
  .closing .en { color: var(--muted); }

  /* ══ SIGNATURES ══════════════════════════════════════════ */
  .signatures {
    display: flex;
    justify-content: space-between;
    margin-top: 26px;
  }
  .sig-block { width: 45%; text-align: center; }
  .sig-block .sig-title { font-weight: bold; font-size: 10pt; color: var(--ink); margin-bottom: 90px; }
  .sig-block .sig-sub   { font-size: 8.5pt; color: var(--muted); margin-bottom: 90px; }
  .sig-block .sig-line  {
    border-top: 1px solid #9AA1AD;
    padding-top: 4px;
    font-size: 8.5pt;
    color: var(--muted);
  }

  thead { display: table-header-group; }
  tbody tr { break-inside: avoid; }
  .summary { break-before: avoid; }
  .signatures, .closing { break-inside: avoid; }
</style>
</head>
<body>

<!-- ══ HEADER ══ -->
<div class="header">
  <div class="h-logo">
    ${LOGO_DATA_URI
      ? `<img src="${LOGO_DATA_URI}" alt="Logo DNS">`
      : `<div class="logo-ph">LOGO</div>`}
  </div>

  <div class="h-title">
    <div class="t-vi">BẢNG BÁO GIÁ</div>
    <div class="t-en">Quotation</div>
    <div class="t-no">No.: <strong>${esc(q.code ?? q.quote_number ?? '')}</strong></div>
  </div>

  <div class="h-company">
    <div class="c-name">DNS TECHNOLOGY INVEST CO.,LTD</div>
    HCM Office: 661/26 Luy Ban Bich, Phu Thanh Ward, Ho Chi Minh City, Viet Nam<br>
    HN Office: 85 Tam Khuong, Kim Lien Ward, Hanoi City, Viet Nam<br>
    Phone: +84 (028) 73072868 | Hotline: +84 333.072868<br>
    Email: info@dnsvn.com | Website: www.dnstech.vn
  </div>
</div>

<!-- ══ THÔNG TIN 4 CỘT ══ -->
<div class="party">

  <!-- Hàng 1: Kính gửi | value | Ngày báo giá | value -->
  <div class="f-label">Kính gửi:<br><span class="f-label-en">(To)</span></div>
  <div class="f-val">${esc(q.contact_name || q.company_name)}</div>
  <div class="f-label f-label-r">Ngày báo giá:<br><span class="f-label-en">(Quotation Date)</span></div>
  <div class="f-val">${fmtDate(q.quote_date)}</div>

  <!-- Hàng 2: Email | value | Giá trị | value -->
  ${q.contact_email
    ? `<div class="f-label">Email:<br><span class="f-label-en">(Email)</span></div>
  <div class="f-val">${esc(q.contact_email)}</div>`
    : `<div></div><div></div>`}
  <div class="f-label f-label-r">Giá trị:<br><span class="f-label-en">(Validity)</span></div>
  <div class="f-val">${q.valid_days != null ? `${q.valid_days} ngày` : '—'}</div>

  <!-- Hàng 3: Dự án | value | Địa điểm | value -->
  ${q.project_name
    ? `<div class="f-label">Dự án:<br><span class="f-label-en">(Project)</span></div>
  <div class="f-val">${esc(q.project_name)}</div>`
    : `<div></div><div></div>`}
  ${q.delivery_location
    ? `<div class="f-label f-label-r">Địa điểm giao hàng:<br><span class="f-label-en">(Delivery Location)</span></div>
  <div class="f-val">${esc(q.delivery_location)}</div>`
    : `<div></div><div></div>`}

</div>

<!-- ══ BẢNG SẢN PHẨM ══ -->
<table>
  <thead>
    <tr>
      <th style="width:28px">STT<span class="th-en">(No)</span></th>
      <th style="width:90px">MÃ THIẾT BỊ<span class="th-en">(Item Code)</span></th>
      <th style="text-align:center;width:210px">TÊN SẢN PHẨM / MÔ TẢ<span class="th-en">(Description)</span></th>
      <th style="width:38px">ĐVT<span class="th-en">(Unit)</span></th>
      <th style="width:34px">SL<span class="th-en">(Qty)</span></th>
      <th style="width:62px">BẢO HÀNH<span class="th-en">(Warranty)</span></th>
      <th style="width:95px">ĐƠN GIÁ (VNĐ)<span class="th-en">(Unit Price)</span></th>
      <th style="width:95px">THÀNH TIỀN (VNĐ)<span class="th-en">(Amount)</span></th>
      <th style="width:40px">VAT%<span class="th-en">(VAT%)</span></th>
      <th style="width:95px">THUẾ GTGT (VNĐ)<span class="th-en">(VAT Amount)</span></th>
      <th style="width:175px">GHI CHÚ<span class="th-en">(Note)</span></th>
    </tr>
  </thead>
  <tbody>${lineRows}</tbody>
</table>

<!-- ══ SUMMARY ══ -->
<div class="summary">
  <div class="totals">
    <div class="tot-row"><span class="tot-label">TẠM TÍNH<span class="en">(Subtotal)</span></span><span class="tot-val">${fmtMoney(q.subtotal)}</span></div>
    <div class="tot-row"><span class="tot-label">THUẾ VAT<span class="en">(VAT)</span></span><span class="tot-val">${fmtMoney(q.vat_total)}</span></div>
    ${hasDiscount ? `<div class="tot-row"><span class="tot-label">GIẢM GIÁ<span class="en">(Discount)</span></span><span class="tot-val">- ${fmtMoney(q.discount)}</span></div>` : ''}
    <div class="tot-row grand"><span class="tot-label">TỔNG CỘNG<span class="en">(Grand Total)</span></span><span class="tot-val">${fmtMoney(q.grand_total)}</span></div>
  </div>
  <div class="in-words">
    <span class="iw-label">Số tiền bằng chữ: </span>
    <span class="iw-val">${inWords}.</span>
  </div>
</div>

<!-- ══ ĐIỀU KHOẢN ══ -->
<div class="terms-section">
  ${termsHtml}
  ${noteHtml}
</div>

<!-- ══ CLOSING ══ -->
<div class="closing">
  <p>Nếu bạn có bất kỳ thắc mắc nào, xin vui lòng liên hệ với chúng tôi. Trân trọng cảm ơn.</p>
  <p class="en">If you have any questions, please feel free to contact us. Sincerely thank you.</p>
</div>

<!-- ══ CHỮ KÝ ══ -->
<div class="signatures">
  <div class="sig-block">
    <div class="sig-title">DNS TECHNOLOGY INVEST CO.,LTD</div>
    <div class="sig-line">Email: sale@dnsvn.com &nbsp;/&nbsp; Phone: +84 3988 01828</div>
  </div>
</div>

</body>
</html>`
}

// Footer template cho Puppeteer — hiển thị số trang
export function buildFooterTemplate(_expiredAt: string | null): string {
  return `<div style="width:100%;font-family:'Tahoma',sans-serif;font-size:7pt;color:#AAB0BA;
    display:flex;justify-content:flex-end;align-items:center;
    padding:0 12mm;box-sizing:border-box;">
    <span>Trang <span class="pageNumber"></span> / <span class="totalPages"></span></span>
  </div>`
}
