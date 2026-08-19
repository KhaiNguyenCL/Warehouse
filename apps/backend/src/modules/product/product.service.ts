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

  // ─── Excel Import ─────────────────────────────────────────────────────────

  async importFromExcel(buffer: Buffer, userId?: string) {
    const XLSX = await import('xlsx')
    const wb = XLSX.read(buffer, { type: 'buffer' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

    // Bỏ header (row 0) và các dòng trống
    const dataRows = rows.slice(1).filter((r) => r.some((c) => String(c).trim()))

    const PRODUCT_TYPES_VALID = ['storable', 'consumable', 'service', 'bundle']

    const created_products: string[] = []
    const created_variants: string[] = []
    const skipped: string[] = []
    const errors: { row: number; reason: string }[] = []

    for (let i = 0; i < dataRows.length; i++) {
      const rowNum = i + 2 // 1-indexed, +1 for header
      const [
        productName, productCode, productType,
        categoryCode, brandCode,
        variantName, itemCode, unit,
        salePriceRaw, costPriceRaw, vatRaw, warrantyRaw,
      ] = dataRows[i].map((c: any) => String(c ?? '').trim())

      // Validate bắt buộc
      if (!productName) { errors.push({ row: rowNum, reason: 'Thiếu Tên sản phẩm' }); continue }
      if (!productCode) { errors.push({ row: rowNum, reason: 'Thiếu Mã sản phẩm' }); continue }
      if (!PRODUCT_TYPES_VALID.includes(productType)) {
        errors.push({ row: rowNum, reason: `Loại SP không hợp lệ: "${productType}" — phải là storable/consumable/service/bundle` })
        continue
      }
      if (!variantName) { errors.push({ row: rowNum, reason: 'Thiếu Tên SKU' }); continue }

      try {
        // Lookup category / brand
        const category = categoryCode ? await this.repo.findCategoryByShortCode(categoryCode) : null
        const brand    = brandCode    ? await this.repo.findBrandByShortCode(brandCode)       : null

        if (categoryCode && !category) {
          errors.push({ row: rowNum, reason: `Mã danh mục "${categoryCode}" không tồn tại` }); continue
        }
        if (brandCode && !brand) {
          errors.push({ row: rowNum, reason: `Mã thương hiệu "${brandCode}" không tồn tại` }); continue
        }

        // Find or create product
        let product = await this.repo.findProductByCode(productCode)
        if (!product) {
          product = await this.repo.createProductImport({
            name: productName,
            code: productCode,
            product_type: productType,
            category_id: category?.id,
            brand_id: brand?.id,
            created_by: userId,
          })
          created_products.push(productCode)
        }

        // Check variant by item_code
        if (itemCode) {
          const existingVariant = await this.repo.findVariantByItemCode(itemCode)
          if (existingVariant) {
            skipped.push(itemCode || variantName)
            continue
          }
        }

        const salePrice = salePriceRaw ? Number(String(salePriceRaw).replace(/[,\.]/g, '')) || undefined : undefined
        const costPrice = costPriceRaw ? Number(String(costPriceRaw).replace(/[,\.]/g, '')) || undefined : undefined
        const vatPct    = vatRaw       ? Number(vatRaw) || 0   : 0
        const warranty  = warrantyRaw  ? Number(warrantyRaw)   : 0

        await this.repo.createVariantImport({
          product_id: product.id,
          name: variantName,
          item_code: itemCode || undefined,
          unit: unit || undefined,
          sale_price: salePrice,
          cost_price: costPrice,
          vat_percent: vatPct,
          warranty_months: warranty,
        })
        created_variants.push(itemCode || variantName)
      } catch (err: any) {
        errors.push({ row: rowNum, reason: err?.message ?? 'Lỗi không xác định' })
      }
    }

    return { created_products, created_variants, skipped, errors }
  }

  generateImportTemplate(): Buffer {
    const XLSX = require('xlsx')
    const headers = [
      'Tên sản phẩm *',
      'Mã sản phẩm *',
      'Loại SP * (storable/consumable/service/bundle)',
      'Mã danh mục',
      'Mã thương hiệu',
      'Tên SKU *',
      'Mã hàng (item_code)',
      'Đơn vị',
      'Đơn giá bán',
      'Giá vốn',
      'VAT%',
      'Bảo hành (tháng)',
    ]
    const example = [
      'Switch Cisco SG110',
      'SW-CSC-SG110',
      'storable',
      'SW',
      'CSC',
      'Switch Cisco SG110 8 Port',
      'SW-CSC-SG110-8P',
      'Cái',
      '2500000',
      '2000000',
      '10',
      '12',
    ]
    const ws = XLSX.utils.aoa_to_sheet([headers, example])

    // Độ rộng cột
    ws['!cols'] = [
      { wch: 28 }, { wch: 18 }, { wch: 38 }, { wch: 14 }, { wch: 14 },
      { wch: 30 }, { wch: 20 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 8 }, { wch: 16 },
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Import')
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
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
