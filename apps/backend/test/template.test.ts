import { describe, it, expect, beforeEach } from 'vitest'
import AdmZip from 'adm-zip'
import { getApp, createUserWithRole, loginAs } from './helpers'

// Tạo 1 file .xlsx tối thiểu (chỉ đủ các phần OOXML bắt buộc để carbone mở được) —
// mỗi marker nằm trong 1 ô riêng dạng inlineStr (không cần sharedStrings.xml).
function buildXlsxFixture(rows: Array<{ label: string; marker: string }>): Buffer {
  const zip = new AdmZip()

  const sheetRows = rows
    .map((row, i) => {
      const r = i + 1
      return `<row r="${r}"><c r="A${r}" t="inlineStr"><is><t>${row.label}</t></is></c><c r="B${r}" t="inlineStr"><is><t>${row.marker}</t></is></c></row>`
    })
    .join('')

  zip.addFile(
    '[Content_Types].xml',
    Buffer.from(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
        '</Types>',
    ),
  )
  zip.addFile(
    '_rels/.rels',
    Buffer.from(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        '</Relationships>',
    ),
  )
  zip.addFile(
    'xl/workbook.xml',
    Buffer.from(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        '<sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>',
    ),
  )
  zip.addFile(
    'xl/_rels/workbook.xml.rels',
    Buffer.from(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
        '</Relationships>',
    ),
  )
  zip.addFile(
    'xl/worksheets/sheet1.xml',
    Buffer.from(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`,
    ),
  )

  return zip.toBuffer()
}

function buildMultipartBody(
  fields: Record<string, string>,
  file: { fieldname: string; filename: string; content: Buffer; contentType: string },
) {
  const boundary = '----WMSTestBoundary' + Math.random().toString(16).slice(2)
  const parts: Buffer[] = []
  for (const [key, value] of Object.entries(fields)) {
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`))
  }
  parts.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${file.fieldname}"; filename="${file.filename}"\r\nContent-Type: ${file.contentType}\r\n\r\n`,
    ),
  )
  parts.push(file.content)
  parts.push(Buffer.from(`\r\n--${boundary}--\r\n`))
  return { body: Buffer.concat(parts), contentType: `multipart/form-data; boundary=${boundary}` }
}

describe('Template', () => {
  let token: string
  let companyId: string
  let warehouseId: string

  beforeEach(async () => {
    await createUserWithRole('Admin', 'admin@test.local', 'Test@123')
    token = await loginAs('admin@test.local', 'Test@123')

    const app = await getApp()
    const [warehouse] = await app
      .db('warehouses')
      .insert({ code: 'WH-TPL-TEST', name: 'Kho test template', type: 'physical' })
      .returning('*')
    warehouseId = warehouse.id
    const [company] = await app.db('companies').insert({ code: 'CUST-TPL', name: 'KH template' }).returning('*')
    companyId = company.id
  })

  async function uploadTemplate(opts: {
    name?: string
    object_type?: string
    rows?: Array<{ label: string; marker: string }>
    fileName?: string
  } = {}) {
    const app = await getApp()
    const rows = opts.rows ?? [
      { label: 'Ma so', marker: '{d.code}' },
      { label: 'Khach hang', marker: '{d.ten_khach_hang}' },
      { label: 'Tong tien', marker: '{d.tong_tien}' },
    ]
    const fileBuffer = buildXlsxFixture(rows)
    const { body, contentType } = buildMultipartBody(
      { name: opts.name ?? 'Báo giá VN', object_type: opts.object_type ?? 'quotation' },
      { fieldname: 'file', filename: opts.fileName ?? 'template.xlsx', content: fileBuffer, contentType: 'application/octet-stream' },
    )
    return app.inject({
      method: 'POST',
      url: '/api/v1/templates',
      headers: { authorization: `Bearer ${token}`, 'content-type': contentType },
      payload: body,
    })
  }

  async function authedInject(opts: Parameters<Awaited<ReturnType<typeof getApp>>['inject']>[0]) {
    const app = await getApp()
    return app.inject({ ...opts, headers: { authorization: `Bearer ${token}`, ...(opts.headers as object) } })
  }

  it('upload thành công, detect đúng các biến {d.x} trong file .xlsx', async () => {
    const res = await uploadTemplate()
    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.payload)
    expect(body.object_type).toBe('quotation')
    expect(body.detected_variables.sort()).toEqual(['d.code', 'd.ten_khach_hang', 'd.tong_tien'])

    const app = await getApp()
    const row = await app.db('document_templates').where({ id: body.id }).first()
    expect(row).toBeDefined()
    expect(row.file_path).toBe(body.file_path)
  })

  it('upload từ chối file không phải .xlsx', async () => {
    const res = await uploadTemplate({ fileName: 'template.docx' })
    expect(res.statusCode).toBe(400)
  })

  it('upload object_type không hợp lệ → 400', async () => {
    const res = await uploadTemplate({ object_type: 'invoice' })
    expect(res.statusCode).toBe(400)
  })

  it('PUT mappings replace toàn bộ — mapping cũ bị xoá hết', async () => {
    const uploadRes = await uploadTemplate()
    const template = JSON.parse(uploadRes.payload)

    await authedInject({
      method: 'PUT',
      url: `/api/v1/templates/${template.id}/mappings`,
      payload: { mappings: [{ template_variable: 'code', source_type: 'database', database_field: 'code' }] },
    })

    const replaceRes = await authedInject({
      method: 'PUT',
      url: `/api/v1/templates/${template.id}/mappings`,
      payload: {
        mappings: [
          { template_variable: 'ten_khach_hang', source_type: 'database', database_field: 'company_name' },
          { template_variable: 'tong_tien', source_type: 'database', database_field: 'grand_total' },
        ],
      },
    })
    expect(replaceRes.statusCode).toBe(200)

    const app = await getApp()
    const mappings = await app.db('template_field_mappings').where({ template_id: template.id })
    expect(mappings).toHaveLength(2)
    expect(mappings.map((m) => m.template_variable).sort()).toEqual(['ten_khach_hang', 'tong_tien'])
  })

  it('PUT mappings thiếu database_field cho source_type=database → 400', async () => {
    const uploadRes = await uploadTemplate()
    const template = JSON.parse(uploadRes.payload)

    const res = await authedInject({
      method: 'PUT',
      url: `/api/v1/templates/${template.id}/mappings`,
      payload: { mappings: [{ template_variable: 'code', source_type: 'database' }] },
    })
    expect(res.statusCode).toBe(400)
  })

  it('PATCH is_default=true tự động bỏ default ở template khác cùng object_type', async () => {
    const t1Res = await uploadTemplate({ name: 'Báo giá VN' })
    const t1 = JSON.parse(t1Res.payload)
    const t2Res = await uploadTemplate({ name: 'Báo giá EN' })
    const t2 = JSON.parse(t2Res.payload)

    await authedInject({ method: 'PATCH', url: `/api/v1/templates/${t1.id}`, payload: { is_default: true } })
    const setT2Res = await authedInject({ method: 'PATCH', url: `/api/v1/templates/${t2.id}`, payload: { is_default: true } })
    expect(setT2Res.statusCode).toBe(200)

    const app = await getApp()
    const t1Row = await app.db('document_templates').where({ id: t1.id }).first()
    const t2Row = await app.db('document_templates').where({ id: t2.id }).first()
    expect(t1Row.is_default).toBe(false)
    expect(t2Row.is_default).toBe(true)
  })

  it('export quotation: render đúng dữ liệu theo mapping, trả về file .xlsx hợp lệ', async () => {
    const uploadRes = await uploadTemplate()
    const template = JSON.parse(uploadRes.payload)
    await authedInject({
      method: 'PUT',
      url: `/api/v1/templates/${template.id}/mappings`,
      payload: {
        mappings: [
          { template_variable: 'code', source_type: 'database', database_field: 'code', is_required: true },
          { template_variable: 'ten_khach_hang', source_type: 'database', database_field: 'company_name' },
          { template_variable: 'tong_tien', source_type: 'database', database_field: 'grand_total' },
        ],
      },
    })

    const quotationRes = await authedInject({
      method: 'POST',
      url: '/api/v1/quotations',
      payload: {
        code: 'BG-TPL-001',
        company_id: companyId,
        warehouse_id: warehouseId,
        sections: [{ name: 'Thiết bị', line_items: [{ description: 'Switch', quantity: 1, unit_price: 1000000 }] }],
      },
    })
    const quotation = JSON.parse(quotationRes.payload)

    const exportRes = await authedInject({
      method: 'POST',
      url: `/api/v1/templates/${template.id}/export`,
      payload: { object_id: quotation.id },
    })
    expect(exportRes.statusCode).toBe(200)
    expect(exportRes.headers['content-type']).toContain('spreadsheetml')

    const rendered = new AdmZip(exportRes.rawPayload)
    const sheetXml = rendered.getEntry('xl/worksheets/sheet1.xml')!.getData().toString('utf8')
    expect(sheetXml).toContain('BG-TPL-001')
    expect(sheetXml).toContain('KH template')
    expect(sheetXml).not.toContain('{d.code}')
  })

  it('export báo lỗi 400 khi thiếu dữ liệu cho biến bắt buộc (database_field sai)', async () => {
    const uploadRes = await uploadTemplate()
    const template = JSON.parse(uploadRes.payload)
    await authedInject({
      method: 'PUT',
      url: `/api/v1/templates/${template.id}/mappings`,
      payload: {
        mappings: [
          { template_variable: 'code', source_type: 'database', database_field: 'truong_khong_ton_tai', is_required: true },
        ],
      },
    })

    const quotationRes = await authedInject({
      method: 'POST',
      url: '/api/v1/quotations',
      payload: {
        code: 'BG-TPL-002',
        company_id: companyId,
        sections: [{ name: 'A', line_items: [{ description: 'X', quantity: 1, unit_price: 1000 }] }],
      },
    })
    const quotation = JSON.parse(quotationRes.payload)

    const exportRes = await authedInject({
      method: 'POST',
      url: `/api/v1/templates/${template.id}/export`,
      payload: { object_id: quotation.id },
    })
    expect(exportRes.statusCode).toBe(400)
  })

  it('export object_type chưa hỗ trợ (receipt) → 400', async () => {
    const uploadRes = await uploadTemplate({ object_type: 'receipt' })
    const template = JSON.parse(uploadRes.payload)

    const exportRes = await authedInject({
      method: 'POST',
      url: `/api/v1/templates/${template.id}/export`,
      payload: { object_id: '00000000-0000-0000-0000-000000000000' },
    })
    expect(exportRes.statusCode).toBe(400)
  })
})
