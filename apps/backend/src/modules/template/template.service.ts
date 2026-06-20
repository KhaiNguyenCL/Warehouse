import { FastifyInstance } from 'fastify'
import fs from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import AdmZip from 'adm-zip'
import { TemplateRepository } from './template.repository'
import { QuotationRepository } from '../quotation/quotation.repository'
import {
  TEMPLATE_OBJECT_TYPES,
  TemplateObjectType,
  UpdateTemplateBody,
  ListTemplateQuery,
  MappingInput,
  ExportTemplateBody,
  UploadTemplateInput,
} from './template.schema'

// Quét xl/worksheets/*.xml + xl/sharedStrings.xml tìm marker dạng {d.ten_bien} (CLAUDE.md
// mục 14 bước 2 "Hệ thống detect biến trong template"). Cách này không dùng API nội bộ
// (chưa public, dễ vỡ giữa version) của carbone — chỉ cần regex đơn giản trên XML thô.
// Giới hạn: nếu 1 marker bị Excel tách thành nhiều "run" có định dạng khác nhau giữa dấu
// { và } (VD tô đậm nửa chữ trong ô) thì sẽ không detect được — đây cũng là giới hạn
// chung của Carbone, khuyến nghị admin không định dạng dở dang trong 1 ô khi soạn template.
export function detectVariables(fileBuffer: Buffer): string[] {
  const zip = new AdmZip(fileBuffer)
  const variables = new Set<string>()
  const markerRegex = /\{(d\.[^{}]+)\}/g

  for (const entry of zip.getEntries()) {
    if (!/^xl\/(worksheets\/sheet\d+\.xml|sharedStrings\.xml)$/.test(entry.entryName)) continue
    const xml = entry.getData().toString('utf8')
    let match: RegExpExecArray | null
    while ((match = markerRegex.exec(xml))) {
      variables.add(match[1])
    }
  }
  return [...variables].sort()
}

// Đọc giá trị theo đường dẫn "a.b.c" trên 1 object lồng nhau — dùng để resolve
// database_field của template_field_mappings (VD "company_name", "grand_total").
function getPath(obj: unknown, fieldPath: string): unknown {
  return fieldPath.split('.').reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== 'object') return undefined
    return (acc as Record<string, unknown>)[key]
  }, obj)
}

export class TemplateService {
  private repo: TemplateRepository

  // Nhận FastifyInstance (không chỉ Knex) vì cần app.carbone.render()/uploadDir —
  // giống cách AuthService nhận app để dùng app.jwt.
  constructor(private app: FastifyInstance) {
    this.repo = new TemplateRepository(app.db)
  }

  list(query: ListTemplateQuery) {
    return this.repo.findAll(query)
  }

  async getById(id: string) {
    const template = await this.repo.findById(id)
    if (!template) throw { statusCode: 404, message: 'Template not found' }
    const mappings = await this.repo.findMappings(id)
    return { ...template, mappings }
  }

  async upload(data: UploadTemplateInput, userId: string) {
    if (!TEMPLATE_OBJECT_TYPES.includes(data.object_type as TemplateObjectType)) {
      throw { statusCode: 400, message: `object_type không hợp lệ: ${data.object_type}` }
    }
    if (!data.fileName.toLowerCase().endsWith('.xlsx')) {
      throw { statusCode: 400, message: 'Chỉ hỗ trợ file .xlsx' }
    }

    const storedName = `${randomUUID()}.xlsx`
    await fs.writeFile(path.join(this.app.carbone.uploadDir, storedName), data.fileBuffer)

    const detected_variables = detectVariables(data.fileBuffer)
    const [template] = await this.repo.insert({
      name: data.name,
      object_type: data.object_type,
      file_path: storedName,
      created_by: userId,
    })

    return { ...template, detected_variables }
  }

  async update(id: string, data: UpdateTemplateBody) {
    const existing = await this.repo.findById(id)
    if (!existing) throw { statusCode: 404, message: 'Template not found' }

    if (data.is_default) {
      return this.app.db.transaction(async (trx) => {
        await this.repo.clearDefaultForObjectType(existing.object_type, id, trx)
        const [updated] = await this.repo.update(id, data, trx)
        return updated
      })
    }
    const [updated] = await this.repo.update(id, data)
    return updated
  }

  async replaceMappings(id: string, mappings: MappingInput[]) {
    const existing = await this.repo.findById(id)
    if (!existing) throw { statusCode: 404, message: 'Template not found' }

    for (const m of mappings) {
      if (m.source_type === 'database' && !m.database_field) {
        throw { statusCode: 400, message: `Biến "${m.template_variable}" thiếu database_field` }
      }
      if (m.source_type === 'bitrix' && !m.bitrix_field) {
        throw { statusCode: 400, message: `Biến "${m.template_variable}" thiếu bitrix_field` }
      }
    }

    return this.app.db.transaction((trx) => this.repo.replaceMappings(id, mappings, trx))
  }

  async export(id: string, body: ExportTemplateBody) {
    const template = await this.repo.findById(id)
    if (!template || !template.is_active) throw { statusCode: 404, message: 'Template not found' }

    const mappings = await this.repo.findMappings(id)
    const context = await this.buildContext(template.object_type, body.object_id)
    const renderData = this.buildRenderData(context, mappings)

    const templatePath = path.join(this.app.carbone.uploadDir, template.file_path)
    const options = body.format === 'pdf' ? { convertTo: 'pdf' } : {}
    return this.app.carbone.render(templatePath, renderData, options)
  }

  // Build context phẳng để map field — hiện chỉ hỗ trợ quotation (module duy nhất đã
  // hoàn thiện đủ join/tính toán cần thiết). receipt/delivery_order nằm trong CHECK
  // constraint của document_templates cho tương lai nhưng chưa implement render ở đây.
  private async buildContext(objectType: string, objectId: string) {
    if (objectType !== 'quotation') {
      throw { statusCode: 400, message: `Xuất template cho object_type "${objectType}" chưa được hỗ trợ` }
    }

    const quotationRepo = new QuotationRepository(this.app.db)
    const quotation = await quotationRepo.findById(objectId)
    if (!quotation) throw { statusCode: 404, message: 'Không tìm thấy báo giá' }

    // Carbone lặp dòng qua mảng {d.line_items[i].xxx} — gộp hết line_items của mọi
    // section vào 1 mảng phẳng (kèm section_name) thay vì giữ cấu trúc sections lồng nhau.
    const line_items = quotation.sections.flatMap((s: any) =>
      s.line_items.map((li: any) => ({
        section_name: s.name,
        description: li.description ?? li.bundle_name ?? li.variant_name,
        sku: li.variant_sku ?? li.bundle_sku ?? null,
        unit: li.unit,
        quantity: Number(li.quantity),
        unit_price: Number(li.unit_price),
        vat_percent: Number(li.vat_percent),
        vat_amount: Number(li.vat_amount),
        line_total: Number(li.line_total),
        warranty: li.warranty,
        note: li.note,
      })),
    )

    return {
      ...quotation,
      subtotal: Number(quotation.subtotal),
      vat_total: Number(quotation.vat_total),
      discount: Number(quotation.discount),
      grand_total: Number(quotation.grand_total),
      line_items,
    }
  }

  // source_type='bitrix' để trống (null) — module Bitrix chưa triển khai, không chặn
  // toàn bộ tính năng xuất template vì 1 vài field phụ chưa có nguồn dữ liệu.
  private buildRenderData(context: Record<string, unknown>, mappings: Array<Record<string, any>>) {
    const renderData: Record<string, unknown> = {}
    const missing: string[] = []

    for (const m of mappings) {
      if (m.source_type === 'bitrix') {
        renderData[m.template_variable] = null
        continue
      }
      const value = getPath(context, m.database_field)
      if (m.is_required && (value === undefined || value === null)) {
        missing.push(m.template_variable)
      }
      renderData[m.template_variable] = value ?? null
    }

    if (missing.length > 0) {
      throw { statusCode: 400, message: `Thiếu dữ liệu cho các biến bắt buộc: ${missing.join(', ')}` }
    }
    return renderData
  }
}
