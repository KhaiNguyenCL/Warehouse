export const WAREHOUSE_TYPES = ['physical', 'virtual'] as const

export const createWarehouseSchema = {
  body: {
    type: 'object',
    required: ['code', 'name', 'type'],
    properties: {
      code:        { type: 'string', minLength: 1 },
      name:        { type: 'string', minLength: 1 },
      type:        { type: 'string', enum: WAREHOUSE_TYPES },
      address:     { type: 'string' },
      description: { type: 'string' },
      manager_id:  { type: 'string', format: 'uuid' },
    },
  },
}

export const updateWarehouseSchema = {
  body: {
    type: 'object',
    properties: {
      code:        { type: 'string', minLength: 1 },
      name:        { type: 'string', minLength: 1 },
      type:        { type: 'string', enum: WAREHOUSE_TYPES },
      address:     { type: 'string' },
      description: { type: 'string' },
      manager_id:  { type: 'string', format: 'uuid' },
      is_active:   { type: 'boolean' },
      is_default:  { type: 'boolean' },
    },
  },
}

export const listWarehouseSchema = {
  querystring: {
    type: 'object',
    properties: {
      type:      { type: 'string', enum: WAREHOUSE_TYPES },
      is_active: { type: 'boolean' },
      search:    { type: 'string' },
    },
  },
}

export type WarehouseType = (typeof WAREHOUSE_TYPES)[number]

export interface CreateWarehouseBody {
  code: string
  name: string
  type: WarehouseType
  address?: string
  description?: string
  manager_id?: string
}

export interface UpdateWarehouseBody extends Partial<CreateWarehouseBody> {
  is_active?: boolean
  is_default?: boolean
}

export interface ListWarehouseQuery {
  type?: WarehouseType
  is_active?: boolean
  search?: string
}
