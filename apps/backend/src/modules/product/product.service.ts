import { Knex } from 'knex'
import { ProductRepository } from './product.repository'
import {
  CreateCategoryBody,
  UpdateCategoryBody,
  CreateBrandBody,
  UpdateBrandBody,
  CreateProductBody,
  UpdateProductBody,
  ListProductQuery,
  CreateVariantBody,
  UpdateVariantBody,
  CreateVariantSupplierBody,
  UpdateVariantSupplierBody,
  CreateBundleItemBody,
  UpdateBundleItemBody,
  CreateCustomerPriceBody,
  UpdateCustomerPriceBody,
  CreateCustomerDescriptionBody,
  UpdateCustomerDescriptionBody,
} from './product.schema'

// Postgres SQLSTATE codes — map sang lỗi nghiệp vụ dễ hiểu thay vì để lộ lỗi DB thô ra API.
const PG_UNIQUE_VIOLATION = '23505'
const PG_FOREIGN_KEY_VIOLATION = '23503'

function mapDbError(err: any): never {
  if (err.code === PG_UNIQUE_VIOLATION) {
    throw { statusCode: 409, message: 'Mã hoặc SKU đã tồn tại' }
  }
  if (err.code === PG_FOREIGN_KEY_VIOLATION) {
    throw { statusCode: 400, message: 'Tham chiếu không hợp lệ (category/brand/product/company không tồn tại)' }
  }
  throw err
}

export class ProductService {
  private repo: ProductRepository

  constructor(private db: Knex) {
    this.repo = new ProductRepository(db)
  }

  // ─── Categories ────────────────────────────────────────────────────────

  listCategories() {
    return this.repo.findAllCategories()
  }

  async createCategory(data: CreateCategoryBody) {
    if (data.short_code) {
      const existing = await this.repo.findCategoryByShortCode(data.short_code)
      if (existing) {
        if (!existing.is_active) {
          // Soft-deleted category with same short_code → reactivate with new data
          const { short_code, ...rest } = data
          return this.repo.reactivateCategory(existing.id, rest)
        }
        throw { statusCode: 409, message: `Đã tồn tại danh mục với mã "${data.short_code}"` }
      }
    }
    try {
      return await this.repo.createCategory(data)
    } catch (err) {
      mapDbError(err)
    }
  }

  async updateCategory(id: string, data: UpdateCategoryBody) {
    try {
      return await this.repo.updateCategory(id, data)
    } catch (err) {
      mapDbError(err)
    }
  }

  async deleteCategory(id: string) {
    const result = await this.repo.countProductsByCategory(id)
    if (Number(result?.count ?? 0) > 0) throw { statusCode: 409, message: 'Danh mục đang được dùng bởi sản phẩm, không thể xóa' }
    await this.repo.deleteCategory(id)
  }

  // ─── Brands ────────────────────────────────────────────────────────────

  listBrands() {
    return this.repo.findAllBrands()
  }

  async createBrand(data: CreateBrandBody) {
    if (data.short_code) {
      const existing = await this.repo.findBrandByShortCode(data.short_code)
      if (existing) {
        if (!existing.is_active) {
          const { short_code, ...rest } = data
          return this.repo.reactivateBrand(existing.id, rest)
        }
        throw { statusCode: 409, message: `Đã tồn tại thương hiệu với mã "${data.short_code}"` }
      }
    }
    try {
      return await this.repo.createBrand(data)
    } catch (err) {
      mapDbError(err)
    }
  }

  async updateBrand(id: string, data: UpdateBrandBody) {
    try {
      return await this.repo.updateBrand(id, data)
    } catch (err) {
      mapDbError(err)
    }
  }

  async deleteBrand(id: string) {
    const result = await this.repo.countProductsByBrand(id)
    if (Number(result?.count ?? 0) > 0) throw { statusCode: 409, message: 'Thương hiệu đang được dùng bởi sản phẩm, không thể xóa' }
    await this.repo.deleteBrand(id)
  }

  // ─── Products ──────────────────────────────────────────────────────────

  listProducts(query: ListProductQuery) {
    return this.repo.findAllProducts(query)
  }

  async getProductById(id: string) {
    const product = await this.repo.findProductById(id)
    if (!product) throw { statusCode: 404, message: 'Product not found' }
    return product
  }

  async createProduct(data: CreateProductBody) {
    try {
      return await this.repo.createProduct(data)
    } catch (err) {
      mapDbError(err)
    }
  }

  async updateProduct(id: string, data: UpdateProductBody) {
    const existing = await this.repo.findProductById(id)
    if (!existing) throw { statusCode: 404, message: 'Product not found' }

    try {
      return await this.repo.updateProduct(id, data)
    } catch (err) {
      mapDbError(err)
    }
  }

  // ─── Variants ──────────────────────────────────────────────────────────

  searchVariants(search?: string, productType?: string, limit?: number, inStockOnly?: boolean) {
    return this.repo.searchVariants(search, productType, limit, inStockOnly)
  }

  listVariantsPaginated(opts: {
    search?: string; productType?: string; categoryId?: string; brandId?: string;
    isActive?: boolean; page?: number; limit?: number
  }) {
    return this.repo.listVariantsPaginated(opts)
  }

  async addVariant(productId: string, data: CreateVariantBody) {
    const product = await this.repo.findProductById(productId)
    if (!product) throw { statusCode: 404, message: 'Product not found' }
    try {
      return await this.repo.createVariant(productId, data)
    } catch (err) {
      mapDbError(err)
    }
  }

  async updateVariant(productId: string, variantId: string, data: UpdateVariantBody) {
    const variant = await this.repo.findVariantById(variantId)
    if (!variant || variant.product_id !== productId) {
      throw { statusCode: 404, message: 'Variant not found' }
    }

    try {
      return await this.repo.updateVariant(variantId, data)
    } catch (err) {
      mapDbError(err)
    }
  }

  async deleteVariant(productId: string, variantId: string) {
    const variant = await this.repo.findVariantById(variantId)
    if (!variant || variant.product_id !== productId) {
      throw { statusCode: 404, message: 'Variant not found' }
    }
    if (await this.repo.hasVariantStock(variantId)) {
      throw { statusCode: 409, message: 'Không thể xóa SKU còn tồn kho hoặc serial number' }
    }
    await this.repo.softDeleteVariant(variantId)
  }

  async deleteProduct(productId: string) {
    const product = await this.repo.findProductById(productId)
    if (!product) throw { statusCode: 404, message: 'Product not found' }
    if (await this.repo.hasProductStock(productId)) {
      throw { statusCode: 409, message: 'Không thể xóa sản phẩm còn tồn kho' }
    }
    await this.repo.softDeleteProduct(productId)
  }

  // ─── Variant Suppliers ─────────────────────────────────────────────────
  // CLAUDE.md mục 16: variant_suppliers — danh sách NCC cung cấp 1 variant, kèm giá/SKU/
  // lead time riêng theo từng NCC, dùng để tham khảo khi tạo phiếu nhập (purchase).

  private async assertVariantBelongsToProduct(productId: string, variantId: string) {
    const variant = await this.repo.findVariantById(variantId)
    if (!variant || variant.product_id !== productId) {
      throw { statusCode: 404, message: 'Variant not found' }
    }
  }

  async listVariantSuppliers(productId: string, variantId: string) {
    await this.assertVariantBelongsToProduct(productId, variantId)
    return this.repo.findVariantSuppliers(variantId)
  }

  async addVariantSupplier(productId: string, variantId: string, data: CreateVariantSupplierBody) {
    await this.assertVariantBelongsToProduct(productId, variantId)

    try {
      return await this.db.transaction(async (trx) => {
        if (data.is_preferred) {
          await this.repo.clearPreferredSupplier(variantId, null, trx)
        }
        return this.repo.addVariantSupplier(variantId, data, trx)
      })
    } catch (err) {
      mapDbError(err)
    }
  }

  async updateVariantSupplier(
    productId: string,
    variantId: string,
    supplierId: string,
    data: UpdateVariantSupplierBody,
  ) {
    await this.assertVariantBelongsToProduct(productId, variantId)
    const supplier = await this.repo.findVariantSupplierById(supplierId)
    if (!supplier || supplier.variant_id !== variantId) {
      throw { statusCode: 404, message: 'Variant supplier not found' }
    }

    try {
      return await this.db.transaction(async (trx) => {
        if (data.is_preferred) {
          await this.repo.clearPreferredSupplier(variantId, supplierId, trx)
        }
        return this.repo.updateVariantSupplier(supplierId, data, trx)
      })
    } catch (err) {
      mapDbError(err)
    }
  }

  async deleteVariantSupplier(productId: string, variantId: string, supplierId: string) {
    await this.assertVariantBelongsToProduct(productId, variantId)
    const supplier = await this.repo.findVariantSupplierById(supplierId)
    if (!supplier || supplier.variant_id !== variantId) {
      throw { statusCode: 404, message: 'Variant supplier not found' }
    }
    await this.repo.deleteVariantSupplier(supplierId)
  }

  // ─── Bundle Items ──────────────────────────────────────────────────────
  // CLAUDE.md mục 4: bundle có SKU/giá riêng, gồm nhiều sản phẩm con với quantity riêng,
  // không lồng bundle trong bundle.

  private async assertBundleVariant(productId: string, variantId: string) {
    await this.assertVariantBelongsToProduct(productId, variantId)
    const variant = await this.repo.findVariantWithProductType(variantId)
    if (variant.product_type !== 'bundle') {
      throw { statusCode: 400, message: 'Chỉ variant thuộc Product loại "bundle" mới khai báo được sản phẩm con' }
    }
  }

  async listBundleItems(productId: string, variantId: string) {
    await this.assertBundleVariant(productId, variantId)
    return this.repo.findBundleItems(variantId)
  }

  async addBundleItem(productId: string, variantId: string, data: CreateBundleItemBody) {
    await this.assertBundleVariant(productId, variantId)

    if (data.item_variant_id === variantId) {
      throw { statusCode: 400, message: 'Sản phẩm con không thể tự tham chiếu chính bundle này' }
    }
    const itemVariant = await this.repo.findVariantWithProductType(data.item_variant_id)
    if (!itemVariant) throw { statusCode: 400, message: 'item_variant_id không tồn tại' }
    if (itemVariant.product_type === 'bundle') {
      throw { statusCode: 400, message: 'Không thể lồng bundle trong bundle' }
    }

    try {
      return await this.repo.addBundleItem(variantId, data)
    } catch (err: any) {
      if (err.code === PG_UNIQUE_VIOLATION) {
        throw { statusCode: 409, message: 'Sản phẩm con này đã có trong bundle — sửa quantity ở dòng hiện có' }
      }
      mapDbError(err)
    }
  }

  async updateBundleItem(productId: string, variantId: string, itemId: string, data: UpdateBundleItemBody) {
    await this.assertBundleVariant(productId, variantId)
    const item = await this.repo.findBundleItemById(itemId)
    if (!item || item.bundle_variant_id !== variantId) {
      throw { statusCode: 404, message: 'Bundle item not found' }
    }
    return this.repo.updateBundleItem(itemId, data)
  }

  async deleteBundleItem(productId: string, variantId: string, itemId: string) {
    await this.assertBundleVariant(productId, variantId)
    const item = await this.repo.findBundleItemById(itemId)
    if (!item || item.bundle_variant_id !== variantId) {
      throw { statusCode: 404, message: 'Bundle item not found' }
    }
    await this.repo.deleteBundleItem(itemId)
  }

  // ─── Customer Prices ───────────────────────────────────────────────────────

  async listCustomerPrices(productId: string, variantId: string) {
    await this.assertVariantBelongsToProduct(productId, variantId)
    return this.repo.findCustomerPrices(variantId)
  }

  async addCustomerPrice(productId: string, variantId: string, data: CreateCustomerPriceBody) {
    await this.assertVariantBelongsToProduct(productId, variantId)
    try {
      return await this.repo.addCustomerPrice(variantId, data)
    } catch (err) {
      mapDbError(err)
    }
  }

  async updateCustomerPrice(productId: string, variantId: string, priceId: string, data: UpdateCustomerPriceBody) {
    await this.assertVariantBelongsToProduct(productId, variantId)
    const existing = await this.repo.findCustomerPriceById(priceId)
    if (!existing || existing.variant_id !== variantId) {
      throw { statusCode: 404, message: 'Customer price not found' }
    }
    return this.repo.updateCustomerPrice(priceId, data)
  }

  async deleteCustomerPrice(productId: string, variantId: string, priceId: string) {
    await this.assertVariantBelongsToProduct(productId, variantId)
    const existing = await this.repo.findCustomerPriceById(priceId)
    if (!existing || existing.variant_id !== variantId) {
      throw { statusCode: 404, message: 'Customer price not found' }
    }
    await this.repo.deleteCustomerPrice(priceId)
  }

  // ─── Customer Descriptions ────────────────────────────────────────────────

  async listCustomerDescriptions(productId: string, variantId: string, companyId?: string) {
    await this.assertVariantBelongsToProduct(productId, variantId)
    return this.repo.findCustomerDescriptions(variantId, companyId)
  }

  async addCustomerDescription(productId: string, variantId: string, data: CreateCustomerDescriptionBody) {
    await this.assertVariantBelongsToProduct(productId, variantId)
    try {
      return await this.repo.addCustomerDescription(variantId, data)
    } catch (err) {
      mapDbError(err)
    }
  }

  async updateCustomerDescription(productId: string, variantId: string, descId: string, data: UpdateCustomerDescriptionBody) {
    await this.assertVariantBelongsToProduct(productId, variantId)
    const existing = await this.repo.findCustomerDescriptionById(descId)
    if (!existing || existing.variant_id !== variantId) {
      throw { statusCode: 404, message: 'Customer description not found' }
    }
    return this.repo.updateCustomerDescription(descId, data)
  }

  async deleteCustomerDescription(productId: string, variantId: string, descId: string) {
    await this.assertVariantBelongsToProduct(productId, variantId)
    const existing = await this.repo.findCustomerDescriptionById(descId)
    if (!existing || existing.variant_id !== variantId) {
      throw { statusCode: 404, message: 'Customer description not found' }
    }
    await this.repo.deleteCustomerDescription(descId)
  }

  // ─── Excel Import ─────────────────────────────────────────────────────────

  async importFromExcel(buffer: Buffer, userId?: string) {
    const XLSX = await import('xlsx')
    const wb = XLSX.read(buffer, { type: 'buffer' })

    // ── Detect format: multi-sheet mới (có sheet "Sản phẩm" + "SKU")
    //    hoặc single-sheet cũ (sheet đầu tiên, flat 12 cột).
    const hasMultiSheet = wb.SheetNames.includes('Sản phẩm') && wb.SheetNames.includes('SKU')

    // bundle không hỗ trợ import Excel — phải tạo qua UI để khai báo sản phẩm con.
    const PRODUCT_TYPES_VALID = ['storable', 'consumable', 'service']
    const created_products: string[] = []
    const created_variants: string[] = []
    const skipped: string[] = []
    const errors: { sheet?: string; row: number; reason: string }[] = []

    function toRows(ws: any): any[][] {
      return (XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][])
        .slice(1)
        .filter((r: any[]) => r.some((c: any) => String(c).trim()))
    }

    function num(v: string): number | undefined {
      const n = Number(String(v).replace(/,/g, ''))
      return isNaN(n) || v === '' ? undefined : n
    }

    if (hasMultiSheet) {
      // ── Format mới: sheet Sản phẩm ────────────────────────────────────────
      // Cột: TênSP | MãSP | LoạiSP | TênDanhMục | TênThươngHiệu
      const prodRows = toRows(wb.Sheets['Sản phẩm'])
      for (let i = 0; i < prodRows.length; i++) {
        const rowNum = i + 2
        const [productName, productCode, productType, categoryName, brandName] =
          prodRows[i].map((c: any) => String(c ?? '').trim())

        if (!productName) { errors.push({ sheet: 'Sản phẩm', row: rowNum, reason: 'Thiếu Tên sản phẩm' }); continue }
        if (!productCode) { errors.push({ sheet: 'Sản phẩm', row: rowNum, reason: 'Thiếu Mã sản phẩm' }); continue }
        if (!PRODUCT_TYPES_VALID.includes(productType)) {
          errors.push({ sheet: 'Sản phẩm', row: rowNum, reason: `Loại SP không hợp lệ: "${productType}"` }); continue
        }

        try {
          const category = categoryName ? await this.repo.findCategoryByName(categoryName) : null
          const brand    = brandName    ? await this.repo.findBrandByName(brandName)       : null
          if (categoryName && !category) { errors.push({ sheet: 'Sản phẩm', row: rowNum, reason: `Danh mục "${categoryName}" không tồn tại` }); continue }
          if (brandName    && !brand)    { errors.push({ sheet: 'Sản phẩm', row: rowNum, reason: `Thương hiệu "${brandName}" không tồn tại` }); continue }

          const existing = await this.repo.findProductByCode(productCode)
          if (!existing) {
            await this.repo.createProductImport({
              name: productName, code: productCode, product_type: productType,
              category_id: category?.id, brand_id: brand?.id,
            })
            created_products.push(productCode)
          }
        } catch (err: any) {
          errors.push({ sheet: 'Sản phẩm', row: rowNum, reason: err?.message ?? 'Lỗi không xác định' })
        }
      }

      // ── Format mới: sheet SKU ──────────────────────────────────────────────
      // Cột: MãSP | TênSKU | MãHàng | Model | PartNo | Đơn vị | Tiền tệ
      //      | GiáNhập | GiáBán | VAT% | BHHãng | CânNặng | MôTả
      const skuRows = toRows(wb.Sheets['SKU'])
      for (let i = 0; i < skuRows.length; i++) {
        const rowNum = i + 2
        const [
          productCode, variantName, itemCode, model, partNumber,
          unit, currency,
          costPriceRaw, salePriceRaw, vatRaw, warrantyRaw, weightRaw, description,
        ] = skuRows[i].map((c: any) => String(c ?? '').trim())

        if (!productCode) { errors.push({ sheet: 'SKU', row: rowNum, reason: 'Thiếu Mã sản phẩm' }); continue }
        if (!variantName) { errors.push({ sheet: 'SKU', row: rowNum, reason: 'Thiếu Tên SKU' }); continue }

        try {
          const product = await this.repo.findProductByCode(productCode)
          if (!product) { errors.push({ sheet: 'SKU', row: rowNum, reason: `Mã sản phẩm "${productCode}" không tồn tại` }); continue }

          if (itemCode) {
            const existing = await this.repo.findVariantByItemCode(itemCode)
            if (existing) { skipped.push(itemCode); continue }
          }

          await this.repo.createVariantImport({
            product_id: product.id,
            name: variantName,
            item_code: itemCode || undefined,
            model: model || undefined,
            part_number: partNumber || undefined,
            unit: unit || undefined,
            currency: currency || 'VND',
            cost_price: num(costPriceRaw),
            sale_price: num(salePriceRaw),
            vat_percent: num(vatRaw) ?? 0,
            manufacturer_warranty_months: num(warrantyRaw) ?? 0,
            weight_kg: num(weightRaw),
            description: description || undefined,
          })
          created_variants.push(itemCode || variantName)
        } catch (err: any) {
          errors.push({ sheet: 'SKU', row: rowNum, reason: err?.message ?? 'Lỗi không xác định' })
        }
      }
    } else {
      // ── Format cũ: 1 sheet phẳng (backward-compat) ────────────────────────
      // Cột: TênSP | MãSP | LoạiSP | MãDM | MãHiệu | TênSKU | MãHàng | ĐVị | GiáBán | GiáNhập | VAT | BH
      const ws = wb.Sheets[wb.SheetNames[0]]
      const dataRows = toRows(ws)

      for (let i = 0; i < dataRows.length; i++) {
        const rowNum = i + 2
        const [
          productName, productCode, productType,
          categoryCode, brandCode,
          variantName, itemCode, unit,
          salePriceRaw, costPriceRaw, vatRaw, warrantyRaw,
        ] = dataRows[i].map((c: any) => String(c ?? '').trim())

        if (!productName) { errors.push({ row: rowNum, reason: 'Thiếu Tên sản phẩm' }); continue }
        if (!productCode) { errors.push({ row: rowNum, reason: 'Thiếu Mã sản phẩm' }); continue }
        if (!PRODUCT_TYPES_VALID.includes(productType)) {
          errors.push({ row: rowNum, reason: `Loại SP không hợp lệ: "${productType}"` }); continue
        }
        if (!variantName) { errors.push({ row: rowNum, reason: 'Thiếu Tên SKU' }); continue }

        try {
          const category = categoryCode ? await this.repo.findCategoryByShortCode(categoryCode) : null
          const brand    = brandCode    ? await this.repo.findBrandByShortCode(brandCode)       : null
          if (categoryCode && !category) { errors.push({ row: rowNum, reason: `Mã danh mục "${categoryCode}" không tồn tại` }); continue }
          if (brandCode    && !brand)    { errors.push({ row: rowNum, reason: `Mã thương hiệu "${brandCode}" không tồn tại` }); continue }

          let product = await this.repo.findProductByCode(productCode)
          if (!product) {
            product = await this.repo.createProductImport({
              name: productName, code: productCode, product_type: productType,
              category_id: category?.id, brand_id: brand?.id,
            })
            created_products.push(productCode)
          }

          if (itemCode) {
            const existing = await this.repo.findVariantByItemCode(itemCode)
            if (existing) { skipped.push(itemCode || variantName); continue }
          }

          const salePrice = salePriceRaw ? Number(String(salePriceRaw).replace(/[,\.]/g, '')) || undefined : undefined
          const costPrice = costPriceRaw ? Number(String(costPriceRaw).replace(/[,\.]/g, '')) || undefined : undefined

          await this.repo.createVariantImport({
            product_id: product.id,
            name: variantName,
            item_code: itemCode || undefined,
            unit: unit || undefined,
            sale_price: salePrice,
            cost_price: costPrice,
            vat_percent: Number(vatRaw) || 0,
            manufacturer_warranty_months: Number(warrantyRaw) || 0,
          })
          created_variants.push(itemCode || variantName)
        } catch (err: any) {
          errors.push({ row: rowNum, reason: err?.message ?? 'Lỗi không xác định' })
        }
      }
    }

    return { created_products, created_variants, skipped, errors }
  }

  async generateImportTemplate(): Promise<Buffer> {
    const ExcelJS = require('exceljs')
    const wb = new ExcelJS.Workbook()

    // ── Hàm helper tạo worksheet với header + độ rộng cột ────────────────────
    function makeSheet(name: string, rows: any[][], colWidths: number[]) {
      const ws = wb.addWorksheet(name)
      ws.columns = colWidths.map((width) => ({ width }))
      rows.forEach((row) => ws.addRow(row))
      return ws
    }

    // ── Sheet 1: Hướng dẫn ───────────────────────────────────────────────────
    makeSheet('Hướng dẫn', [
      ['HƯỚNG DẪN NHẬP LIỆU DANH MỤC SẢN PHẨM'],
      [],
      ['❓ Sản phẩm và SKU khác nhau thế nào?'],
      ['  - SẢN PHẨM (Product) = dòng sản phẩm chung, chưa bán được, không có giá/tồn kho riêng.'],
      ['    VD: "Switch Cisco SG350" — mới chỉ là tên dòng, chưa biết bán loại 28 port hay 52 port, giá bao nhiêu.'],
      ['  - SKU (Variant) = phiên bản CỤ THỂ, bán/nhập/xuất kho được — mỗi SKU có mã hàng, giá, đơn vị, tồn kho RIÊNG.'],
      ['    VD: Sản phẩm "Switch Cisco SG350" có 2 SKU: "SG350-28P" (bản 28 port, giá X) và "SG350-52P" (bản 52 port, giá Y) — 2 tồn kho tách biệt.'],
      ['  - 1 Sản phẩm luôn có ÍT NHẤT 1 SKU. Kể cả sản phẩm chỉ có 1 phiên bản duy nhất (không chia dòng con) vẫn phải tạo đủ 2 dòng: 1 dòng ở sheet Sản phẩm + 1 dòng ở sheet SKU tương ứng — vì giá bán và tồn kho luôn nằm ở cấp SKU, sheet Sản phẩm không có 2 cột đó.'],
      ['  - Ngược lại: 1 dòng ở sheet SKU luôn phải khớp về đúng 1 Mã sản phẩm đã có (ở sheet Sản phẩm hoặc đã có sẵn trong hệ thống) — không có SKU nào "lơ lửng" không thuộc sản phẩm nào.'],
      [],
      ['📌 Quy trình nhập liệu:'],
      ['  1. Nếu chỉ thêm SKU cho sản phẩm ĐÃ CÓ SẴN: bỏ qua sheet Sản phẩm, sang thẳng bước 2 — dropdown Mã sản phẩm ở sheet SKU đã có sẵn tất cả sản phẩm hiện có.'],
      ['  2. Nếu cần tạo SẢN PHẨM MỚI: điền vào sheet Sản phẩm (1 dòng = 1 sản phẩm) — cột Danh mục/Thương hiệu chọn trực tiếp từ dropdown, không cần gõ mã. Gõ thêm dòng nào ở đây là dropdown Mã sản phẩm bên sheet SKU có ngay dòng đó.'],
      ['  3. Điền dữ liệu vào sheet SKU (1 dòng = 1 SKU, nhiều SKU cho cùng sản phẩm = nhiều dòng) — cột Mã sản phẩm chọn từ dropdown (gồm cả sản phẩm có sẵn lẫn sản phẩm mới vừa thêm ở bước 2).'],
      ['  4. Upload file này vào WMS qua menu Sản phẩm → Import.'],
      [],
      ['📌 Lưu ý:'],
      ['  - Cột có dấu * là bắt buộc.'],
      ['  - Mã sản phẩm và Mã hàng phải là duy nhất trong toàn hệ thống.'],
      ['  - Nếu Mã sản phẩm đã tồn tại trong DB, hệ thống sẽ dùng sản phẩm đó (không tạo mới).'],
      ['  - Nếu Mã hàng (SKU) đã tồn tại, dòng đó sẽ bị bỏ qua.'],
      ['  - Loại SP: storable (thiết bị có serial), consumable (vật tư), service (dịch vụ). Không hỗ trợ import bundle (gói sản phẩm) — tạo bundle trực tiếp trên web.'],
      ['  - Tiền tệ: VND, USD, EUR, CNY, JPY.'],
      ['  - Đơn vị: tham khảo sheet Đơn vị hoặc tự nhập.'],
      ['  - Danh mục/Thương hiệu ở sheet Sản phẩm nhập đúng TÊN (không phải mã) — chọn từ dropdown cho chắc chắn khớp.'],
      ['  - Dropdown Danh mục/Thương hiệu lấy đúng danh sách tại THỜI ĐIỂM TẢI file này. Nếu sau đó có thêm/sửa danh mục hoặc thương hiệu, hãy tải lại file mẫu mới để dropdown cập nhật.'],
    ], [80])

    // ── Fetch data thực tế từ DB ─────────────────────────────────────────────
    const [cats, brands, existingProducts] = await Promise.all([
      this.repo.findAllCategories(),
      this.repo.findAllBrands(),
      this.repo.findAllProductCodes(),
    ])

    // ── Sheet 2: Danh mục (export — nguồn dropdown cho sheet Sản phẩm) ────────
    makeSheet('Danh mục', [
      ['Tên danh mục (chọn ở sheet Sản phẩm)', 'Mã (short_code, chỉ để tham khảo)'],
      ...cats.map((c: any) => [c.name, c.short_code ?? '']),
    ], [36, 32])

    // ── Sheet 3: Thương hiệu (export — nguồn dropdown cho sheet Sản phẩm) ────
    makeSheet('Thương hiệu', [
      ['Tên thương hiệu (chọn ở sheet Sản phẩm)', 'Mã (short_code, chỉ để tham khảo)'],
      ...brands.map((b: any) => [b.name, b.short_code ?? '']),
    ], [36, 32])

    // ── Sheet 4: Sản phẩm hiện có (export — nguồn dropdown Mã sản phẩm ở sheet SKU,
    //    gộp cùng sản phẩm mới qua sheet ẩn MaSP_All, xem thêm bên dưới) ──────────
    makeSheet('Sản phẩm hiện có', [
      ['Mã sản phẩm', 'Tên sản phẩm', 'Loại SP'],
      ...existingProducts.map((p: any) => [p.code, p.name, p.product_type]),
    ], [30, 36, 16])

    // ── Sheet 5: Đơn vị (danh sách gợi ý) ───────────────────────────────────
    const unitList = [
      'Cái', 'Chiếc', 'Bộ', 'Hộp', 'Cuộn', 'Mét', 'Cổng',
      'License', 'Gói', 'Dây', 'Lần', 'Giờ', 'Ngày',
    ]
    makeSheet('Đơn vị', [
      ['Đơn vị', 'Mô tả'],
      ['Cái', 'Thiết bị rời'], ['Chiếc', 'Giống Cái'], ['Bộ', 'Combo nhiều thứ'],
      ['Hộp', 'Đóng hộp'], ['Cuộn', 'Cáp/dây cuộn'],
      ['Mét', 'Tính theo chiều dài'], ['Cổng', 'Port/cổng kết nối'],
      ['License', 'Bản quyền phần mềm'], ['Gói', 'Package dịch vụ'],
      ['Dây', 'Dây đơn'], ['Lần', 'Dịch vụ tính theo lần'],
      ['Giờ', 'Dịch vụ tính theo giờ'], ['Ngày', 'Dịch vụ tính theo ngày'],
    ], [16, 30])

    // ── Sheet 6: Sản phẩm (nhập liệu) ───────────────────────────────────────
    const prodSheet = makeSheet('Sản phẩm', [
      [
        'Tên sản phẩm *',
        'Mã sản phẩm *',
        'Loại SP * (storable/consumable/service)',
        'Danh mục (chọn từ dropdown)',
        'Thương hiệu (chọn từ dropdown)',
      ],
    ], [30, 20, 38, 32, 32])

    // ── Sheet 7: SKU (nhập liệu) ─────────────────────────────────────────────
    const skuSheet = makeSheet('SKU', [
      [
        'Mã sản phẩm * (chọn từ dropdown — gồm cả sản phẩm có sẵn lẫn sản phẩm mới ở sheet Sản phẩm)',
        'Tên SKU *',
        'Mã hàng (item_code)',
        'Model (mã nhà SX)',
        'Part Number',
        'Đơn vị (xem sheet Đơn vị)',
        'Tiền tệ (VND/USD/EUR/CNY/JPY)',
        'Giá nhập gợi ý',
        'Giá bán gợi ý',
        'VAT%',
        'BH hãng (tháng)',
        'Cân nặng (kg)',
        'Mô tả ngắn',
      ],
    ], [38, 26, 22, 20, 18, 20, 22, 16, 16, 8, 16, 14, 40])

    // ── Dropdown (data validation) cho các cột mã hoá ────────────────────────
    const LAST_ROW = 500 // số dòng dữ liệu tối đa hỗ trợ dropdown

    function applyListValidation(ws: typeof prodSheet, col: string, formulae: string[]) {
      for (let r = 2; r <= LAST_ROW; r++) {
        ws.getCell(`${col}${r}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae,
          showErrorMessage: true,
          errorStyle: 'warning',
          error: 'Giá trị không có trong danh sách gợi ý — vẫn có thể nhập tay nếu chắc chắn đúng.',
        }
      }
    }

    applyListValidation(prodSheet, 'C', ['"storable,consumable,service"'])
    if (cats.length > 0)   applyListValidation(prodSheet, 'D', [`'Danh mục'!$A$2:$A$${1 + cats.length}`])
    if (brands.length > 0) applyListValidation(prodSheet, 'E', [`'Thương hiệu'!$A$2:$A$${1 + brands.length}`])

    // Mã sản phẩm ở sheet SKU cần gộp 2 nguồn: sản phẩm đã có sẵn trong DB ("Sản phẩm
    // hiện có") + sản phẩm đang gõ mới trong chính file này (sheet "Sản phẩm"). Excel
    // data validation chỉ nhận 1 range liên tục, không gộp trực tiếp 2 sheet được, nên
    // tạo 1 sheet ẩn làm cầu nối: mỗi dòng = công thức trỏ về 1 trong 2 nguồn, rồi trỏ
    // dropdown vào sheet ẩn đó — người dùng không thấy sheet này, chỉ thấy dropdown gộp.
    const helperSheet = wb.addWorksheet('MaSP_All')
    existingProducts.forEach((_p: any, i: number) => {
      helperSheet.getCell(`A${i + 1}`).value = { formula: `'Sản phẩm hiện có'!A${i + 2}` } as any
    })
    for (let i = 0; i < LAST_ROW; i++) {
      helperSheet.getCell(`A${existingProducts.length + i + 1}`).value = { formula: `'Sản phẩm'!B${i + 2}` } as any
    }
    helperSheet.state = 'veryHidden'
    const helperRowCount = existingProducts.length + LAST_ROW
    applyListValidation(skuSheet, 'A', [`MaSP_All!$A$1:$A$${helperRowCount}`])

    applyListValidation(skuSheet, 'F', [`'Đơn vị'!$A$2:$A$${1 + unitList.length}`])
    applyListValidation(skuSheet, 'G', ['"VND,USD,EUR,CNY,JPY"'])

    return Buffer.from(await wb.xlsx.writeBuffer())
  }

  // ─── Variant Attribute Values ──────────────────────────────────────────────
  async setVariantAttributeValues(
    variantId: string,
    values: Array<{ attribute_def_id: string; value?: string | null; include_in_sku?: boolean }>,
  ) {
    await this.repo.replaceVariantAttributeValues(variantId, values)
    return this.repo.findVariantAttributeValues(variantId)
  }
}
