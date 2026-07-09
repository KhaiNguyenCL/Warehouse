import { Knex } from 'knex'

const PREFIX: Record<string, string> = {
  receipt:        'NK',
  delivery_order: 'XK',
  transfer_order: 'CK',
  quotation:      'BG',
  purchase_order: 'PO',
  stocktake:      'KK',
}

const MASTER_PREFIX: Record<string, string> = {
  company: 'CTY',
}

// Sinh mã chứng từ dạng PREFIX-YYYY-NNNN, atomic qua INSERT ... ON CONFLICT DO UPDATE RETURNING.
// Phải gọi trong cùng transaction đang dùng để insert chứng từ đó.
export async function generateDocumentCode(trx: Knex.Transaction, docType: string): Promise<string> {
  const prefix = PREFIX[docType]
  if (!prefix) throw new Error(`Unknown doc type: ${docType}`)

  const year = new Date().getFullYear()

  // Atomic: insert row mới với seq=1, hoặc tăng seq hiện tại lên 1 — RETURNING trả về
  // giá trị sau khi UPDATE, nên 2 request đồng thời luôn nhận 2 seq khác nhau.
  const [row] = await trx.raw<{ rows: { last_seq: number }[] }>(
    `INSERT INTO document_sequences (doc_type, year, last_seq)
     VALUES (:docType, :year, 1)
     ON CONFLICT (doc_type, year)
     DO UPDATE SET last_seq = document_sequences.last_seq + 1
     RETURNING last_seq`,
    { docType, year },
  ).then((r) => [r.rows[0]])

  const seq = String(row.last_seq).padStart(4, '0')
  return `${prefix}-${year}-${seq}`
}

// Sinh mã master data dạng PREFIX-NNNN (không có năm) — dùng year=0 làm sentinel.
export async function generateMasterCode(trx: Knex.Transaction, masterType: string): Promise<string> {
  const prefix = MASTER_PREFIX[masterType]
  if (!prefix) throw new Error(`Unknown master type: ${masterType}`)

  const [row] = await trx.raw<{ rows: { last_seq: number }[] }>(
    `INSERT INTO document_sequences (doc_type, year, last_seq)
     VALUES (:masterType, 0, 1)
     ON CONFLICT (doc_type, year)
     DO UPDATE SET last_seq = document_sequences.last_seq + 1
     RETURNING last_seq`,
    { masterType },
  ).then((r) => [r.rows[0]])

  const seq = String(row.last_seq).padStart(4, '0')
  return `${prefix}-${seq}`
}
