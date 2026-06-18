export const PRODUCT_TYPES = ['storable', 'consumable', 'service', 'bundle'] as const

export const createCategorySchema = {
  body: {
    type: 'object',
    required: ['name'],
    properties: {
      name:      { type: 'string', minLength: 1 },
      parent_id: { type: 'string', format: 'uuid' },
    },
  },
}

export const createProductSchema = {
  body: {
    type: 'object',
    required: ['code', 'name', 'product_type'],
    properties: {
      code:         { type: 'string', minLength: 1 },
      name:         { type: 'string', minLength: 1 },
      name_en:      { type: 'string' },
      brand:        { type: 'string' },
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
      brand:        { type: 'string' },
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
    required: ['sku', 'name'],
    properties: {
      sku:             { type: 'string', minLength: 1 },
      name:            { type: 'string', minLength: 1 },
      specifications:  { type: 'object' },
      unit:            { type: 'string' },
      cost_price:      { type: 'number', minimum: 0 },
      sale_price:      { type: 'number', minimum: 0 },
      currency:        { type: 'string', minLength: 3, maxLength: 3 },
      weight_kg:       { type: 'number', minimum: 0 },
      warranty_months: { type: 'integer', minimum: 0 },
      reorder_point:   { type: 'integer', minimum: 0 },
    },
  },
}

export const updateVariantSchema = {
  body: {
    type: 'object',
    properties: {
      sku:             { type: 'string', minLength: 1 },
      name:            { type: 'string', minLength: 1 },
      specifications:  { type: 'object' },
      unit:            { type: 'string' },
      cost_price:      { type: 'number', minimum: 0 },
      sale_price:      { type: 'number', minimum: 0 },
      currency:        { type: 'string', minLength: 3, maxLength: 3 },
      weight_kg:       { type: 'number', minimum: 0 },
      warranty_months: { type: 'integer', minimum: 0 },
      reorder_point:   { type: 'integer', minimum: 0 },
      is_active:       { type: 'boolean' },
    },
  },
}

export type ProductType = (typeof PRODUCT_TYPES)[number]

export interface CreateCategoryBody {
  name: string
  parent_id?: string
}

export interface CreateProductBody {
  code: string
  name: string
  name_en?: string
  brand?: string
  model_number?: string
  category_id?: string
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
  sku: string
  name: string
  specifications?: Record<string, unknown>
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
