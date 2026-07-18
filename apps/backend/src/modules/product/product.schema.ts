export const PRODUCT_TYPES = ['storable', 'consumable', 'service', 'bundle'] as const

export const createCategorySchema = {
  body: {
    type: 'object',
    required: ['name'],
    properties: {
      name:       { type: 'string', minLength: 1 },
      // Dùng gợi ý mã sản phẩm: product.code = category.short_code + brand.short_code.
      short_code: { type: 'string', minLength: 1 },
      parent_id:  { type: ['string', 'null'], format: 'uuid' },
    },
  },
}

export const updateCategorySchema = {
  body: {
    type: 'object',
    properties: {
      name:       { type: 'string', minLength: 1 },
      short_code: { type: 'string', minLength: 1 },
      parent_id:  { type: ['string', 'null'], format: 'uuid' },
      is_active:  { type: 'boolean' },
    },
  },
}

export const createBrandSchema = {
  body: {
    type: 'object',
    required: ['name'],
    properties: {
      name:       { type: 'string', minLength: 1 },
      short_code: { type: 'string', minLength: 1 },
    },
  },
}

export const updateBrandSchema = {
  body: {
    type: 'object',
    properties: {
      name:       { type: 'string', minLength: 1 },
      short_code: { type: 'string', minLength: 1 },
      is_active:  { type: 'boolean' },
    },
  },
}

// category_id/brand_id BẮT BUỘC ở đây (ép user phải tạo Category + Brand trước khi tạo
// Product — note.txt: "cần phải tạo category trước khi tạo sản phẩm"). KHÔNG ép NOT NULL
// ở cột DB tương ứng — chỉ enforce ở schema này, để không phá các test fixture cũ đang
// insert thẳng vào DB bỏ qua 2 field này (xem ghi chú ở 001_initial_schema.sql).
export const createProductSchema = {
  body: {
    type: 'object',
    required: ['code', 'name', 'product_type', 'category_id'],
    properties: {
      code:         { type: 'string', minLength: 1 },
      name:         { type: 'string', minLength: 1 },
      name_en:      { type: 'string' },
      brand_id:     { type: 'string', format: 'uuid' },
      model_number: { type: 'string' },
      category_id:  { type: 'string', format: 'uuid' },
      product_type: { type: 'string', enum: PRODUCT_TYPES },
      description:  { type: 'string' },
      image_url:    { type: 'string' },
    },
  },
}

export const updateProductSchema = {
  body: {
    type: 'object',
    properties: {
      code:         { type: 'string', minLength: 1 },
      name:         { type: 'string', minLength: 1 },
      name_en:      { type: 'string' },
      brand_id:     { type: 'string', format: 'uuid' },
      model_number: { type: 'string' },
      category_id:  { type: 'string', format: 'uuid' },
      product_type: { type: 'string', enum: PRODUCT_TYPES },
      description:  { type: 'string' },
      image_url:    { type: 'string' },
      is_active:    { type: 'boolean' },
    },
  },
}

export const listProductSchema = {
  querystring: {
    type: 'object',
    properties: {
      category_id:  { type: 'string', format: 'uuid' },
      product_type: { type: 'string', enum: PRODUCT_TYPES },
      search:       { type: 'string' },
      page:         { type: 'integer', minimum: 1, default: 1 },
      limit:        { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    },
  },
}

export const createVariantSchema = {
  body: {
    type: 'object',
    required: ['item_code', 'name'],
    properties: {
      item_code:       { type: 'string', minLength: 1 },
      name:            { type: 'string', minLength: 1 },
      model:           { type: 'string' },
      part_number:     { type: 'string' },
      unit:            { type: 'string' },
      cost_price:      { type: 'number', minimum: 0 },
      sale_price:      { type: 'number', minimum: 0 },
      currency:        { type: 'string', minLength: 3, maxLength: 3 },
      weight_kg:       { type: 'number', minimum: 0 },
      warranty_months: { type: 'integer', minimum: 0 },
      reorder_point:   { type: 'integer', minimum: 0 },
      image_url:       { type: 'string' },
    },
  },
}

export const updateVariantSchema = {
  body: {
    type: 'object',
    properties: {
      item_code:       { type: 'string', minLength: 1 },
      name:            { type: 'string', minLength: 1 },
      model:           { type: 'string' },
      part_number:     { type: 'string' },
      unit:            { type: 'string' },
      cost_price:      { type: 'number', minimum: 0 },
      sale_price:      { type: 'number', minimum: 0 },
      currency:        { type: 'string', minLength: 3, maxLength: 3 },
      weight_kg:       { type: 'number', minimum: 0 },
      warranty_months: { type: 'integer', minimum: 0 },
      reorder_point:   { type: 'integer', minimum: 0 },
      is_active:       { type: 'boolean' },
      image_url:       { type: 'string' },
    },
  },
}

export const createCustomerPriceSchema = {
  body: {
    type: 'object',
    required: ['company_id', 'price'],
    properties: {
      company_id: { type: 'string', format: 'uuid' },
      price:      { type: 'number', minimum: 0 },
      currency:   { type: 'string', minLength: 3, maxLength: 3 },
      note:       { type: 'string' },
    },
  },
}

export const updateCustomerPriceSchema = {
  body: {
    type: 'object',
    properties: {
      price:    { type: 'number', minimum: 0 },
      currency: { type: 'string', minLength: 3, maxLength: 3 },
      note:     { type: 'string' },
    },
  },
}

export const createVariantSupplierSchema = {
  body: {
    type: 'object',
    required: ['company_id'],
    properties: {
      company_id:     { type: 'string', format: 'uuid' },
      supplier_sku:   { type: 'string' },
      supplier_price: { type: 'number', minimum: 0 },
      lead_time_days: { type: 'integer', minimum: 0 },
      is_preferred:   { type: 'boolean' },
    },
  },
}

export const updateVariantSupplierSchema = {
  body: {
    type: 'object',
    properties: {
      supplier_sku:   { type: 'string' },
      supplier_price: { type: 'number', minimum: 0 },
      lead_time_days: { type: 'integer', minimum: 0 },
      is_preferred:   { type: 'boolean' },
    },
  },
}

// ─── Bundle Items ──────────────────────────────────────────────────────────
// CLAUDE.md mục 4: bundle gồm nhiều sản phẩm con, mỗi dòng = 1 item_variant_id + quantity.
// Không lồng bundle trong bundle — validate ở service (item_variant phải là storable/
// consumable/service, không phải bundle khác).

export const createBundleItemSchema = {
  body: {
    type: 'object',
    required: ['item_variant_id', 'quantity'],
    properties: {
      item_variant_id: { type: 'string', format: 'uuid' },
      quantity:        { type: 'integer', minimum: 1 },
    },
  },
}

export const updateBundleItemSchema = {
  body: {
    type: 'object',
    required: ['quantity'],
    properties: {
      quantity: { type: 'integer', minimum: 1 },
    },
  },
}

export type ProductType = (typeof PRODUCT_TYPES)[number]

export interface CreateCategoryBody {
  name: string
  short_code?: string
  parent_id?: string
}

export interface UpdateCategoryBody extends Partial<CreateCategoryBody> {
  is_active?: boolean
}

export interface CreateBrandBody {
  name: string
  short_code?: string
}

export interface UpdateBrandBody extends Partial<CreateBrandBody> {
  is_active?: boolean
}

export interface CreateProductBody {
  code: string
  name: string
  name_en?: string
  brand_id: string
  model_number?: string
  category_id: string
  product_type: ProductType
  description?: string
  image_url?: string
}

export interface UpdateProductBody extends Partial<CreateProductBody> {
  is_active?: boolean
}

export interface ListProductQuery {
  category_id?: string
  product_type?: ProductType
  search?: string
  page?: number
  limit?: number
}

export interface CreateVariantBody {
  item_code: string
  name: string
  model?: string
  part_number?: string
  unit?: string
  cost_price?: number
  sale_price?: number
  currency?: string
  weight_kg?: number
  warranty_months?: number
  reorder_point?: number
}

export interface UpdateVariantBody extends Partial<CreateVariantBody> {
  is_active?: boolean
}

export interface CreateCustomerPriceBody {
  company_id: string
  price: number
  currency?: string
  note?: string
}

export interface UpdateCustomerPriceBody {
  price?: number
  currency?: string
  note?: string
}

export interface CreateVariantSupplierBody {
  company_id: string
  supplier_sku?: string
  supplier_price?: number
  lead_time_days?: number
  is_preferred?: boolean
}

export interface UpdateVariantSupplierBody {
  supplier_sku?: string
  supplier_price?: number
  lead_time_days?: number
  is_preferred?: boolean
}

export interface CreateBundleItemBody {
  item_variant_id: string
  quantity: number
}

export interface UpdateBundleItemBody {
  quantity: number
}
