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
    if (Number(result?.count ?? 0) > 0) throw { statusCode: 409, message: 'Category đang được dùng bởi sản phẩm, không thể xóa' }
    await this.repo.deleteCategory(id)
  }

  // ─── Brands ────────────────────────────────────────────────────────────

  listBrands() {
    return this.repo.findAllBrands()
  }

  async createBrand(data: CreateBrandBody) {
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
    if (Number(result?.count ?? 0) > 0) throw { statusCode: 409, message: 'Brand đang được dùng bởi sản phẩm, không thể xóa' }
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

  searchVariants(search?: string, productType?: string, limit?: number) {
    return this.repo.searchVariants(search, productType, limit)
  }

  async addVariant(productId: string, data: CreateVariantBody) {
    const product = await this.repo.findProductById(productId)
    if (!product) throw { statusCode: 404, message: 'Product not found' }
    if (product.product_type === 'service') {
      throw { statusCode: 400, message: 'Sản phẩm loại service không có variant' }
    }

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

  // ─── Variant Attribute Values ──────────────────────────────────────────────
  async setVariantAttributeValues(
    variantId: string,
    values: Array<{ attribute_def_id: string; value?: string | null; include_in_sku?: boolean }>,
  ) {
    await this.repo.replaceVariantAttributeValues(variantId, values)
    return this.repo.findVariantAttributeValues(variantId)
  }
}
