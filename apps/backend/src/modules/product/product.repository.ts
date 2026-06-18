import { Knex } from 'knex'
import {
  CreateCategoryBody,
  CreateProductBody,
  UpdateProductBody,
  ListProductQuery,
  CreateVariantBody,
  UpdateVariantBody,
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

  // ─── Products ──────────────────────────────────────────────────────────

  async findAllProducts(query: ListProductQuery) {
    const { category_id, product_type, search, page = 1, limit = 20 } = query
    const offset = (page - 1) * limit

    const base = this.db('products as p')
      .leftJoin('categories as c', 'c.id', 'p.category_id')
      .select('p.*', 'c.name as category_name')
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
      .where('p.id', id)
      .select('p.*', 'c.name as category_name')
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
}
