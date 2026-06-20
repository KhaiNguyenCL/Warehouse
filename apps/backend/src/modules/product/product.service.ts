import { Knex } from 'knex'
import { ProductRepository } from './product.repository'
import {
  CreateCategoryBody,
  CreateProductBody,
  UpdateProductBody,
  ListProductQuery,
  CreateVariantBody,
  UpdateVariantBody,
  CreateVariantSupplierBody,
  UpdateVariantSupplierBody,
} from './product.schema'

// Postgres SQLSTATE codes — map sang lỗi nghiệp vụ dễ hiểu thay vì để lộ lỗi DB thô ra API.
const PG_UNIQUE_VIOLATION = '23505'
const PG_FOREIGN_KEY_VIOLATION = '23503'

function mapDbError(err: any): never {
  if (err.code === PG_UNIQUE_VIOLATION) {
    throw { statusCode: 409, message: 'Mã hoặc SKU đã tồn tại' }
  }
  if (err.code === PG_FOREIGN_KEY_VIOLATION) {
    throw { statusCode: 400, message: 'Tham chiếu không hợp lệ (category/product/company không tồn tại)' }
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
}
