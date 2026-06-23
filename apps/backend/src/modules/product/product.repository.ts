import { Knex } from 'knex'
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

export class ProductRepository {
  constructor(private db: Knex) {}

  // ─── Categories ────────────────────────────────────────────────────────

  findAllCategories() {
    return this.db('categories').where('is_active', true).orderBy('name')
  }

  createCategory(data: CreateCategoryBody) {
    return this.db('categories').insert(data).returning('*').then(([row]) => row)
  }

  async updateCategory(id: string, data: UpdateCategoryBody) {
    const [row] = await this.db('categories').where({ id }).update(data).returning('*')
    return row
  }

  // ─── Brands ────────────────────────────────────────────────────────────

  findAllBrands() {
    return this.db('brands').where('is_active', true).orderBy('name')
  }

  createBrand(data: CreateBrandBody) {
    return this.db('brands').insert(data).returning('*').then(([row]) => row)
  }

  async updateBrand(id: string, data: UpdateBrandBody) {
    const [row] = await this.db('brands').where({ id }).update(data).returning('*')
    return row
  }

  // ─── Products ──────────────────────────────────────────────────────────

  async findAllProducts(query: ListProductQuery) {
    const { category_id, product_type, search, page = 1, limit = 20 } = query
    const offset = (page - 1) * limit

    const base = this.db('products as p')
      .leftJoin('categories as c', 'c.id', 'p.category_id')
      .leftJoin('brands as b', 'b.id', 'p.brand_id')
      .select('p.*', 'c.name as category_name', 'b.name as brand_name')
      .where('p.is_active', true)

    if (category_id) base.where('p.category_id', category_id)
    if (product_type) base.where('p.product_type', product_type)
    if (search) {
      base.where((qb) => {
        qb.whereILike('p.name', `%${search}%`).orWhereILike('p.code', `%${search}%`)
      })
    }

    const [rows, countResult] = await Promise.all([
      base.clone().orderBy('p.created_at', 'desc').limit(limit).offset(offset),
      base.clone().clearSelect().count('p.id as count').first(),
    ])

    return { data: rows, total: Number(countResult?.count ?? 0), page, limit }
  }

  async findProductById(id: string) {
    const product = await this.db('products as p')
      .leftJoin('categories as c', 'c.id', 'p.category_id')
      .leftJoin('brands as b', 'b.id', 'p.brand_id')
      .where('p.id', id)
      .select('p.*', 'c.name as category_name', 'c.short_code as category_short_code', 'b.name as brand_name', 'b.short_code as brand_short_code')
      .first()

    if (!product) return null

    const variants = await this.db('variants')
      .where('product_id', id)
      .orderBy('created_at')

    return { ...product, variants }
  }

  createProduct(data: CreateProductBody) {
    return this.db('products').insert(data).returning('*').then(([row]) => row)
  }

  async updateProduct(id: string, data: UpdateProductBody) {
    const [row] = await this.db('products')
      .where({ id })
      .update({ ...data, updated_at: this.db.fn.now() })
      .returning('*')
    return row
  }

  // ─── Variants ──────────────────────────────────────────────────────────

  createVariant(productId: string, data: CreateVariantBody) {
    return this.db('variants')
      .insert({ ...data, product_id: productId })
      .returning('*')
      .then(([row]) => row)
  }

  findVariantById(id: string) {
    return this.db('variants').where({ id }).first()
  }

  async updateVariant(id: string, data: UpdateVariantBody) {
    const [row] = await this.db('variants')
      .where({ id })
      .update({ ...data, updated_at: this.db.fn.now() })
      .returning('*')
    return row
  }

  // ─── Variant Suppliers ─────────────────────────────────────────────────

  findVariantSuppliers(variantId: string) {
    return this.db('variant_suppliers as vs')
      .join('companies as c', 'c.id', 'vs.company_id')
      .where('vs.variant_id', variantId)
      .select('vs.*', 'c.name as company_name', 'c.code as company_code')
      .orderBy('vs.is_preferred', 'desc')
  }

  findVariantSupplierById(id: string) {
    return this.db('variant_suppliers').where({ id }).first()
  }

  // Chỉ 1 supplier được is_preferred=true mỗi variant — giống clearPrimaryContact ở
  // company.repository.ts.
  clearPreferredSupplier(variantId: string, exceptSupplierId: string | null, trx: Knex.Transaction) {
    const q = trx('variant_suppliers').where({ variant_id: variantId }).update({ is_preferred: false })
    if (exceptSupplierId) q.whereNot({ id: exceptSupplierId })
    return q
  }

  async addVariantSupplier(variantId: string, data: CreateVariantSupplierBody, trx: Knex.Transaction) {
    const [row] = await trx('variant_suppliers')
      .insert({ ...data, variant_id: variantId })
      .returning('*')
    return row
  }

  async updateVariantSupplier(id: string, data: UpdateVariantSupplierBody, trx: Knex.Transaction) {
    const [row] = await trx('variant_suppliers').where({ id }).update(data).returning('*')
    return row
  }

  deleteVariantSupplier(id: string) {
    return this.db('variant_suppliers').where({ id }).del()
  }

  // ─── Bundle Items ──────────────────────────────────────────────────────
  // bundle_items.bundle_variant_id = chính variant đang xem (phải product_type='bundle');
  // item_variant_id = SKU con. Join products để service kiểm tra product_type khi validate
  // (không lồng bundle trong bundle — CLAUDE.md mục 4).

  findVariantWithProductType(variantId: string) {
    return this.db('variants as v')
      .join('products as p', 'p.id', 'v.product_id')
      .where('v.id', variantId)
      .select('v.*', 'p.product_type')
      .first()
  }

  findBundleItems(bundleVariantId: string) {
    return this.db('bundle_items as bi')
      .join('variants as v', 'v.id', 'bi.item_variant_id')
      .where('bi.bundle_variant_id', bundleVariantId)
      .select('bi.*', 'v.sku as item_sku', 'v.name as item_name')
      .orderBy('v.sku')
  }

  findBundleItemById(id: string) {
    return this.db('bundle_items').where({ id }).first()
  }

  async addBundleItem(bundleVariantId: string, data: CreateBundleItemBody) {
    const [row] = await this.db('bundle_items')
      .insert({ ...data, bundle_variant_id: bundleVariantId })
      .returning('*')
    return row
  }

  async updateBundleItem(id: string, data: UpdateBundleItemBody) {
    const [row] = await this.db('bundle_items').where({ id }).update(data).returning('*')
    return row
  }

  deleteBundleItem(id: string) {
    return this.db('bundle_items').where({ id }).del()
  }
}
